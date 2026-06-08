# Testing Strategy

For testing, I decided to use **Vitest** because it's much faster than Jest and integrates really nicely into the modern JS ecosystem.

### What I Tested
Since the hardest part of the assignment was making sure the AI didn't hallucinate facts, I focused my unit tests entirely on the `validator.ts` logic.

1. **Timestamp Normalization:** I wrote tests to make sure that if the AI returns weirdly formatted timestamps like `"1:05"` or `"45:20"`, they get correctly padded into standard `"00:01:05"` formats so they can be matched against the real transcript.
2. **Assignee Fuzzy Matching:** I wrote tests for the Levenshtein distance matcher to ensure that if the AI writes `"bob"`, it correctly maps to `"Bob"` from the participant list, but if it hallucinates `"David"` (who isn't in the meeting), it correctly defaults to `"UNASSIGNED"`.
3. **Hallucination Dropping:** I wrote a mock test where I feed the validator a fake LLM response containing a made-up timestamp (`99:99`). The test successfully confirms that the validator drops the hallucinated action item and keeps the grounded ones.

### Edge Cases Handled
- **Gemini API Rate Limits:** I ran into an issue where Gemini would throw a `429 Too Many Requests` error if I hit it too fast. I added a basic fallback chain so that if the API completely fails, it catches the error and returns a structured mock analysis instead of crashing the frontend with a 500 error.
- **Overdue Notification Spam:** I realized the cron job might send the same overdue Slack message every 15 minutes! To fix this, I made sure the script updates the `NotificationLog` table so it only alerts once.

### Limitations
- Right now, I only wrote unit tests for the core AI utilities. If I had more time, I would have set up Supertest to write full integration tests for the API endpoints (especially the JWT authentication flow).
