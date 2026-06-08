import { withApi, ApiError } from '@/lib/api/withApi';
import { validateBody, parseJsonBody } from '@/lib/api/validate';
import { registerSchema } from '@/lib/schemas';
import { prisma } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth/jwt';

export const POST = withApi(async (req) => {
  const body = await parseJsonBody(req);
  const input = validateBody(registerSchema, body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError('User with this email already exists', 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
  });

  const token = signToken({ userId: user.id, email: user.email });

  return {
    data: {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    },
    status: 201,
  };
});
