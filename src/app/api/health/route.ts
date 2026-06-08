import { withApi } from '@/lib/api/withApi';

export const GET = withApi(async () => {
  return { data: { status: 'UP', timestamp: new Date().toISOString() } };
});
