import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Connected. Found ${userCount} users.`);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
