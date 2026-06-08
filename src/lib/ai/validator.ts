import { AnalysisResult, TranscriptSegment } from './analyzer';
import { distance } from 'fastest-levenshtein';
import { compareTwoStrings } from 'string-similarity';

export interface ValidationResult {
  summary: string;
  decisions: Array<{
    description: string;
    citationTimestamp: string;
    confidence: "high" | "medium" | "low";
  }>;
  actionItems: Array<{
    description: string;
    assignee: string;
    citationTimestamp: string;
    suggestedDueDate?: string;
    confidence: "high" | "medium" | "low";
  }>;
  droppedDecisions: number;
  droppedActionItems: number;
  flaggedForReview: number;
  fuzzyAssigneeResolutions: Array<{
    original: string;
    resolved: string;
    itemDescription: string;
  }>;
}

export function normalizeTimestamp(raw: string): string {
  if (!raw) return '00:00:00';
  const parts = raw.split(':').map((p) => p.padStart(2, '0'));
  while (parts.length < 3) parts.unshift('00');
  return parts.join(':');
}

export function toSeconds(ts: string): number {
  const [h, m, s] = normalizeTimestamp(ts).split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

export function resolveAssignee(
  aiName: string,
  knownSpeakers: string[]
): { resolved: string; confidence: 'exact' | 'fuzzy' | 'unresolved' } {
  if (!aiName) return { resolved: 'UNASSIGNED', confidence: 'unresolved' };
  const lower = aiName.toLowerCase();

  const exact = knownSpeakers.find((s) => s.toLowerCase() === lower);
  if (exact) return { resolved: exact, confidence: 'exact' };

  const scored = knownSpeakers.map((s) => ({
    name: s,
    dist: distance(lower, s.toLowerCase()),
  }));
  scored.sort((a, b) => a.dist - b.dist);
  
  if (scored.length > 0 && scored[0].dist <= 3) {
    if (scored.length === 1 || scored[0].dist < scored[1].dist - 1) {
      return { resolved: scored[0].name, confidence: 'fuzzy' };
    }
  }

  return { resolved: 'UNASSIGNED', confidence: 'unresolved' };
}

function findValidTimestamp(
  citationTs: string,
  segments: TranscriptSegment[]
): string | null {
  const normalizedCitation = normalizeTimestamp(citationTs);
  
  // Exact normalized match
  for (const s of segments) {
    if (normalizeTimestamp(s.timestamp) === normalizedCitation) {
      return s.timestamp; // Return the exact string found in the database
    }
  }

  // Nearest-segment fallback (±3 seconds)
  const citationSec = toSeconds(citationTs);
  for (const s of segments) {
    if (Math.abs(toSeconds(s.timestamp) - citationSec) <= 3) {
      return s.timestamp;
    }
  }
  return null;
}

export function validateAnalysis(
  analysis: AnalysisResult,
  segments: TranscriptSegment[],
  knownSpeakers: string[]
): ValidationResult {
  let droppedDecisions = 0;
  let droppedActionItems = 0;
  let flaggedForReview = 0;
  const fuzzyAssigneeResolutions: ValidationResult['fuzzyAssigneeResolutions'] = [];

  const segmentTextByTs = new Map(segments.map((s) => [s.timestamp, s.text]));

  const validDecisions: ValidationResult['decisions'] = [];
  const validActionItems: ValidationResult['actionItems'] = [];

  // Decisions
  for (const d of analysis.decisions) {
    if (!d.citationTimestamp) {
      droppedDecisions++; continue;
    }
    const resolvedTs = findValidTimestamp(d.citationTimestamp, segments);
    if (!resolvedTs) {
      droppedDecisions++; continue;
    }

    const actualText = segmentTextByTs.get(resolvedTs) || '';
    const quoteSim = compareTwoStrings(d.citationQuote || '', actualText);
    
    // Drop if confidence is low AND quote doesn't match well
    if (quoteSim < 0.5 && d.confidence === 'low') {
      droppedDecisions++; continue; 
    }

    if (d.confidence === 'low') {
      flaggedForReview++;
    } else if (d.confidence === 'medium' || quoteSim < 0.7) {
      flaggedForReview++;
    }

    validDecisions.push({
      description: d.description,
      citationTimestamp: resolvedTs,
      confidence: d.confidence || 'medium',
    });
  }

  // Action Items
  for (const item of analysis.actionItems) {
    if (!item.citationTimestamp) {
      droppedActionItems++; continue;
    }
    const resolvedTs = findValidTimestamp(item.citationTimestamp, segments);
    if (!resolvedTs) {
      droppedActionItems++; continue;
    }

    const actualText = segmentTextByTs.get(resolvedTs) || '';
    const quoteSim = compareTwoStrings(item.citationQuote || '', actualText);
    
    if (quoteSim < 0.5 && item.confidence === 'low') {
      droppedActionItems++; continue;
    }

    const assigneeRes = resolveAssignee(item.assignee, knownSpeakers);
    if (assigneeRes.confidence === 'unresolved' && item.confidence === 'low') {
      droppedActionItems++; continue;
    }
    
    if (assigneeRes.confidence === 'fuzzy') {
      fuzzyAssigneeResolutions.push({
        original: item.assignee,
        resolved: assigneeRes.resolved,
        itemDescription: item.description,
      });
      flaggedForReview++;
    }

    if (item.confidence === 'low' || item.confidence === 'medium' || quoteSim < 0.7) {
      flaggedForReview++;
    }

    validActionItems.push({
      description: item.description,
      assignee: assigneeRes.resolved,
      citationTimestamp: resolvedTs,
      suggestedDueDate: item.suggestedDueDate,
      confidence: item.confidence || 'medium',
    });
  }

  return {
    summary: analysis.summary,
    decisions: validDecisions,
    actionItems: validActionItems,
    droppedDecisions,
    droppedActionItems,
    flaggedForReview,
    fuzzyAssigneeResolutions,
  };
}
