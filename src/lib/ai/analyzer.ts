import OpenAI from 'openai';

export interface AnalysisResult {
  summary: string;
  decisions: Array<{
    description: string;
    citationTimestamp: string;
    confidence: "high" | "medium" | "low";
    citationQuote: string;
  }>;
  actionItems: Array<{
    description: string;
    assignee: string;
    citationTimestamp: string;
    suggestedDueDate?: string;
    confidence: "high" | "medium" | "low";
    citationQuote: string;
  }>;
}

export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

const SYSTEM_PROMPT_STAGE_1 = `You are a Meeting Intelligence Analyst. Your task is to analyze meeting transcripts and extract structured information.

CRITICAL RULES:
1. Every item MUST cite a timestamp where the claim is explicitly stated — not implied.
2. If you cannot find an exact quote supporting an item, SKIP IT entirely.
3. Do NOT infer dates, owners, or decisions from context — only extract what is stated.
4. Assignees must be drawn from the speaker list provided below.
5. If a speaker's name is abbreviated (e.g., "Al" for "Alice Chen"), use the full name from the list.
6. Return an empty array rather than hallucinating items.

GOOD EXAMPLE:
Transcript segment [04:12] — Alice: "Let's lock in the Q3 launch date as September 15th."
→ Decision: { "description": "Q3 launch date set to September 15th", "citationTimestamp": "04:12" } ✅

BAD EXAMPLE (hallucination):
Transcript segment [04:12] — Alice: "We should think about the launch."
→ Decision: { "description": "Launch date confirmed as September 15th", "citationTimestamp": "04:12" } ❌
  Reason: The date was NOT stated. Do not infer — skip this item.

OUTPUT FORMAT: You must respond with ONLY valid JSON matching this exact structure:
{
  "summary": "A concise 2-4 sentence summary of the meeting's key points",
  "decisions": [
    {
      "description": "What was decided",
      "citationTimestamp": "MM:SS"
    }
  ],
  "actionItems": [
    {
      "description": "What needs to be done",
      "assignee": "Person responsible",
      "citationTimestamp": "MM:SS",
      "suggestedDueDate": "YYYY-MM-DD or null"
    }
  ]
}`;

const SYSTEM_PROMPT_STAGE_2 = `You are a Meeting Intelligence Verifier.
For each item extracted below, re-read the provided transcript.
Return ONLY items where the citation clearly supports the claim.
Return a 'confidence' score: "high" | "medium" | "low".
Also provide the "citationQuote", which must be the EXACT phrase from the transcript that supports the item.

OUTPUT FORMAT: Valid JSON matching this structure:
{
  "decisions": [
    {
      "description": "What was decided",
      "citationTimestamp": "MM:SS",
      "confidence": "high",
      "citationQuote": "exact quote from transcript"
    }
  ],
  "actionItems": [
    {
      "description": "What needs to be done",
      "assignee": "Person responsible",
      "citationTimestamp": "MM:SS",
      "suggestedDueDate": "YYYY-MM-DD or null",
      "confidence": "high",
      "citationQuote": "exact quote from transcript"
    }
  ]
}`;

function toSeconds(ts: string): number {
  const parts = ts.split(':').map((p) => p.padStart(2, '0'));
  while (parts.length < 3) parts.unshift('00');
  const [h, m, s] = parts.map(Number);
  return h * 3600 + m * 60 + s;
}

function chunkTranscript(
  segments: TranscriptSegment[],
  windowMinutes = 20,
  overlapMinutes = 2
): TranscriptSegment[][] {
  if (segments.length === 0) return [];
  const chunks: TranscriptSegment[][] = [];
  const windowSec = windowMinutes * 60;
  const overlapSec = overlapMinutes * 60;
  const totalDurationSec = toSeconds(segments[segments.length - 1].timestamp) + 60;

  let chunkStart = Math.max(0, toSeconds(segments[0].timestamp) - 60);

  while (chunkStart < totalDurationSec) {
    const chunkEnd = chunkStart + windowSec;
    const chunkSegments = segments.filter((s) => {
      const sec = toSeconds(s.timestamp);
      return sec >= Math.max(0, chunkStart - overlapSec) && sec < chunkEnd;
    });

    if (chunkSegments.length > 0) {
      chunks.push(chunkSegments);
    }
    chunkStart += windowSec;
    
    if (chunks.length > 50) break; // safety
  }
  return chunks.length > 0 ? chunks : [segments];
}

async function callLLM(prompt: string, systemInstruction: string, temperature: number): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error('No GROK_API_KEY found');
  
  const openai = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });

  const response = await openai.chat.completions.create({
    model: 'grok-2-latest',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ],
    temperature,
    response_format: { type: 'json_object' },
  });

  return response.choices[0].message.content ?? '';
}

