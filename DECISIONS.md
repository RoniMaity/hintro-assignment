# Technical Decisions

Here's a breakdown of the main tools and architecture I decided to use for this assignment:

### Database: Prisma with PostgreSQL
I chose Prisma because I really like how it gives you full TypeScript autocomplete. It makes it way harder to write bad database queries compared to raw SQL. For the actual database, I went with PostgreSQL because the relationship between Meetings, Transcripts, and Action Items is super relational, so a NoSQL database like MongoDB would have been a headache for joining that data later.

### Authentication: Custom JWT
Instead of using a heavy library like NextAuth.js, I built a simple JWT implementation from scratch. NextAuth is great, but it felt like overkill for a simple username/password flow, and building it from scratch shows I understand how stateless token authentication actually works under the hood.

### AI Integration: Gemini 2.0 Flash
I decided to use Google's Gemini Flash model instead of OpenAI's GPT-4. The main reason is that it's insanely fast and has a huge context window, which is perfect for dumping long meeting transcripts into the prompt without having to do complex vector embeddings or RAG setups.

### External Integration: Slack Webhook
For the third-party integration, I set up a Slack Webhook using Slack's Block Kit format. It's triggered by the cron scheduler whenever an action item is overdue. I chose this because setting up OAuth for Google Calendar or Email can get really complicated with domain verifications, but a Slack webhook perfectly proves that the backend can push real-time notifications to external systems cleanly.

### Background Jobs: node-cron
To handle the overdue reminders, I used `node-cron` to check the database every 15 minutes. It's super simple and runs natively in the Node process, which was perfect for getting something up and running quickly for this assignment without needing to configure an external queue like Redis/BullMQ.
