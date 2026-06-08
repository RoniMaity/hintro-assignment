import { withApi } from '@/lib/api/withApi';
import { validateBody, parseJsonBody } from '@/lib/api/validate';
import { createActionItemSchema } from '@/lib/schemas';
import { prisma } from '@/lib/db';
import { extractUser } from '@/lib/auth/jwt';

export const POST = withApi(async (req) => {
  extractUser(req);
  const body = await parseJsonBody(req);
  const input = validateBody(createActionItemSchema, body);

  const actionItem = await prisma.actionItem.create({
    data: {
      meetingId: input.meetingId,
      description: input.description,
      assignee: input.assignee,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      citationTimestamp: input.citationTimestamp || null,
    },
  });

  return { data: actionItem, status: 201 };
});

export const GET = withApi(async (req) => {
  extractUser(req);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const meetingId = searchParams.get('meeting_id');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (assignee) where.assignee = { contains: assignee, mode: 'insensitive' };
  if (meetingId) where.meetingId = meetingId;

  const [items, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { meeting: { select: { id: true, title: true } } },
    }),
    prisma.actionItem.count({ where }),
  ]);

  return {
    data: {
      actionItems: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  };
});
