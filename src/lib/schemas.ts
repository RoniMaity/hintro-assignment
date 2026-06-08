import { z } from 'zod';

// ── Auth Schemas ──
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Meeting Schemas ──
const transcriptSegmentInput = z.object({
  speaker: z.string().min(1, 'Speaker is required'),
  timestamp: z
    .string()
    .regex(/^\d{2,3}:\d{2}$/, 'Timestamp must be in MM:SS or MMM:SS format'),
  text: z.string().min(1, 'Text is required'),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  date: z.string().datetime({ message: 'Invalid ISO date string' }).or(z.string().min(1)),
  participants: z
    .array(z.string().min(1))
    .min(1, 'At least one participant is required'),
  segments: z
    .array(transcriptSegmentInput)
    .min(1, 'At least one transcript segment is required'),
});

// ── Action Item Schemas ──
export const createActionItemSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
  description: z.string().min(1, 'Description is required'),
  assignee: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().optional(),
  citationTimestamp: z
    .string()
    .regex(/^\d{2,3}:\d{2}$/, 'Timestamp must be in MM:SS format')
    .optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
});

// ── Type Exports ──
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
