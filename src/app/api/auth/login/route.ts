import { withApi, ApiError } from '@/lib/api/withApi';
import { validateBody, parseJsonBody } from '@/lib/api/validate';
import { loginSchema } from '@/lib/schemas';
import { prisma } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth/jwt';

export const POST = withApi(async (req) => {
  const body = await parseJsonBody(req);
  const input = validateBody(loginSchema, body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new ApiError('Invalid email or password', 401);
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError('Invalid email or password', 401);
  }

  const token = signToken({ userId: user.id, email: user.email });

  return {
    data: {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    },
  };
});
