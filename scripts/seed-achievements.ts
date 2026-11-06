import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding and updating achievements...');

  await prisma.achievement.updateMany({
    where: { id: '30000000-0000-0000-0000-000000000001' },
    data: { slug: 'shell-master', criteria: { type: 'CHALLENGES_SOLVED_NO_HINTS', threshold: 10, domain: 'DevOps' } }
  });
  await prisma.achievement.updateMany({
    where: { id: '30000000-0000-0000-0000-000000000002' },
    data: { slug: 'container-pilot', criteria: { type: 'PROBES_PASSED', threshold: 1, domain: 'Cloud' } }
  });
  await prisma.achievement.updateMany({
    where: { id: '30000000-0000-0000-0000-000000000003' },
    data: { slug: 'speed-demon', criteria: { type: 'FAST_EVALUATION', timeLimitSec: 180 } }
  });
  await prisma.achievement.updateMany({
    where: { id: '30000000-0000-0000-0000-000000000004' },
    data: { slug: 'vulnerability-slayer', criteria: { type: 'FIRST_TRY_SECURITY', domain: 'Security' } }
  });

  const standardAchievements = [
    {
      slug: 'first-workshop',
      name: 'First Steps',
      description: 'Attended your first GDG technical workshop',
      icon: 'Award',
      category: 'Community',
      points: 50,
      criteria: { type: 'WORKSHOPS_ATTENDED', threshold: 1 }
    },
    {
      slug: 'first-lab',
      name: 'Lab Explorer',
      description: 'Launched and completed your first hands-on cloud lab session',
      icon: 'Terminal',
      category: 'Cloud',
      points: 75,
      criteria: { type: 'LABS_COMPLETED', threshold: 1 }
    },
    {
      slug: 'first-challenge',
      name: 'Problem Solver',
      description: 'Successfully completed your first technical challenge evaluation',
      icon: 'CheckCircle',
      category: 'General',
      points: 50,
      criteria: { type: 'CHALLENGES_PASSED', threshold: 1 }
    },
    {
      slug: 'quick-learner',
      name: 'Quick Learner',
      description: 'Solved a challenge on your very first attempt without using any hints',
      icon: 'Zap',
      category: 'General',
      points: 100,
      criteria: { type: 'FIRST_ATTEMPT_NO_HINTS', threshold: 1 }
    },
    {
      slug: 'lab-master',
      name: 'Lab Master',
      description: 'Achieved 100% completion and perfect score across all challenges in a lab',
      icon: 'Trophy',
      category: 'General',
      points: 150,
      criteria: { type: 'PERFECT_LAB_COMPLETION', threshold: 1 }
    },
    {
      slug: 'domain-explorer',
      name: 'Domain Explorer',
      description: 'Completed challenges across 3 or more distinct technical domains',
      icon: 'Compass',
      category: 'General',
      points: 200,
      criteria: { type: 'DISTINCT_DOMAINS_COMPLETED', threshold: 3 }
    }
  ];

  for (const ach of standardAchievements) {
    const existing = await prisma.achievement.findFirst({ where: { slug: ach.slug } });
    if (!existing) {
      await prisma.achievement.create({ data: ach });
      console.log(`Created achievement: ${ach.slug}`);
    } else {
      await prisma.achievement.update({ where: { id: existing.id }, data: ach });
      console.log(`Updated achievement: ${ach.slug}`);
    }
  }

  const all = await prisma.achievement.findMany();
  console.log(`Total achievements in catalog: ${all.length}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
