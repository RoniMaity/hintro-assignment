# Hintro Meeting Intelligence API

Hey! This is my submission for the Hintro Backend/Fullstack Engineering Internship Assignment. 

It's an AI-powered meeting intelligence API that takes meeting transcripts, feeds them to Grok-2 (via xAI), and extracts actionable insights and tasks. The coolest part is that it forces the AI to provide exact timestamps for every claim it makes, and the server validates those timestamps to completely eliminate AI hallucinations.

## Quick Setup

If you want to run this locally to test it out, here's how:

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   Create a `.env` file in the root folder. You'll need these variables:
   ```env
   # Database (I used Prisma Postgres)
   DATABASE_URL="postgresql://username:password@localhost:5432/hintro"

   # Security
   JWT_SECRET="super_secret_key"

   # AI Integration
   GROK_API_KEY="your_xai_grok_api_key"

   # Slack Webhook for Overdue Reminders
   WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK"
   WEBHOOK_CHANNEL="slack"
   CRON_SCHEDULE="*/15 * * * *"

   # Evaluation Endpoint Links
   GITHUB_REPO_URL="https://github.com/yourusername/hintro-assignment"
   DEPLOYMENT_URL="http://localhost:3000"
   ```

3. **Database Migration**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the App!**
   ```bash
   npm run dev
   ```

The app will start on `http://localhost:3000`. 
- **Frontend Dashboard:** Navigate to `/`
- **Swagger Documentation:** Navigate to `/api-docs`

## Running the Tests
I wrote unit tests using Vitest to prove that the AI hallucination guardrails (timestamp padding and fuzzy assignee matching) work correctly.
```bash
npm run test
```

## Vercel Deployment Note
If you're deploying this to Vercel, just remember that Vercel is a serverless environment, meaning the `node-cron` background job won't stay alive forever in the background. For a real production Vercel app, I would migrate the cron job to a Vercel Cron (`vercel.json`) that pings an API endpoint every 15 minutes!
