import { withApi } from '@/lib/api/withApi';
import { prisma } from '@/lib/db';
import { extractUser } from '@/lib/auth/jwt';

export const GET = withApi(async (req) => {
  extractUser(req);

  const overdueItems = await prisma.actionItem.findMany({
    where: {
      status: { not: 'COMPLETED' },
      dueDate: { lt: new Date() },
    },
    orderBy: { dueDate: 'asc' },
    include: {
      meeting: { select: { id: true, title: true } },
    },
  });

  return { data: { actionItems: overdueItems, count: overdueItems.length } };
});
