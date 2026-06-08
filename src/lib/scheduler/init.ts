import cron from 'node-cron';
import { checkOverdueAndNotify } from './cron';

const globalForScheduler = globalThis as unknown as {
  schedulerInitialized: boolean;
};

export function initScheduler(): void {
  if (globalForScheduler.schedulerInitialized) return;
  globalForScheduler.schedulerInitialized = true;

  const schedule = process.env.CRON_SCHEDULE || '*/15 * * * *'; // Every 15 minutes

  console.log(`[Scheduler] Initializing cron job with schedule: ${schedule}`);

  cron.schedule(schedule, async () => {
    await checkOverdueAndNotify();
  });

  console.log('[Scheduler] Cron job registered successfully');
}
