import { describe, it, expect } from 'vitest';
import { normalizeTimestamp, resolveAssignee, validateAnalysis } from './validator';

describe('Validator Utils', () => {
  describe('normalizeTimestamp', () => {
    it('should pad single digits', () => {
      expect(normalizeTimestamp('1:20')).toBe('00:01:20');
      expect(normalizeTimestamp('0:05')).toBe('00:00:05');
    });

    it('should add hours if missing', () => {
      expect(normalizeTimestamp('45:30')).toBe('00:45:30');
    });

    it('should handle already padded values', () => {
      expect(normalizeTimestamp('00:15:20')).toBe('00:15:20');
    });
  });

  describe('resolveAssignee', () => {
    const knownSpeakers = ['Alice', 'Bob', 'Charlie'];

    it('should resolve exact matches', () => {
      const res = resolveAssignee('Alice', knownSpeakers);
      expect(res.resolved).toBe('Alice');
      expect(res.confidence).toBe('exact');
    });

    it('should fuzzy match case and minor typos', () => {
      const res = resolveAssignee('bob', knownSpeakers);
      expect(res.resolved).toBe('Bob');
      expect(res.confidence).toBe('exact'); // Case insensitive is considered exact

      const res2 = resolveAssignee('Alcie', knownSpeakers);
      expect(res2.resolved).toBe('Alice');
      expect(res2.confidence).toBe('fuzzy');
    });

    it('should fall back to UNASSIGNED for unknown names', () => {
      const res = resolveAssignee('David', knownSpeakers);
      expect(res.resolved).toBe('UNASSIGNED');
      expect(res.confidence).toBe('unresolved');
    });
  });
});

describe('validateAnalysis', () => {
  const segments = [
    { speaker: 'Alice', timestamp: '00:00:00', text: 'Let us launch on Friday.' },
    { speaker: 'Bob', timestamp: '00:00:05', text: 'I will prepare the slides.' },
  ];
  const participants = ['Alice', 'Bob'];

  it('should validate exact match quotes and exact assignees', () => {
    const mockAnalysis = {
      summary: 'Team sync',
      decisions: [
        {
          description: 'Launch on Friday',
          citationTimestamp: '00:00',
          citationQuote: 'Let us launch on Friday.'
        }
      ],
      actionItems: [
        {
          description: 'Prepare slides',
          assignee: 'Bob',
          citationTimestamp: '00:05',
          citationQuote: 'I will prepare the slides.'
        }
      ]
    };

    const res = validateAnalysis(mockAnalysis, segments, participants);
    expect(res.decisions.length).toBe(1);
    expect(res.actionItems.length).toBe(1);
    expect(res.flaggedForReview).toBe(0);
    expect(res.droppedDecisions).toBe(0);
  });

  it('should drop hallucinations without valid timestamps', () => {
    const mockAnalysis = {
      summary: 'Team sync',
      decisions: [
        {
          description: 'Invented decision',
          citationTimestamp: '99:99',
          citationQuote: 'This text does not exist'
        }
      ],
      actionItems: []
    };

    const res = validateAnalysis(mockAnalysis, segments, participants);
    expect(res.decisions.length).toBe(0);
    expect(res.droppedDecisions).toBe(1);
  });
});