async function executeStageWithRetry<T>(
  transcript: string,
  basePrompt: string,
  systemInstruction: string,
  maxAttempts = 3
): Promise<T> {
  let lastError: Error | null = null;
  let prompt = basePrompt;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = await callLLM(prompt, systemInstruction, attempt === 1 ? 0.1 : 0.0);
      const cleaned = raw.replace(/${'`'}${'`'}${'`'}json\n?/g, '').replace(/${'`'}${'`'}${'`'}\n?/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        prompt = `${basePrompt}\n\nPREVIOUS ATTEMPT FAILED: ${(err as Error).message}. Ensure output is valid JSON with no markdown fences or commentary.`;
      }
    }
  }
  throw lastError;
}

export async function analyzeTranscript(
  segments: TranscriptSegment[],
  knownSpeakers: string[]
): Promise<AnalysisResult> {
  if (!process.env.GROK_API_KEY) {
    console.warn('[AI] No GROK_API_KEY found, returning mock analysis');
    return generateMockAnalysis(segments, knownSpeakers);
  }

  const chunks = chunkTranscript(segments, 20, 2);
  let allDecisions: AnalysisResult['decisions'] = [];
  const allActionItems: AnalysisResult['actionItems'] = [];
  const summaries: string[] = [];

  for (const chunk of chunks) {
    const transcriptText = chunk.map((s) => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n');
    
    const stage1Prompt = `KNOWN SPEAKERS: ${JSON.stringify(knownSpeakers)}
Rules:
- Assignees MUST match one of these names exactly (case-insensitive).
- If the transcript uses a nickname, map it to the closest match.
- If you cannot determine the speaker, use "UNASSIGNED".

Analyze the following meeting transcript chunk and extract the summary, decisions, and action items.

TRANSCRIPT:
${transcriptText}`;

    try {
      const stage1Result = await executeStageWithRetry<Partial<AnalysisResult>>(
        transcriptText,
        stage1Prompt,
        SYSTEM_PROMPT_STAGE_1
      );
      
      if (stage1Result.summary) summaries.push(stage1Result.summary);

      if ((stage1Result.decisions?.length || 0) === 0 && (stage1Result.actionItems?.length || 0) === 0) {
        continue;
      }

      const stage2Prompt = `Please verify these extracted items against the transcript chunk.
      
TRANSCRIPT CHUNK:
${transcriptText}

EXTRACTED ITEMS TO VERIFY:
${JSON.stringify({ decisions: stage1Result.decisions || [], actionItems: stage1Result.actionItems || [] }, null, 2)}`;

      const stage2Result = await executeStageWithRetry<Partial<AnalysisResult>>(
        transcriptText,
        stage2Prompt,
        SYSTEM_PROMPT_STAGE_2
      );

      if (stage2Result.decisions) allDecisions.push(...stage2Result.decisions);
      if (stage2Result.actionItems) allActionItems.push(...stage2Result.actionItems);
    } catch (err) {
      console.error('[AI] Analysis failed for a chunk after retries:', err);
      // Track that this chunk failed
      allDecisions.push({ _failed: true } as any);
    }
  }

  // If ALL chunks failed (e.g. rate limit), fallback to mock analysis
  if (allDecisions.some(d => (d as any)._failed) && summaries.length === 0) {
    console.warn('[AI] API Error across chunks, falling back to mock');
    return generateMockAnalysis(segments, knownSpeakers);
  }

  // Filter out our failure markers
  allDecisions = allDecisions.filter(d => !(d as any)._failed);

  return {
    summary: summaries.join('\n\n') || "No summary generated.",
    decisions: allDecisions,
    actionItems: allActionItems,
  };
}

function generateMockAnalysis(
  segments: TranscriptSegment[],
  speakers: string[]
): AnalysisResult {
  const timestamps = segments.map((s) => s.timestamp);

  return {
    summary: `Meeting with ${speakers.length} participants covering ${segments.length} discussion points. (This is a mock analysis — set GROK_API_KEY for real AI analysis.)`,
    decisions: timestamps.length > 1
      ? [
          {
            description: `Initial discussion point established by ${speakers[0] || 'UNASSIGNED'}`,
            citationTimestamp: timestamps[0],
            confidence: 'high',
            citationQuote: segments[0].text,
          },
        ]
      : [],
    actionItems: speakers.length > 0 && timestamps.length > 0
      ? [
          {
            description: `Follow up on discussion point raised at ${timestamps[0]}`,
            assignee: speakers[0],
            citationTimestamp: timestamps[0],
            confidence: 'medium',
            citationQuote: segments[0].text,
          },
        ]
      : [],
  };
}
