import { withApi, ApiError } from '@/lib/api/withApi';
import { prisma } from '@/lib/db';
import { extractUser } from '@/lib/auth/jwt';
import { analyzeTranscript } from '@/lib/ai/analyzer';
import { validateAnalysis } from '@/lib/ai/validator';

export const POST = withApi(async (req, context) => {
  extractUser(req);
  const { id } = await context.params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { segments: { orderBy: { timestamp: 'asc' } } },
  });

  if (!meeting) {
    throw new ApiError('Meeting not found', 404);
  }

  if (meeting.segments.length === 0) {
    throw new ApiError('Meeting has no transcript segments to analyze', 400);
  }

  const segments = meeting.segments.map((s) => ({
    speaker: s.speaker,
    timestamp: s.timestamp,
    text: s.text,
  }));

  // Run AI analysis with known speakers
  const rawAnalysis = await analyzeTranscript(segments, meeting.participants);

  // Validate citations against actual transcript timestamps and text
  const validated = validateAnalysis(rawAnalysis, segments, meeting.participants);

  // Save results to database
  const [updatedMeeting, ...createdItems] = await prisma.$transaction([
    prisma.meeting.update({
      where: { id },
      data: {
        summary: validated.summary,
        decisions: validated.decisions.map((d) => `[${d.citationTimestamp}] ${d.description}`),
      },
    }),
    ...validated.actionItems.map((item) => {
      let parsedDate = null;
      if (item.suggestedDueDate && item.suggestedDueDate !== 'null') {
        const d = new Date(item.suggestedDueDate);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }
      
      return prisma.actionItem.create({
        data: {
          meetingId: id,
          description: item.description,
          assignee: item.assignee,
          citationTimestamp: item.citationTimestamp,
          dueDate: parsedDate,
        },
      });
    }),
  ]);

  return {
    data: {
      meeting: updatedMeeting,
      analysis: {
        summary: validated.summary,
        decisions: validated.decisions,
        actionItems: createdItems,
        validation: {
          droppedDecisions: validated.droppedDecisions,
          droppedActionItems: validated.droppedActionItems,
          flaggedForReview: validated.flaggedForReview,
          fuzzyAssigneeResolutions: validated.fuzzyAssigneeResolutions,
        },
      },
    },
  };
});
