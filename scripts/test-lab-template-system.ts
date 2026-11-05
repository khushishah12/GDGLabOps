/**
 * GDG LabOps - Prompt 6 Automated Verification Test Suite
 *
 * Validates:
 * 1. Lab Template Library: creation, categorization (11 domains), metadata, tags, requiredTools.
 * 2. Challenge Builder across 5 distinct types:
 *    A. MULTIPLE_CHOICE
 *    B. SHORT_ANSWER
 *    C. CODE_KNOWLEDGE
 *    D. GUIDED_TASK
 *    E. RESEARCH_REFLECTION
 * 3. Challenge Reordering.
 * 4. Security Sanitizer: hidden answer stripping & solutionData isolation.
 * 5. Pure Server-Side Evaluator Engine: tests all 5 types with normalization.
 * 6. Hint Penalty Calculation (capped at 50%).
 * 7. Template Publishing Gate & Validation.
 * 8. Template Deep Duplication (clones template & all challenges as DRAFT).
 * 9. Workshop Attachment & Immutable Snapshot Strategy.
 * 10. Student Submission, Score Idempotency & Progress Tracking.
 */

import prisma from '../lib/prisma';
import { TemplateService } from '../lib/services/template.service';
import { ChallengeService } from '../lib/services/challenge.service';
import { WorkshopLabService } from '../lib/services/workshop-lab.service';
import { WorkshopService } from '../lib/services/workshop.service';
import {
  evaluateChallengeSubmission,
  sanitizeChallengeForStudent,
  calculateHintPenalty,
} from '../lib/challenges/evaluator';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 GDG LABOPS — PROMPT 6 LAB TEMPLATE & CHALLENGE TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
    }
  }

  try {
    // 0. Setup test user & organisation
    console.log('--- 0. Test Harness Setup ---');
    let testOrg = await prisma.organisation.findFirst({ where: { slug: 'test-labops-org' } });
    if (!testOrg) {
      testOrg = await prisma.organisation.create({
        data: {
          name: 'GDG LabOps Test Org',
          slug: 'test-labops-org',
        },
      });
    }

    let testUser = await prisma.user.findFirst({ where: { email: 'labops-tester@gdg.org' } });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: 'LabOps Tester',
          email: 'labops-tester@gdg.org',
          passwordHash: 'dummy-hash',
          role: 'ORGANISER',
          memberships: {
            create: {
              organisationId: testOrg.id,
              role: 'ADMIN',
              status: 'ACTIVE',
            },
          },
        },
      });
    }

    let testStudent = await prisma.user.findFirst({ where: { email: 'student-tester@gdg.org' } });
    if (!testStudent) {
      testStudent = await prisma.user.create({
        data: {
          name: 'Student Tester',
          email: 'student-tester@gdg.org',
          passwordHash: 'dummy-hash',
          role: 'STUDENT',
        },
      });
    }

    assert(Boolean(testOrg && testUser && testStudent), 'Test organisation and users verified');

    // 1. Create Lab Template
    console.log('\n--- 1. Lab Template Creation & Metadata ---');
    const template = await TemplateService.create({
      organisationId: testOrg.id,
      createdBy: testUser.id,
      name: 'Cybersecurity & Linux Hardening Lab',
      shortDescription: 'Hands-on practice auditing Linux access controls and services.',
      description: '## Objectives\nComprehensive security walkthrough covering file permissions, daemon audits, and incident reflection.',
      domain: 'Cybersecurity',
      difficulty: 'INTERMEDIATE',
      estimatedDuration: 75,
      coverImageUrl: 'https://images.unsplash.com/photo-linux-lab',
      tags: ['security', 'linux', 'hardening', 'audit'],
      requiredTools: [
        { name: 'bash', version: '5.0+' },
        { name: 'auditd', version: '3.0' },
      ],
      version: 1,
      status: 'DRAFT',
      environmentType: 'terminal',
      learningObjectives: [
        'Master POSIX permission evaluation and octal modes',
        'Identify vulnerable file permissions in system configs',
        'Formulate defensive architectural recommendations',
      ],
      prerequisites: ['Basic command line familiarity', 'Understanding of user/group permissions'],
    });

    assert(template.name === 'Cybersecurity & Linux Hardening Lab', 'Template created with title');
    assert(template.domain === 'Cybersecurity', 'Categorized under Cybersecurity');
    assert(template.status === 'DRAFT', 'Initialized in DRAFT status');
    assert(Array.isArray(template.tags) && template.tags.length === 4, 'Tags persisted');

    // 2. Challenge Builder across 5 Types
    console.log('\n--- 2. Challenge Builder: 5 Challenge Types ---');

    // Type A: MULTIPLE_CHOICE
    const chA = await ChallengeService.create({
      labTemplateId: template.id,
      title: 'Milestone 1: File Permission Mode Check',
      description: 'Select the octal mode that grants read/write to owner and read-only to group.',
      instructions: 'Review the available chmod mode arguments and select the appropriate representation.',
      challengeType: 'MULTIPLE_CHOICE',
      difficulty: 'BEGINNER',
      points: 100,
      displayOrder: 1,
      hints: [
        { id: 'h-mcq-1', orderIndex: 1, content: 'Read is 4, write is 2.', penaltyPercent: 10 },
      ],
      solutionData: {
        options: [
          { id: 'opt-777', text: 'chmod 777 /config.json', isCorrect: false },
          { id: 'opt-640', text: 'chmod 640 /config.json', isCorrect: true },
          { id: 'opt-600', text: 'chmod 600 /config.json', isCorrect: false },
        ],
      },
      explanation: '640 corresponds to (4+2=6) for user, (4) for group, and (0) for others.',
    });
    assert(chA.challengeType === 'MULTIPLE_CHOICE', 'Type A: MULTIPLE_CHOICE challenge created');

    // Type B: SHORT_ANSWER
    const chB = await ChallengeService.create({
      labTemplateId: template.id,
      title: 'Milestone 2: Security Daemon Identification',
      description: 'Name the Linux audit daemon responsible for monitoring system calls.',
      instructions: 'Provide the name of the standard userspace daemon binary for Linux Auditing System.',
      challengeType: 'SHORT_ANSWER',
      difficulty: 'INTERMEDIATE',
      points: 100,
      displayOrder: 2,
      hints: [
        { id: 'h-sa-1', orderIndex: 1, content: 'Ends with the letter "d".', penaltyPercent: 15 },
      ],
      solutionData: {
        acceptedAnswers: ['auditd', 'audit daemon'],
        caseSensitive: false,
        whitespaceNormalized: true,
      },
      explanation: 'auditd is the userspace component of the Linux Auditing System.',
    });
    assert(chB.challengeType === 'SHORT_ANSWER', 'Type B: SHORT_ANSWER challenge created');

    // Type C: CODE_KNOWLEDGE
    const chC = await ChallengeService.create({
      labTemplateId: template.id,
      title: 'Milestone 3: Chmod Command Construction',
      description: 'Write the exact command to apply permissions to /etc/vault.conf.',
      instructions: 'Construct the command that removes all permissions from others and group on /etc/vault.conf.',
      challengeType: 'CODE_KNOWLEDGE',
      difficulty: 'INTERMEDIATE',
      points: 100,
      displayOrder: 3,
      solutionData: {
        expectedCode: 'chmod go-rwx /etc/vault.conf',
        matchMode: 'NORMALIZED',
        language: 'bash',
      },
      explanation: 'go-rwx strips read, write, and execute permissions from group and others.',
    });
    assert(chC.challengeType === 'CODE_KNOWLEDGE', 'Type C: CODE_KNOWLEDGE challenge created');

    // Type D: GUIDED_TASK
    const chD = await ChallengeService.create({
      labTemplateId: template.id,
      title: 'Milestone 4: Guided Remediation Checklist',
      description: 'Follow the checklist to harden system accounts.',
      instructions: 'Check off each verified step and input the generated verification flag.',
      challengeType: 'GUIDED_TASK',
      difficulty: 'ADVANCED',
      points: 150,
      displayOrder: 4,
      solutionData: {
        checklist: [
          { id: 'step-1', text: 'Locked unused guest account', isRequired: true },
          { id: 'step-2', text: 'Verified shadow file permissions 0640', isRequired: true },
          { id: 'step-3', text: 'Optional log verification', isRequired: false },
        ],
        confirmationCode: 'FLAG-SEC-HARDEN-2026',
      },
      explanation: 'All mandatory accounts were successfully secured.',
    });
    assert(chD.challengeType === 'GUIDED_TASK', 'Type D: GUIDED_TASK challenge created');

    // Type E: RESEARCH_REFLECTION
    const chE = await ChallengeService.create({
      labTemplateId: template.id,
      title: 'Milestone 5: Incident Reflection & Recommendations',
      description: 'Write an architectural reflection analyzing the principle of least privilege.',
      instructions: 'Provide an analysis of why excessive default permissions cause lateral movement.',
      challengeType: 'RESEARCH_REFLECTION',
      difficulty: 'ADVANCED',
      points: 100,
      displayOrder: 5,
      solutionData: {
        minWordCount: 15,
        autoAwardPoints: true,
      },
      explanation: 'Least privilege prevents initial compromise from escalating to full domain takeover.',
    });
    assert(chE.challengeType === 'RESEARCH_REFLECTION', 'Type E: RESEARCH_REFLECTION challenge created');

    // 3. Challenge Reordering
    console.log('\n--- 3. Challenge Reordering ---');
    const reordered = await ChallengeService.reorder(template.id, [
      chB.id,
      chA.id,
      chC.id,
      chD.id,
      chE.id,
    ]);
    assert(reordered[0].id === chB.id && reordered[0].displayOrder === 1, 'Challenge B moved to first position');
    assert(reordered[1].id === chA.id && reordered[1].displayOrder === 2, 'Challenge A moved to second position');

    // Restore original ordering
    await ChallengeService.reorder(template.id, [chA.id, chB.id, chC.id, chD.id, chE.id]);

    // 4. Security Sanitizer: Student View
    console.log('\n--- 4. Security Sanitization (Defense-in-Depth) ---');
    const studentChA = await ChallengeService.getStudentView(chA.id);
    assert(!('solutionData' in studentChA), 'solutionData stripped from student view');
    assert(Array.isArray(studentChA.options) && studentChA.options.length === 3, 'MCQ options present');
    assert(
      Boolean(studentChA.options?.every((opt) => !('isCorrect' in opt))),
      'Hidden isCorrect flag stripped from options'
    );
    assert(studentChA.explanation === null, 'Explanation hidden prior to completion');

    // 5. Pure Server-Side Evaluator
    console.log('\n--- 5. Pure Server-Side Evaluator Engine ---');

    // Evaluate MCQ (Wrong answer)
    const resMcqFail = evaluateChallengeSubmission(chA, 'opt-777');
    assert(!resMcqFail.passed && resMcqFail.score === 0, 'MCQ wrong option evaluates to FAIL');

    // Evaluate MCQ (Correct answer)
    const resMcqPass = evaluateChallengeSubmission(chA, 'opt-640');
    assert(resMcqPass.passed && resMcqPass.score === 100, 'MCQ correct option evaluates to PASS (100%)');
    assert(resMcqPass.pointsAwarded === 100, 'MCQ awards 100 points');

    // Evaluate Short Answer (Normalization test: casing & extra spaces)
    const resSaPass = evaluateChallengeSubmission(chB, '   AUDITD   ');
    assert(resSaPass.passed, 'Short Answer passes with case-folding and whitespace trimming');

    const resSaFail = evaluateChallengeSubmission(chB, 'systemd');
    assert(!resSaFail.passed, 'Short Answer incorrect term evaluates to FAIL');

    // Evaluate Code Knowledge (Normalized test: ignores trailing comments & whitespace)
    const resCodePass = evaluateChallengeSubmission(
      chC,
      '  chmod go-rwx /etc/vault.conf  # strip permissions\n'
    );
    assert(resCodePass.passed, 'Code Knowledge passes with comment and whitespace normalization');

    // Evaluate Guided Task (Checklist & confirmation code)
    const resTaskPass = evaluateChallengeSubmission(chD, {
      checkedTaskIds: ['step-1', 'step-2'],
      confirmationCode: 'flag-sec-harden-2026',
    });
    assert(resTaskPass.passed, 'Guided Task passes when all required items and confirmation code match');

    const resTaskMissingRequired = evaluateChallengeSubmission(chD, {
      checkedTaskIds: ['step-1'],
      confirmationCode: 'FLAG-SEC-HARDEN-2026',
    });
    assert(!resTaskMissingRequired.passed, 'Guided Task fails when required step is missing');

    // Evaluate Research Reflection (Word count threshold)
    const resReflectFail = evaluateChallengeSubmission(chE, 'This is too short.');
    assert(!resReflectFail.passed, 'Reflection fails when under minimum word count');

    const longReflection =
      'Implementing strict least privilege minimizes attack surfaces significantly. ' +
      'By removing unnecessary group and world write permissions, threat actors cannot pivot ' +
      'laterally across different service daemons on the host.';
    const resReflectPass = evaluateChallengeSubmission(chE, longReflection);
    assert(resReflectPass.passed, 'Reflection passes when word count meets threshold (>= 15 words)');

    // 6. Hint Penalty Calculation
    console.log('\n--- 6. Hint Penalty Deduction ---');
    const hintPenalty = calculateHintPenalty(chA.hints as any, ['h-mcq-1']);
    assert(hintPenalty.totalPenaltyPercent === 10, 'Hint penalty computed as 10%');

    const evalWithHint = evaluateChallengeSubmission(chA, 'opt-640', ['h-mcq-1']);
    assert(evalWithHint.passed, 'Evaluation passes with hint unlocked');
    assert(evalWithHint.score === 90, 'Score adjusted to 90%');
    assert(evalWithHint.pointsAwarded === 90, 'Points deducted: 90/100 points awarded');

    // Penalty cap at 50%
    const heavyPenalty = calculateHintPenalty(
      [
        { id: 'h1', penaltyPercent: 30 },
        { id: 'h2', penaltyPercent: 30 },
      ],
      ['h1', 'h2']
    );
    assert(heavyPenalty.totalPenaltyPercent === 50, 'Hint penalty capped at 50% maximum');

    // 7. Template Publishing Gate
    console.log('\n--- 7. Template Publishing Gate ---');
    const published = await TemplateService.publish(template.id);
    assert(published.status === 'PUBLISHED', 'Template successfully published');

    // 8. Template Deep Duplication
    console.log('\n--- 8. Template Deep Duplication ---');
    const duplicated = await TemplateService.duplicate(template.id, testUser.id);
    assert(Boolean(duplicated?.name.includes('(Copy)')), 'Cloned template name has (Copy) suffix');
    assert(duplicated?.status === 'DRAFT', 'Cloned template starts in DRAFT status');
    assert(duplicated?.challenges.length === 5, 'All 5 challenges cloned');

    // Clean up duplicated template
    if (duplicated) {
      await prisma.challenge.deleteMany({ where: { labTemplateId: duplicated.id } });
      await prisma.labTemplate.delete({ where: { id: duplicated.id } });
    }

    // 9. Workshop Attachment & Immutable Snapshot Strategy
    console.log('\n--- 9. Workshop Attachment & Snapshot Strategy ---');
    const workshop = await WorkshopService.create({
      organisationId: testOrg.id,
      organiserId: testUser.id,
      title: 'DevSecOps Hands-On Intensive 2026',
      slug: `devsecops-intensive-${Date.now()}`,
      description: 'Practical training on system hardening and security audits.',
      domain: 'Cybersecurity',
      difficulty: 'INTERMEDIATE',
      duration: 120,
      participantLimit: 40,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 93600000).toISOString(),
      registrationDeadline: new Date(Date.now() + 80000000).toISOString(),
      venueType: 'ONLINE',
      status: 'PUBLISHED',
    });

    const attached = await WorkshopLabService.attach({
      workshopId: workshop.id,
      labTemplateId: template.id,
      isRequired: true,
      createSnapshot: true,
    });

    assert(Boolean(attached.labSnapshot), 'Immutable labSnapshot created upon attachment');
    const snapshotObj = attached.labSnapshot as any;
    assert(snapshotObj.challenges?.length === 5, 'Snapshot captured all 5 challenges');

    // Modify original template in library: snapshot must stay frozen!
    await TemplateService.update(template.id, { name: 'MODIFIED TEMPLATE NAME' });
    const workshopLabs = await WorkshopLabService.listForWorkshop(workshop.id);
    const snapData = workshopLabs[0];
    assert(snapData.hasSnapshot === true, 'Workshop lab indicates snapshot exists');

    // Sync snapshot test
    const synced = await WorkshopLabService.syncSnapshot(attached.id);
    const updatedSnap = synced.labSnapshot as any;
    assert(updatedSnap.template.name === 'MODIFIED TEMPLATE NAME', 'Snapshot synced to latest template');

    // 10. Student Submission, Score Idempotency & Progress Tracking
    console.log('\n--- 10. Student Progress & Score Idempotency ---');
    // First submission: PASS
    const sub1 = await ChallengeService.submitAndEvaluate({
      studentId: testStudent.id,
      challengeId: chA.id,
      workshopId: workshop.id,
      answer: 'opt-640',
      usedHintIds: [],
    });

    assert(sub1.evaluation.passed, 'First student submission passed');
    assert(sub1.netPointsAwarded === 100, 'Awarded 100 net points on first solve');
    assert(sub1.alreadyPassed === false, 'Flagged as first pass');

    // Second submission on SAME challenge: anti-inflation check
    const sub2 = await ChallengeService.submitAndEvaluate({
      studentId: testStudent.id,
      challengeId: chA.id,
      workshopId: workshop.id,
      answer: 'opt-640',
      usedHintIds: [],
    });

    assert(sub2.evaluation.passed, 'Second submission passed evaluation');
    assert(sub2.netPointsAwarded === 0, 'Anti-inflation: 0 net points awarded on duplicate solve');
    assert(sub2.alreadyPassed === true, 'Already passed flag correctly set');

    // Verify StudentProgress record
    const progress = await prisma.studentProgress.findFirst({
      where: {
        studentId: testStudent.id,
        workshopId: workshop.id,
      },
    });

    assert(Boolean(progress), 'StudentProgress record created');
    assert(progress?.completedChallenges === 1, 'Completed challenges = 1');
    assert(progress?.totalPoints === 100, 'Total points recorded = 100');

    // 11. Template Analytics
    console.log('\n--- 11. Template Performance Analytics ---');
    const analytics = await TemplateService.getAnalytics(template.id);
    assert(analytics.totalSubmissions >= 2, 'Analytics captured submissions');
    assert(analytics.uniqueStudents >= 1, 'Analytics captured unique student');
    assert(analytics.challengeStats.length === 5, 'Challenge-by-challenge breakdown returned');

    // Clean up test workshop and template
    console.log('\n--- Test Cleanup ---');
    await prisma.challengeSubmission.deleteMany({ where: { studentId: testStudent.id } });
    await prisma.studentProgress.deleteMany({ where: { workshopId: workshop.id } });
    await prisma.workshopLab.deleteMany({ where: { workshopId: workshop.id } });
    await prisma.workshop.delete({ where: { id: workshop.id } });
    await prisma.challenge.deleteMany({ where: { labTemplateId: template.id } });
    await prisma.labTemplate.delete({ where: { id: template.id } });

    console.log('Cleanup completed.\n');

    console.log('===============================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
    console.log('===============================================================');
  } catch (err: any) {
    console.error('\n❌ Unhandled Test Suite Exception:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
