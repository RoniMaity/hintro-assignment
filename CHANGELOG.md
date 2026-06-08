# Changelog

## [1.0.0] - Initial Submission

### Features Built
- **Auth System:** Built a custom JWT registration and login flow.
- **Meeting APIs:** Created CRUD routes to manage meetings and store their transcript segments.
- **AI Integration:** Plugged in the Grok-2 API to analyze the meetings and extract decisions and action items.
- **Hallucination Guards:** Wrote a custom validator (using Levenshtein distance) to drop AI outputs that couldn't be strictly mapped back to actual transcript timestamps.
- **Action Item Tracker:** Added endpoints to update action item statuses (Pending, In Progress, Completed).
- **Slack Reminders:** Wrote a `node-cron` script that wakes up every 15 minutes, checks Postgres for overdue items, and fires a formatted Slack Webhook alert.
- **API Wrapper:** Built a global `withApi` wrapper so all endpoints return the exact same `{ success, traceId, data, error }` JSON structure requested in the prompt.
- **Swagger Docs:** Used `swagger-ui-react` to automatically render an interactive API documentation page at `/api-docs`.
- **Vitest Setup:** Wrote unit tests to prove the AI validation logic works.
