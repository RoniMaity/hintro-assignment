import { withApi, ApiError } from '@/lib/api/withApi';
import { prisma } from '@/lib/db';
import { extractUser } from '@/lib/auth/jwt';

export const GET = withApi(async (req, context) => {
  extractUser(req);
  const { id } = await context.params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      segments: { orderBy: { timestamp: 'asc' } },
      actionItems: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { notifications: true } } },
      },
    },
  });

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  return { data: meeting };
});
