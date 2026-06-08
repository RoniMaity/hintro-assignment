import { prisma } from '@/lib/db';

export async function checkOverdueAndNotify(): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL;
  const channel = process.env.WEBHOOK_CHANNEL || 'slack';

  console.log(`[Scheduler] Running overdue action item check at ${new Date().toISOString()}`);

  try {
    const overdueItems = await prisma.actionItem.findMany({
      where: {
        status: { not: 'COMPLETED' },
        dueDate: { lt: new Date() },
      },
      include: {
        meeting: { select: { title: true } },
        notifications: {
          orderBy: { firedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (overdueItems.length === 0) {
      console.log('[Scheduler] No overdue action items found');
      return;
    }

    // Filter items that haven't been notified in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const itemsToNotify = overdueItems.filter((item) => {
      const lastNotification = item.notifications[0];
      return !lastNotification || lastNotification.firedAt < oneHourAgo;
    });

    if (itemsToNotify.length === 0) {
      console.log('[Scheduler] All overdue items already notified recently');
      return;
    }

    console.log(`[Scheduler] Found ${itemsToNotify.length} overdue items to notify`);

    for (const item of itemsToNotify) {
      const dueDate = item.dueDate ? item.dueDate.toISOString().split('T')[0] : 'N/A';

      if (webhookUrl) {
        const payload = {
          text: `⚠️ *Overdue Action Item Alert*`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚠️ Overdue Action Item',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Task:* ${item.description}\n*Meeting:* ${item.meeting.title}`
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Assignee:*\n@${item.assignee}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Status:*\n${item.status}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Due Date:*\n${dueDate}`
                }
              ]
            }
          ]
        };

        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          await prisma.notificationLog.create({
            data: {
              actionItemId: item.id,
              channel,
              status: response.ok ? 'SUCCESS' : 'FAILED',
              errorMessage: response.ok ? null : `HTTP ${response.status}`,
            },
          });

          console.log(
            `[Scheduler] Notification ${response.ok ? 'sent' : 'failed'} for item ${item.id}`
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          await prisma.notificationLog.create({
            data: {
              actionItemId: item.id,
              channel,
              status: 'FAILED',
              errorMessage: errorMsg,
            },
          });
          console.error(`[Scheduler] Webhook error for item ${item.id}:`, errorMsg);
        }
      } else {
        // Log without actual webhook when URL not configured
        console.log(
          `[Scheduler] Would notify: "${item.description}" assigned to ${item.assignee} (due: ${dueDate})`
        );
        await prisma.notificationLog.create({
          data: {
            actionItemId: item.id,
            channel: 'console',
            status: 'SUCCESS',
            errorMessage: null,
          },
        });
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error during overdue check:', error);
  }
}
