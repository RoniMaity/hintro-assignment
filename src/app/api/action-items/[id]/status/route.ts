import { withApi, ApiError } from '@/lib/api/withApi';
import { validateBody, parseJsonBody } from '@/lib/api/validate';
import { updateStatusSchema } from '@/lib/schemas';
import { prisma } from '@/lib/db';
import { extractUser } from '@/lib/auth/jwt';

export const PATCH = withApi(async (req, context) => {
  extractUser(req);
  const { id } = await context.params;
  const body = await parseJsonBody(req);
  const input = validateBody(updateStatusSchema, body);

  const existing = await prisma.actionItem.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError('Action item not found', 404);
  }

  const updated = await prisma.actionItem.update({
    where: { id },
    data: { status: input.status },
    include: { meeting: { select: { id: true, title: true } } },
  });

  return { data: updated };
});
