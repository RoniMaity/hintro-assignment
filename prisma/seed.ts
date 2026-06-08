import { prisma } from '../src/lib/db';

async function main() {
  console.log('Seeding database...');
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@hintro.com' },
    update: {},
    create: {
      email: 'admin@hintro.com',
      name: 'Admin',
      passwordHash: 'dummy_hash',
    },
  });

  console.log('Created user:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
