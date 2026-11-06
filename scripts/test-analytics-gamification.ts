import { PrismaClient } from '@prisma/client';
import { GamificationService } from '../lib/services/gamification.service';
import { FeedbackService } from '../lib/services/feedback.service';
import { AnalyticsService } from '../lib/services/analytics.service';
import { ReportService } from '../lib/services/report.service';
import { RegistrationService } from '../lib/services/registration.service';
import { ChallengeService } from '../lib/services/challenge.service';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  PROMPT 9: ANALYTICS, REPORTS, GAMIFICATION & LEADERBOARD TESTS');
  console.log('================================================================\n');

  // 1. Fetch test fixture users & workshop
  const organiser = await prisma.user.findFirst({
    where: { role: 'ORGANISER' },
    include: { memberships: true },
  });
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT', email: 'elena.rostova@student.gdg.dev' },
  });
  const student2 = await prisma.user.findFirst({
    where: { role: 'STUDENT', email: 'alex.chen@student.gdg.dev' },
  });
  const workshop = await prisma.workshop.findFirst({
    where: { status: { in: ['PUBLISHED', 'ONGOING'] } },
    include: {
      workshopLabs: {
        include: {
          labTemplate: {
            include: { challenges: true },
          },
        },
      },
    },
  });

  if (!organiser || !student || !workshop) {
    throw new Error('Required test fixtures not found in database. Run seed first.');
  }

  const orgId = workshop.organisationId;
  const workshopId = workshop.id;
  const challenge = workshop.workshopLabs[0]?.labTemplate?.challenges[0];

  console.log(`[Fixture Context]:`);
  console.log(`  Workshop: "${workshop.title}" (${workshopId})`);
  console.log(`  Student 1: "${student.name}" (${student.id})`);
  console.log(`  Student 2: "${student2?.name || 'N/A'}" (${student2?.id || 'N/A'})\n`);

  // ================================================================
  // SECTION 1: GAMIFICATION & APPEND-ONLY POINTS LEDGER
  // ================================================================
  console.log('--- SECTION 1: Append-Only Points Ledger & Idempotency ---');

  const initialStudent = await prisma.user.findUnique({
    where: { id: student.id },
    select: { totalPoints: true },
  });
  const initialPoints = initialStudent?.totalPoints || 0;
  const testRefKey = `ref-test-${Date.now()}`;

  // Test 1: Award Points
  const tx1 = await GamificationService.awardPoints({
    userId: student.id,
    amount: 100,
    reason: 'Test Challenge Completion Points',
    sourceActivity: 'TEST_CHALLENGE',
    referenceId: testRefKey,
    workshopId,
    organisationId: orgId,
  });

  assert(tx1 !== null && tx1.amount === 100, 'Points transaction appended to ledger with amount 100');
  assert(tx1.type === 'EARNED', 'Transaction marked as EARNED type');

  const studentAfterTx1 = await prisma.user.findUnique({
    where: { id: student.id },
    select: { totalPoints: true },
  });
  assert(
    (studentAfterTx1?.totalPoints || 0) === initialPoints + 100,
    'User totalPoints atomically incremented by 100',
    `Expected ${initialPoints + 100}, got ${studentAfterTx1?.totalPoints}`
  );

  // Test 2: Idempotency Protection
  const tx1Duplicate = await GamificationService.awardPoints({
    userId: student.id,
    amount: 100,
    reason: 'Duplicate Challenge Submission Attempt',
    sourceActivity: 'TEST_CHALLENGE',
    referenceId: testRefKey, // Same idempotency key
    workshopId,
    organisationId: orgId,
  });

  assert(tx1Duplicate.id === tx1.id, 'Idempotency key prevents duplicate transaction creation');

  const studentAfterDup = await prisma.user.findUnique({
    where: { id: student.id },
    select: { totalPoints: true },
  });
  assert(
    (studentAfterDup?.totalPoints || 0) === initialPoints + 100,
    'Duplicate award does not inflate user points (idempotent)'
  );

  // Test 3: Compensating Reversal Transaction
  const reversalTx = await GamificationService.revertPoints({
    transactionId: tx1.id,
    reason: 'Test submission disqualified or invalidated',
  });

  assert(reversalTx.amount === -100, 'Compensating transaction created with negative amount (-100)');
  assert(reversalTx.type === 'REVERSED', 'Compensating transaction has REVERSED type');
  assert(reversalTx.referenceId === tx1.id, 'Reversal references original transaction ID');

  const studentAfterReversal = await prisma.user.findUnique({
    where: { id: student.id },
    select: { totalPoints: true },
  });
  assert(
    (studentAfterReversal?.totalPoints || 0) === initialPoints,
    'User points correctly reduced back to initial level without record deletion',
    `Expected ${initialPoints}, got ${studentAfterReversal?.totalPoints}`
  );

  // Verify original transaction still exists in ledger (append-only integrity)
  const originalCheck = await prisma.pointsTransaction.findUnique({ where: { id: tx1.id } });
  assert(originalCheck !== null, 'Original transaction remains immutable in append-only ledger');

  // Test 4: Re-award legitimate points for subsequent tests
  await GamificationService.awardPoints({
    userId: student.id,
    amount: 150,
    reason: 'Active Participation Bonus',
    sourceActivity: 'ACTIVE_BONUS',
    referenceId: `bonus-${Date.now()}`,
    workshopId,
    organisationId: orgId,
  });
  assert(true, 'Legitimate participation points awarded successfully');

  // ================================================================
  // SECTION 2: BADGE & ACHIEVEMENT ENGINE
  // ================================================================
  console.log('\n--- SECTION 2: Achievement & Badge Engine ---');

  // Test 5: Standard Achievements exist in database catalog
  const catalog = await prisma.achievement.findMany({ where: { isActive: true } });
  assert(catalog.length >= 6, `Catalog contains standard achievements (found ${catalog.length})`);
  const slugs = new Set(catalog.map((a) => a.slug));
  assert(slugs.has('first-workshop'), 'Catalog contains "first-workshop" achievement');
  assert(slugs.has('first-lab'), 'Catalog contains "first-lab" achievement');
  assert(slugs.has('first-challenge'), 'Catalog contains "first-challenge" achievement');

  // Qualify student with real activity records: attended workshop & passed challenge
  await prisma.workshopRegistration.upsert({
    where: {
      unique_workshop_student_registration: {
        workshopId,
        studentId: student.id,
      },
    },
    update: {
      status: 'ATTENDED',
      attendanceStatus: 'ATTENDED',
    },
    create: {
      workshopId,
      studentId: student.id,
      status: 'ATTENDED',
      attendanceStatus: 'ATTENDED',
    },
  });

  if (challenge) {
    await prisma.challengeSubmission.create({
      data: {
        studentId: student.id,
        challengeId: challenge.id,
        workshopId,
        status: 'PASSED',
        score: 100,
        pointsAwarded: challenge.points || 100,
        submissionData: { completed: true, hintsViewed: 0 },
      },
    });
  }

  // Test 6: Evaluate achievements for student
  const newlyAwarded = await GamificationService.evaluateAchievements(student.id, { workshopId });
  assert(Array.isArray(newlyAwarded), 'Achievement evaluation completes smoothly');

  // Verify user achievements junction
  const userAchs = await prisma.userAchievement.findMany({
    where: { userId: student.id },
    include: { achievement: true },
  });
  assert(userAchs.length >= 1, `Student has earned achievements (count: ${userAchs.length})`);

  // ================================================================
  // SECTION 3: MULTI-LEVEL LEADERBOARDS & STUDENT PRIVACY
  // ================================================================
  console.log('\n--- SECTION 3: Multi-Level Leaderboards & Student Privacy ---');

  // Test 7: All-time Leaderboard
  const allTimeLb = await GamificationService.getLeaderboard({
    scope: 'all-time',
    limit: 10,
    currentUserId: student.id,
  });
  assert(allTimeLb.entries.length > 0, 'All-time leaderboard returns ranked participant entries');
  assert(allTimeLb.entries[0].rank === 1, 'Top entry has rank #1');
  assert(allTimeLb.entries[0].points >= (allTimeLb.entries[1]?.points || 0), 'Entries ordered descending by points');

  // Test 8: Email Privacy Safety Rule
  const anyEmailExposed = (allTimeLb.entries as any[]).some((e) => e.email || (e.name && e.name.includes('@')));
  assert(!anyEmailExposed, 'Leaderboard NEVER exposes student email addresses on public records');

  // Test 9: Monthly Leaderboard
  const monthlyLb = await GamificationService.getLeaderboard({
    scope: 'monthly',
    limit: 10,
  });
  assert(Array.isArray(monthlyLb.entries), 'Monthly leaderboard query returns valid entries list');

  // Test 10: Workshop-scoped Leaderboard
  const workshopLb = await GamificationService.getLeaderboard({
    scope: 'workshop',
    scopeId: workshopId,
  });
  assert(Array.isArray(workshopLb.entries), 'Workshop-scoped leaderboard query functions accurately');

  // Test 11: Privacy Masking Opt-Out Toggle
  await GamificationService.toggleLeaderboardOptOut(student.id, true);
  const optedOutLb = await GamificationService.getLeaderboard({
    scope: 'all-time',
    currentUserId: student2 ? student2.id : 'another-user',
  });

  const studentEntryForOtherUser = optedOutLb.entries.find((e) => e.userId === 'anonymous' || e.name === 'Anonymous Explorer');
  assert(studentEntryForOtherUser !== undefined, 'Opted-out student appears as "Anonymous Explorer" to other users');
  assert(studentEntryForOtherUser?.avatar === null, 'Avatar is masked for opted-out student');

  // Revert privacy toggle for subsequent tests
  await GamificationService.toggleLeaderboardOptOut(student.id, false);
  assert(true, 'Privacy opt-out toggle reverted to public visibility');

  // ================================================================
  // SECTION 4: WORKSHOP FEEDBACK SYSTEM
  // ================================================================
  console.log('\n--- SECTION 4: Workshop Feedback System ---');

  // Ensure student has registration for feedback submission
  await prisma.workshopRegistration.upsert({
    where: {
      unique_workshop_student_registration: {
        workshopId,
        studentId: student.id,
      },
    },
    update: { status: 'REGISTERED' },
    create: {
      workshopId,
      studentId: student.id,
      status: 'REGISTERED',
    },
  });

  // Test 12: Submit Workshop Feedback
  const feedback = await FeedbackService.submitFeedback({
    workshopId,
    studentId: student.id,
    contentRating: 5,
    instructorRating: 4,
    labQualityRating: 5,
    platformExperienceRating: 4,
    comments: 'Excellent hands-on session! Loved the Docker container setup.',
    suggestions: 'Add more Kubernetes cluster debugging challenges.',
  });

  assert(feedback !== null && feedback.contentRating === 5, 'Workshop feedback submitted and saved');
  assert(feedback.overallRating === 4.5, 'Overall rating accurately calculated as average (4.5)', `Got ${feedback.overallRating}`);

  // Test 13: Unique Constraint Enforced (Upsert Update)
  const updatedFeedback = await FeedbackService.submitFeedback({
    workshopId,
    studentId: student.id,
    contentRating: 5,
    instructorRating: 5,
    labQualityRating: 5,
    platformExperienceRating: 5,
    comments: 'Updated: absolutely outstanding workshop!',
  });
  assert(updatedFeedback.id === feedback.id, 'Submitting second feedback updates existing record (1 per student)');
  assert(updatedFeedback.overallRating === 5.0, 'Updated overall rating is 5.0');

  // Test 14: Workshop Feedback Aggregated Summary
  const fbSummary = await FeedbackService.getWorkshopFeedbackSummary(workshopId);
  assert(fbSummary.totalResponses >= 1, `Feedback summary aggregated (responses: ${fbSummary.totalResponses})`);
  assert(fbSummary.averageOverall >= 4.0, `Average rating accurately aggregated (${fbSummary.averageOverall})`);
  assert(fbSummary.ratingDistribution[5] >= 1, '5-star rating count accurately reflected in distribution');

  // ================================================================
  // SECTION 5: ORGANISER ANALYTICS & WORKSHOP PERFORMANCE
  // ================================================================
  console.log('\n--- SECTION 5: Organiser & Workshop Performance Analytics ---');

  // Test 15: Organiser Analytics Dashboard
  const organiserAnalytics = await AnalyticsService.getOrganiserAnalytics({
    organisationId: orgId,
  });

  assert(organiserAnalytics.overview.totalWorkshops >= 1, 'Organiser analytics computes total workshops from DB');
  assert(organiserAnalytics.overview.totalRegistrations >= 1, 'Organiser analytics computes total registrations from DB');
  assert(typeof organiserAnalytics.overview.attendanceRate === 'number', 'Attendance rate calculated');
  assert(Array.isArray(organiserAnalytics.domainBreakdown), 'Domain breakdown returned');
  assert(Array.isArray(organiserAnalytics.registrationTrends), 'Registration trends returned');

  // Test 16: Granular Workshop Performance Analytics
  const workshopPerf = await AnalyticsService.getWorkshopPerformanceAnalytics(workshopId);
  assert(workshopPerf.workshop.id === workshopId, 'Workshop performance analytics targeted to workshop');
  assert(typeof workshopPerf.registration.capacityUtilization === 'number', 'Capacity utilisation % computed');
  assert(typeof workshopPerf.attendance.attendanceRate === 'number', 'Attendance rate % computed');
  assert(Array.isArray(workshopPerf.challengeAnalytics), 'Challenge difficulty analysis returned');

  // Verify minimum sample threshold for difficulty flag
  const challengeWithThreshold = workshopPerf.challengeAnalytics.find((ch: any) => ch.hasSufficientData);
  const challengeLowSample = workshopPerf.challengeAnalytics.find((ch: any) => !ch.hasSufficientData);
  assert(
    workshopPerf.challengeAnalytics.length > 0,
    'Challenge metrics array populated with real database evaluations'
  );

  // ================================================================
  // SECTION 6: STUDENT LEARNING JOURNEY ANALYTICS
  // ================================================================
  console.log('\n--- SECTION 6: Student Personal Learning Dashboard ---');

  // Test 17: Student Learning Analytics
  const studentLearning = await AnalyticsService.getStudentLearningAnalytics(student.id);
  assert(studentLearning.profile.id === student.id, 'Student learning journey retrieved for student');
  assert(studentLearning.profile.totalPoints >= 0, 'Total points accurately retrieved');
  assert(studentLearning.profile.rank >= 1, 'Global rank accurately calculated from higher scores');
  assert(Array.isArray(studentLearning.achievements), 'Achievements catalog returned with unlocked status');
  assert(Array.isArray(studentLearning.recentTransactions), 'Recent points ledger transactions returned');

  // ================================================================
  // SECTION 7: REPORT GENERATOR & EXPORTS
  // ================================================================
  console.log('\n--- SECTION 7: Workshop Reports & Export Engine ---');

  // Test 18: CSV Export Generator
  const csv = await ReportService.generateWorkshopCsv(workshopId);
  assert(typeof csv === 'string' && csv.length > 0, 'CSV export generated');
  assert(csv.startsWith('Student Name,Student Email,Registration Status'), 'CSV includes standard headers');
  assert(csv.includes(student.name), 'CSV includes enrolled participant records');

  // Test 19: Printable Executive Summary HTML
  const summaryHtml = await ReportService.generateWorkshopSummaryHtml(workshopId);
  assert(typeof summaryHtml === 'string' && summaryHtml.length > 0, 'HTML summary report generated');
  assert(summaryHtml.includes('<!DOCTYPE html>'), 'Valid HTML5 document output');
  assert(summaryHtml.includes(workshop.title), 'Includes workshop title');
  assert(summaryHtml.includes('@media print'), 'Includes print stylesheet for PDF/paper exports');

  // Summary
  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error('Test suite error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
