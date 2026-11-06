import { PrismaClient, Role, OrganisationRole, Difficulty, EvaluationType, WorkshopStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed]: Starting idempotent GDG LabOps database seeding...');

  // 1. Seed Development Organisation
  const organisation = await prisma.organisation.upsert({
    where: { slug: 'gdg-silicon-valley' },
    update: {},
    create: {
      name: 'GDG on Campus - Silicon Valley University',
      slug: 'gdg-silicon-valley',
      description: 'Official Google Developer Group on Campus chapter organizing hands-on cloud and dev workshops.',
      logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
    },
  });
  console.log(`[Seed]: Organisation verified -> "${organisation.name}" (${organisation.id})`);

  // 2. Seed Sample Organiser
  const organiserPasswordHash = await bcrypt.hash('Organiser@Pass2026!', 12);
  const organiser = await prisma.user.upsert({
    where: { email: 'alex.rivera@gdgcampus.dev' },
    update: { passwordHash: organiserPasswordHash },
    create: {
      name: 'Alex Rivera',
      email: 'alex.rivera@gdgcampus.dev',
      passwordHash: organiserPasswordHash,
      role: Role.ORGANISER,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  // Assign Organiser to Organisation
  await prisma.organisationMembership.upsert({
    where: {
      unique_organisation_user: {
        organisationId: organisation.id,
        userId: organiser.id,
      },
    },
    update: {},
    create: {
      organisationId: organisation.id,
      userId: organiser.id,
      role: OrganisationRole.ADMIN,
    },
  });
  console.log(`[Seed]: Organiser verified -> "${organiser.name}"`);

  // 3. Seed Sample Students
  const studentsData = [
    { name: 'Elena Rostova', email: 'elena.rostova@university.edu', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
    { name: 'Marcus Chen', email: 'marcus.chen@student.tech.edu', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
    { name: 'Aisha Al-Mansoor', email: 'aisha.m@university.edu', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' },
  ];

  const studentPasswordHash = await bcrypt.hash('Student@Pass2026!', 12);
  const students = [];
  for (const s of studentsData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash: studentPasswordHash },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: studentPasswordHash,
        avatar: s.avatar,
        role: Role.STUDENT,
      },
    });

    await prisma.organisationMembership.upsert({
      where: {
        unique_organisation_user: {
          organisationId: organisation.id,
          userId: student.id,
        },
      },
      update: {},
      create: {
        organisationId: organisation.id,
        userId: student.id,
        role: OrganisationRole.MEMBER,
      },
    });

    students.push(student);
  }
  console.log(`[Seed]: Seeded ${students.length} students`);

  // 4. Seed 3 Lab Templates
  const template1 = await prisma.labTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      organisationId: organisation.id,
      createdBy: organiser.id,
      name: 'Linux Fundamentals & Shell Hardening',
      description: 'Master core POSIX permissions, user isolation, systemd management, and security auditing in a minimal Alpine Linux container.',
      domain: 'DevOps',
      difficulty: Difficulty.BEGINNER,
      estimatedDuration: 90,
      environmentType: 'terminal',
      learningObjectives: [
        'Understand UNIX file permission bits (octal & symbolic)',
        'Inspect running processes and manage POSIX signals',
        'Audit open sockets and configure iptables rules',
      ],
      prerequisites: ['Basic command line familiarity', 'Understanding of filesystems'],
    },
  });

  const template2 = await prisma.labTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organisationId: organisation.id,
      createdBy: organiser.id,
      name: 'Web Application Vulnerability & Penetration Testing',
      description: 'Hands-on offensive and defensive cybersecurity lab analyzing SQL injections, IDOR, SSRF, and JWT forgery in a sandboxed target.',
      domain: 'Cybersecurity',
      difficulty: Difficulty.INTERMEDIATE,
      estimatedDuration: 105,
      environmentType: 'terminal',
      learningObjectives: [
        'Intercept and analyze HTTP headers via CLI',
        'Detect and remediate SQL Injection vulnerabilities',
        'Patch insecure direct object reference patterns',
      ],
      prerequisites: ['Basic HTTP protocol knowledge'],
    },
  });

  const template3 = await prisma.labTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      organisationId: organisation.id,
      createdBy: organiser.id,
      name: 'Containerization & Kubernetes Microservices',
      description: 'Build multi-stage Dockerfiles, configure custom ingress controllers, and debug distributed service mesh routing.',
      domain: 'Cloud Computing',
      difficulty: Difficulty.INTERMEDIATE,
      estimatedDuration: 120,
      environmentType: 'terminal',
      learningObjectives: [
        'Deploy Pods, Deployments, and ClusterIP Services in k3s',
        'Configure ConfigMaps, Secrets, and PersistentVolumeClaims',
      ],
      prerequisites: ['Docker CLI basics'],
    },
  });
  console.log('[Seed]: 3 Lab Templates verified');

  // 5. Seed Challenges & Predefined Tasks for Template 1
  const challenge1 = await prisma.challenge.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      labTemplateId: template1.id,
      title: 'Challenge 1: Linux Permissions & Access Control Audit',
      description: 'An unprivileged application user developer cannot read /etc/labops/config.json due to restrictive group permissions.',
      instructions: '1. Inspect permissions using ls -la\n2. Grant read rights to group gdg-lab\n3. Click Evaluate Task',
      difficulty: Difficulty.BEGINNER,
      points: 100,
      displayOrder: 1,
      evaluationType: EvaluationType.COMMAND_EXIT_CODE,
    },
  });

  await prisma.challengeTask.upsert({
    where: { id: '20000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000001',
      challengeId: challenge1.id,
      title: 'Verify File Group Ownership and Octal Permissions',
      description: 'Checks that /etc/labops/config.json belongs to group gdg-lab with permission 640',
      taskType: 'FILE_CHECK',
      evaluationConfig: {
        ruleType: 'FILE_PERMISSIONS',
        targetPath: '/etc/labops/config.json',
        expectedGroup: 'gdg-lab',
        expectedOctalPermissions: '640',
      },
      points: 100,
      displayOrder: 1,
    },
  });

  const challenge2 = await prisma.challenge.upsert({
    where: { id: '10000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000002',
      labTemplateId: template1.id,
      title: 'Challenge 2: Process Telemetry & Zombie Hunting',
      description: 'A rogue background process is consuming resources. Locate its PID and send SIGTERM.',
      instructions: '1. Locate rogue_daemon using ps aux\n2. Send graceful termination signal\n3. Verify defunct processes have been cleared',
      difficulty: Difficulty.INTERMEDIATE,
      points: 150,
      displayOrder: 2,
      evaluationType: EvaluationType.STDOUT_REGEX,
    },
  });

  await prisma.challengeTask.upsert({
    where: { id: '20000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '20000000-0000-0000-0000-000000000002',
      challengeId: challenge2.id,
      title: 'Verify Process Termination',
      description: 'Ensures rogue_daemon is no longer active in the process table',
      taskType: 'PROCESS_CHECK',
      evaluationConfig: {
        ruleType: 'PROCESS_STATUS',
        processName: 'rogue_daemon',
      },
      points: 150,
      displayOrder: 1,
    },
  });
  console.log('[Seed]: Challenges & predefined tasks verified');

  // 6. Seed 3 Workshops
  const now = new Date();
  const workshop1 = await prisma.workshop.upsert({
    where: { slug: 'hands-on-linux-cloud-shell-mastery' },
    update: {},
    create: {
      organisationId: organisation.id,
      organiserId: organiser.id,
      title: 'Hands-on Linux & Cloud Shell Mastery',
      slug: 'hands-on-linux-cloud-shell-mastery',
      description: 'A deep-dive practical workshop where university developers gain battle-tested Linux systems administration skills, process control, and container hardening.',
      domain: 'DevOps',
      bannerUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800',
      startDate: new Date(now.getTime() + 1000 * 60 * 60 * 24), // Tomorrow
      endDate: new Date(now.getTime() + 1000 * 60 * 60 * 26),
      duration: 120,
      registrationDeadline: new Date(now.getTime() + 1000 * 60 * 60 * 20),
      participantLimit: 50,
      registrationCode: 'GDG-LNX-2026',
      status: WorkshopStatus.PUBLISHED,
    },
  });

  const workshop2 = await prisma.workshop.upsert({
    where: { slug: 'offensive-cybersecurity-web-pentesting' },
    update: {},
    create: {
      organisationId: organisation.id,
      organiserId: organiser.id,
      title: 'Offensive Cybersecurity & Web App Pentesting',
      slug: 'offensive-cybersecurity-web-pentesting',
      description: 'Learn ethical hacking techniques in an isolated playground. Identify SQLi vulnerabilities, bypass flawed JWT tokens, and secure enterprise endpoints.',
      domain: 'Cybersecurity',
      bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
      startDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 120),
      duration: 120,
      registrationDeadline: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 6),
      participantLimit: 40,
      registrationCode: 'GDG-SEC-0042',
      status: WorkshopStatus.PUBLISHED,
    },
  });

  const workshop3 = await prisma.workshop.upsert({
    where: { slug: 'kubernetes-microservices-gitops' },
    update: {},
    create: {
      organisationId: organisation.id,
      organiserId: organiser.id,
      title: 'Kubernetes Microservices & GitOps Deployment',
      slug: 'kubernetes-microservices-gitops',
      description: 'Deploy resilient containerized workloads into a live K3s cluster. Configure automated canary rollouts and monitor ingress routing.',
      domain: 'Cloud Computing',
      bannerUrl: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800',
      startDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14),
      endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14 + 1000 * 60 * 180),
      duration: 180,
      registrationDeadline: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 13),
      participantLimit: 60,
      registrationCode: 'GDG-K8S-CLOUD',
      status: WorkshopStatus.PUBLISHED,
    },
  });

  // Link Workshops to Lab Templates
  await prisma.workshopLab.upsert({
    where: {
      unique_workshop_lab_template: {
        workshopId: workshop1.id,
        labTemplateId: template1.id,
      },
    },
    update: {},
    create: {
      workshopId: workshop1.id,
      labTemplateId: template1.id,
      displayOrder: 1,
      isRequired: true,
    },
  });

  await prisma.workshopLab.upsert({
    where: {
      unique_workshop_lab_template: {
        workshopId: workshop2.id,
        labTemplateId: template2.id,
      },
    },
    update: {},
    create: {
      workshopId: workshop2.id,
      labTemplateId: template2.id,
      displayOrder: 1,
      isRequired: true,
    },
  });

  await prisma.workshopLab.upsert({
    where: {
      unique_workshop_lab_template: {
        workshopId: workshop3.id,
        labTemplateId: template3.id,
      },
    },
    update: {},
    create: {
      workshopId: workshop3.id,
      labTemplateId: template3.id,
      displayOrder: 1,
      isRequired: true,
    },
  });
  console.log('[Seed]: 3 Workshops and template attachments verified');

  // 7. Seed Sample Registrations
  for (const student of students) {
    await prisma.workshopRegistration.upsert({
      where: {
        unique_workshop_student_registration: {
          workshopId: workshop1.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        workshopId: workshop1.id,
        studentId: student.id,
        status: 'REGISTERED',
        attendanceStatus: 'ATTENDED',
      },
    });
  }
  console.log('[Seed]: Sample registrations verified');

  // 8. Seed Achievements
  const achievements = [
    { id: '30000000-0000-0000-0000-000000000001', slug: 'shell-master', name: 'Shell Master', description: 'Solved 10 POSIX terminal challenges without viewing hints', icon: 'Terminal', category: 'DevOps', points: 100 },
    { id: '30000000-0000-0000-0000-000000000002', slug: 'container-pilot', name: 'Container Pilot', description: 'Deployed multi-pod Kubernetes services and passed all probes', icon: 'Shield', category: 'Cloud', points: 150 },
    { id: '30000000-0000-0000-0000-000000000003', slug: 'speed-demon', name: 'Speed Demon', description: 'Completed challenge evaluation in under 180 seconds', icon: 'Zap', category: 'General', points: 100 },
    { id: '30000000-0000-0000-0000-000000000004', slug: 'vulnerability-slayer', name: 'Vulnerability Slayer', description: 'Patched SQL injection vulnerability on first attempt', icon: 'Sparkles', category: 'Security', points: 200 },
  ];

  for (const ach of achievements) {
    const createdAch = await prisma.achievement.upsert({
      where: { id: ach.id },
      update: { slug: ach.slug },
      create: {
        id: ach.id,
        slug: ach.slug,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        points: ach.points,
      },
    });

    // Award first achievement to student 1 (Elena)
    await prisma.userAchievement.upsert({
      where: {
        unique_user_achievement: {
          userId: students[0].id,
          achievementId: createdAch.id,
        },
      },
      update: {},
      create: {
        userId: students[0].id,
        achievementId: createdAch.id,
      },
    });
  }
  console.log('[Seed]: Achievements and user awards verified');

  console.log('[Seed]: ✅ Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
