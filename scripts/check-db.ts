import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = {
    organisations: await prisma.organisation.count(),
    users: await prisma.user.count(),
    workshops: await prisma.workshop.count(),
    templates: await prisma.labTemplate.count(),
    challenges: await prisma.challenge.count(),
    challengeTasks: await prisma.challengeTask.count(),
    registrations: await prisma.workshopRegistration.count(),
    achievements: await prisma.achievement.count(),
  };

  console.log('--- Live Neon Database Status ---');
  console.table(counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
