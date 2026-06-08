import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/evaluation:
 *   get:
 *     summary: Get evaluation details
 *     description: Returns the required evaluation schema
 *     responses:
 *       200:
 *         description: Evaluation details
 */
export async function GET() {
  return NextResponse.json({
    candidateName: 'Hintro Engineering Candidate',
    email: 'candidate@hintro.com',
    repositoryUrl: process.env.GITHUB_REPO_URL || 'https://github.com/candidate/meeting-intelligence',
    deployedUrl: process.env.DEPLOYMENT_URL || 'http://localhost:3000',
    externalIntegration: 'Discord Webhook',
    features: [
      'Authentication',
      'AI Analysis',
      'Reminder Scheduler'
    ],
  });
}
