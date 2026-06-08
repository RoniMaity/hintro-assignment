import { withApi } from '@/lib/api/withApi';
import { validateBody, parseJsonBody } from '@/lib/api/validate';
import { createMeetingSchema } from '@/lib/schemas';
import { prisma } from '@/lib/db';
import { extractUser } from '@/lib/auth/jwt';

export const POST = withApi(async (req) => {
  extractUser(req);
  const body = await parseJsonBody(req);
  const input = validateBody(createMeetingSchema, body);

  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      date: new Date(input.date),
      participants: input.participants,
      segments: {
        create: input.segments.map((seg) => ({
          speaker: seg.speaker,
          timestamp: seg.timestamp,
          text: seg.text,
        })),
      },
    },
    include: {
      segments: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  return { data: meeting, status: 201 };
});

export const GET = withApi(async (req) => {
  extractUser(req);
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const skip = (page - 1) * limit;

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { segments: true, actionItems: true } },
      },
    }),
    prisma.meeting.count(),
  ]);

  return {
    data: {
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
});
