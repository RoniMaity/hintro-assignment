# My AI Approach

For the meeting analysis feature, I wanted to make sure the AI actually extracted real things that happened in the meeting instead of just making stuff up. Here is how I approached it:

## 1. Prompt Design
I built a two-stage prompt system using Grok-2 (via the xAI API):
- **Stage 1 (Extraction):** I asked the LLM to read the transcript and extract action items and decisions, but gave it a strict rule that it *must* include the exact timestamp from the transcript where it found the information. I also provided a list of known participants so it wouldn't invent names.
- **Stage 2 (Verification):** This is a safety check. The LLM re-reads the items it just generated against the transcript and scores its own confidence (high/medium/low).

## 2. Hallucination Prevention & Output Validation
To stop the AI from hallucinating, I implemented a strict validation engine in `src/lib/ai/validator.ts`:
- **Timestamp Matching:** Before saving anything to the database, the server takes the timestamps the AI provided and normalizes them (e.g. converting `4:12` to `00:04:12`). It then checks if that exact timestamp actually exists in the original transcript array. If the AI made up a timestamp that isn't in the transcript, the action item is immediately dropped.
- **Fuzzy Name Matching:** Sometimes the AI would assign a task to "Al" instead of "Alice". I used the `fastest-levenshtein` library to calculate the distance between the AI's assignee string and the known participant list. If it's a minor typo, it resolves to the correct name. If it's completely made up, it falls back to "UNASSIGNED".

## 3. Known Limitations
- If the transcript is extremely long (like a 3-hour meeting), we might hit the token limit for Grok. I added a basic chunking concept to split the transcript into smaller chunks if needed, but it could definitely be optimized more with parallel requests.
- The Levenshtein distance matching isn't perfect. If two participants have very similar names (like "John M" and "John N"), the fuzzy matcher might assign it to the wrong John.
