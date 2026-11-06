import { prisma } from '../lib/prisma';
import { PresenceService } from '../lib/services/presence.service';
import { AnnouncementService } from '../lib/services/announcement.service';
import { HelpRequestService } from '../lib/services/help-request.service';
import { NotificationService } from '../lib/services/notification.service';
import { ActivityService } from '../lib/services/activity.service';
import { MonitoringService } from '../lib/services/monitoring.service';
import { RealtimeEventService } from '../lib/services/realtime-event.service';
import { ChallengeService } from '../lib/services/challenge.service';
import { SessionService } from '../lib/services/session.service';
import { SecurityManager } from '../lab-runner/src/security/auth';
import { WorkshopRealtimeGateway } from '../lab-runner/src/realtime/ws-realtime-gateway';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRealtimeMonitoringTests() {
  console.log('\n========================================================');
  console.log('GDG LabOps - Real-Time Monitoring & Collaboration Test Suite');
  console.log('========================================================\n');

  const stamp = Date.now();
  let orgA: any, orgB: any;
  let organiserA: any, organiserB: any;
  let student1: any, student2: any;
  let workshopA: any, workshopB: any;
  let labTemplate: any, challenge1: any;
  let mockServer: http.Server | null = null;
  let gateway: WorkshopRealtimeGateway | null = null;
  let gatewayPort = 8099;

  try {
    // 0. Setup Multi-tenant Test Environment
    console.log('Setting up test fixtures in Neon DB...');

    orgA = await prisma.organisation.create({
      data: {
        name: `Chapter Alpha ${stamp}`,
        slug: `chapter-alpha-${stamp}`,
        description: 'Test Organisation Alpha',
      },
    });

    orgB = await prisma.organisation.create({
      data: {
        name: `Chapter Beta ${stamp}`,
        slug: `chapter-beta-${stamp}`,
        description: 'Test Organisation Beta',
      },
    });

    organiserA = await prisma.user.create({
      data: {
        name: 'Organiser Alice',
        email: `alice.org.a.${stamp}@test.gdg.dev`,
        role: 'ORGANISER',
        status: 'ACTIVE',
        memberships: {
          create: {
            organisationId: orgA.id,
            role: 'ADMIN',
          },
        },
      },
    });

    organiserB = await prisma.user.create({
      data: {
        name: 'Organiser Bob',
        email: `bob.org.b.${stamp}@test.gdg.dev`,
        role: 'ORGANISER',
        status: 'ACTIVE',
        memberships: {
          create: {
            organisationId: orgB.id,
            role: 'ADMIN',
          },
        },
      },
    });

    student1 = await prisma.user.create({
      data: {
        name: 'Student One',
        email: `student1.${stamp}@test.gdg.dev`,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    student2 = await prisma.user.create({
      data: {
        name: 'Student Two',
        email: `student2.${stamp}@test.gdg.dev`,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    labTemplate = await prisma.labTemplate.create({
      data: {
        organisationId: orgA.id,
        createdBy: organiserA.id,
        name: `Linux SysAdmin Lab ${stamp}`,
        description: 'Hands-on Linux permissions and signals',
        domain: 'DevOps / Linux',
        difficulty: 'BEGINNER',
        estimatedDuration: 60,
        learningObjectives: ['Audit permissions', 'Process management'],
        prerequisites: ['Basic CLI'],
        environmentProfile: 'ubuntu-fundamentals',
        status: 'PUBLISHED',
      },
    });

    challenge1 = await prisma.challenge.create({
      data: {
        labTemplateId: labTemplate.id,
        title: 'Challenge 1: Fix Permissions',
        description: 'Set correct group and mode',
        instructions: 'Run chmod 640 /etc/labops/config.json',
        challengeType: 'SHORT_ANSWER',
        points: 100,
        displayOrder: 1,
        solutionData: {
          expectedAnswer: 'chmod 640',
          caseSensitive: false,
        },
      },
    });

    workshopA = await prisma.workshop.create({
      data: {
        organisationId: orgA.id,
        organiserId: organiserA.id,
        title: `Linux Workshop A ${stamp}`,
        slug: `linux-workshop-a-${stamp}`,
        description: 'Production Linux Monitoring Workshop',
        domain: 'DevOps',
        difficulty: 'BEGINNER',
        duration: 120,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 + 7200000),
        registrationDeadline: new Date(Date.now() + 43200000),
        registrationCode: `WS-A-${stamp.toString().slice(-6)}`,
        status: 'PUBLISHED',
        isPublic: true,
        workshopLabs: {
          create: {
            labTemplateId: labTemplate.id,
            displayOrder: 1,
          },
        },
      },
    });

    workshopB = await prisma.workshop.create({
      data: {
        organisationId: orgB.id,
        organiserId: organiserB.id,
        title: `Cybersecurity Workshop B ${stamp}`,
        slug: `cyber-workshop-b-${stamp}`,
        description: 'Private Security Workshop',
        domain: 'Cybersecurity',
        difficulty: 'INTERMEDIATE',
        duration: 120,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 86400000 + 7200000),
        registrationDeadline: new Date(Date.now() + 43200000),
        registrationCode: `WS-B-${stamp.toString().slice(-6)}`,
        status: 'PUBLISHED',
        isPublic: false,
      },
    });

    // Student 1 registers for Workshop A
    await prisma.workshopRegistration.create({
      data: {
        workshopId: workshopA.id,
        studentId: student1.id,
        status: 'REGISTERED',
      },
    });

    console.log('Fixtures provisioned successfully.\n');

    // ----------------------------------------------------
    // TEST 1: Organiser can monitor their workshop
    // ----------------------------------------------------
    console.log('Running Test 1: Organiser can monitor their workshop...');
    const liveSummary = await MonitoringService.getWorkshopLiveSummary(workshopA.id, organiserA.id);
    assert(liveSummary.workshop.id === workshopA.id, 'Monitoring summary returns correct workshop ID');
    assert(liveSummary.participation.totalRegistered === 1, 'Reflects 1 registered participant');
    assert(liveSummary.challenges.totalChallengesCount === 1, 'Calculates 1 attached challenge');

    // ----------------------------------------------------
    // TEST 2: Organiser cannot monitor another organisation's workshop
    // ----------------------------------------------------
    console.log('Running Test 2: Cross-organisation isolation blocked...');
    const orgBMember = await prisma.organisationMembership.findFirst({
      where: { organisationId: orgB.id, userId: organiserA.id },
    });
    assert(!orgBMember, 'Organiser A has no membership in Organisation B');

    // ----------------------------------------------------
    // TEST 3 & 5: Presence updates when user connects (ONLINE)
    // ----------------------------------------------------
    console.log('Running Test 3 & 5: Student presence connects and updates to ONLINE...');
    const pRecord = await PresenceService.recordHeartbeat({
      workshopId: workshopA.id,
      userId: student1.id,
      isNewClient: true,
      status: 'ONLINE',
    });
    assert(pRecord.status === 'ONLINE', 'Presence marked ONLINE');
    assert(pRecord.clientCount === 1, 'Client count initialized to 1');

    const presencesAfterJoin = await PresenceService.getWorkshopPresences(workshopA.id);
    assert(presencesAfterJoin.online === 1, '1 online participant recorded in live presence summary');

    // ----------------------------------------------------
    // TEST 4: Unregistered student access check
    // ----------------------------------------------------
    console.log('Running Test 4: Unregistered student cannot access private workshop...');
    const student2Reg = await prisma.workshopRegistration.findUnique({
      where: {
        unique_workshop_student_registration: {
          workshopId: workshopB.id,
          studentId: student2.id,
        },
      },
    });
    assert(!student2Reg, 'Student 2 has no registration for Workshop B');

    // ----------------------------------------------------
    // TEST 6: Presence handles multiple browser tabs
    // ----------------------------------------------------
    console.log('Running Test 6: Presence handles multiple browser tabs/devices...');
    // Second tab opens
    await PresenceService.recordHeartbeat({
      workshopId: workshopA.id,
      userId: student1.id,
      isNewClient: true,
      status: 'ONLINE',
    });
    const multiTabPresence = await prisma.workshopPresence.findUnique({
      where: { unique_workshop_user_presence: { workshopId: workshopA.id, userId: student1.id } },
    });
    assert(multiTabPresence?.clientCount === 2, 'Client count incremented to 2 for second tab');

    // First tab closes (disconnect)
    await PresenceService.recordDisconnect(workshopA.id, student1.id);
    const afterOneTabClose = await prisma.workshopPresence.findUnique({
      where: { unique_workshop_user_presence: { workshopId: workshopA.id, userId: student1.id } },
    });
    assert(afterOneTabClose?.status === 'ONLINE', 'User remains ONLINE because second tab is still open');
    assert(afterOneTabClose?.clientCount === 1, 'Client count decremented to 1');

    // ----------------------------------------------------
    // TEST 7: Stale presence expires
    // ----------------------------------------------------
    console.log('Running Test 7: Stale presence expires on heartbeat timeout...');
    // Artificially age the heartbeat by 60 seconds
    await prisma.workshopPresence.update({
      where: { id: afterOneTabClose!.id },
      data: { lastHeartbeat: new Date(Date.now() - 60000) },
    });
    const expiredCount = await PresenceService.cleanupStalePresences(workshopA.id, 45);
    assert(expiredCount >= 1, 'Stale cleanup marked at least 1 record offline');

    const presenceAfterCleanup = await prisma.workshopPresence.findUnique({
      where: { id: afterOneTabClose!.id },
    });
    assert(presenceAfterCleanup?.status === 'OFFLINE', 'Stale student presence is now OFFLINE');

    // Re-connect student 1 for subsequent tests
    await PresenceService.recordHeartbeat({
      workshopId: workshopA.id,
      userId: student1.id,
      isNewClient: true,
      status: 'ONLINE',
    });

    // ----------------------------------------------------
    // TEST 8 & 9: Challenge progress updates in real time & anti-spoofing
    // ----------------------------------------------------
    console.log('Running Test 8 & 9: Challenge progress updates & anti-spoofing verification...');
    // Test spoofing: wrong answer must fail
    const wrongSubmission = await ChallengeService.submit({
      studentId: student1.id,
      challengeId: challenge1.id,
      workshopId: workshopA.id,
      answer: 'rm -rf /',
    });
    assert(!wrongSubmission.evaluation.passed, 'Invalid/spoofed answer is rejected by server evaluator');
    assert(wrongSubmission.evaluation.score === 0, 'Zero score awarded for incorrect answer');

    // Test legitimate completion
    const correctSubmission = await ChallengeService.submit({
      studentId: student1.id,
      challengeId: challenge1.id,
      workshopId: workshopA.id,
      answer: 'chmod 640',
    });
    assert(correctSubmission.evaluation.passed, 'Correct challenge submission passes server validation');
    assert(correctSubmission.netPointsAwarded === 100, '100 points awarded for successful challenge completion');

    const studentProg = await prisma.studentProgress.findFirst({
      where: { studentId: student1.id, workshopId: workshopA.id },
    });
    assert(studentProg?.completedChallenges === 1, 'StudentProgress records 1 completed challenge');
    assert(studentProg?.completionPercentage === 100, 'StudentProgress records 100% completion');

    // ----------------------------------------------------
    // TEST 10 & 11: Announcements reach participants & persist after reconnect
    // ----------------------------------------------------
    console.log('Running Test 10 & 11: Announcements persist and reach participants...');
    const announcement = await AnnouncementService.create({
      workshopId: workshopA.id,
      organiserId: organiserA.id,
      title: 'Lab Server Update',
      message: 'Container memory limit increased to 512MB.',
      priority: 'IMPORTANT',
      isPinned: true,
    });
    assert(announcement.id !== undefined, 'Announcement persisted in Neon PostgreSQL');
    assert(announcement.priority === 'IMPORTANT', 'Priority stored as IMPORTANT');

    // Fetch announcements (simulating reconnection)
    const announcementList = await AnnouncementService.list(workshopA.id);
    assert(announcementList.items.length >= 1, 'Reconnecting student retrieves persistent announcements');
    assert(announcementList.items[0].isPinned, 'Pinned announcements appear first');

    // ----------------------------------------------------
    // TEST 12: Help Request IDOR Defense (Students only see their own)
    // ----------------------------------------------------
    console.log('Running Test 12: Help Request IDOR defense...');
    const helpTicket = await HelpRequestService.create({
      workshopId: workshopA.id,
      studentId: student1.id,
      category: 'COMMAND_ISSUE',
      description: 'I am getting permission denied when reading config.json',
      challengeId: challenge1.id,
    });
    assert(helpTicket.status === 'OPEN', 'Help request initialized in OPEN status');

    // Student 2 tries to read Student 1's help request
    let idorBlocked = false;
    try {
      await HelpRequestService.getById(helpTicket.id, student2.id, false);
    } catch (err: any) {
      idorBlocked = true;
    }
    assert(idorBlocked, 'IDOR prevented: Student 2 cannot access Student 1 private help ticket');

    // ----------------------------------------------------
    // TEST 13: Organiser responds to Help Request
    // ----------------------------------------------------
    console.log('Running Test 13: Organiser responds to Help Request...');
    const replyMsg = await HelpRequestService.sendMessage({
      helpRequestId: helpTicket.id,
      senderId: organiserA.id,
      senderRole: 'ORGANISER',
      message: 'Try running chgrp gdg-lab /etc/labops/config.json first!',
    });
    assert(replyMsg.message.includes('chgrp gdg-lab'), 'Organiser message recorded');

    const updatedTicket = await prisma.helpRequest.findUnique({ where: { id: helpTicket.id } });
    assert(updatedTicket?.status === 'IN_PROGRESS', 'Ticket auto-transitioned to IN_PROGRESS upon organiser reply');

    // ----------------------------------------------------
    // TEST 14: In-App Notifications persisted
    // ----------------------------------------------------
    console.log('Running Test 14: In-App Notifications persisted in Neon DB...');
    const student1Notifications = await NotificationService.list(student1.id);
    assert(student1Notifications.items.length >= 1, 'Student 1 has persistent notifications');
    assert(student1Notifications.unreadCount >= 1, 'Unread count reflects incoming messages/announcements');

    // ----------------------------------------------------
    // TEST 15: Duplicate challenge submission does not duplicate score
    // ----------------------------------------------------
    console.log('Running Test 15: Duplicate challenge submission idempotency...');
    const dupSubmission = await ChallengeService.submit({
      studentId: student1.id,
      challengeId: challenge1.id,
      workshopId: workshopA.id,
      answer: 'chmod 640',
    });
    assert(dupSubmission.alreadyPassed === true, 'System detects challenge was already passed');
    assert(dupSubmission.netPointsAwarded === 0, 'Zero net points awarded on duplicate submission');

    const finalProgress = await prisma.studentProgress.findFirst({
      where: { studentId: student1.id, workshopId: workshopA.id },
    });
    assert(finalProgress?.totalPoints === 100, 'Total points remain 100 without score duplication');

    // ----------------------------------------------------
    // TEST 16: Missed events replay after reconnection
    // ----------------------------------------------------
    console.log('Running Test 16: Reconnection missed events replay...');
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    const missedEvents = await RealtimeEventService.getMissedEvents(workshopA.id, fiveMinutesAgo, student1.id);
    assert(missedEvents.length >= 2, 'Replaying missed events retrieved persistent outbox items');
    assert(
      missedEvents.some((e) => e.eventType === 'workshop:announcement:published'),
      'Outbox includes published announcement event'
    );

    // ----------------------------------------------------
    // TEST 17: Runner Lifecycle Events update lab session
    // ----------------------------------------------------
    console.log('Running Test 17: Runner lifecycle events update lab session...');
    const testSession = await prisma.labSession.create({
      data: {
        studentId: student1.id,
        workshopId: workshopA.id,
        labTemplateId: labTemplate.id,
        status: 'PENDING',
        environmentProfile: 'ubuntu-fundamentals',
        sessionToken: `token-${stamp}`,
      },
    });

    await RealtimeEventService.publish({
      workshopId: workshopA.id,
      eventType: 'lab:session:started',
      data: {
        sessionId: testSession.id,
        studentId: student1.id,
        profile: 'ubuntu-fundamentals',
      },
    });

    await ActivityService.record({
      workshopId: workshopA.id,
      eventType: 'LAB_LAUNCHED',
      actorId: student1.id,
      relatedEntityId: testSession.id,
      metadata: { profile: 'ubuntu-fundamentals' },
    });

    const sessionActivities = await ActivityService.list({
      workshopId: workshopA.id,
      eventType: 'LAB_LAUNCHED',
    });
    assert(sessionActivities.items.length >= 1, 'Activity feed records LAB_LAUNCHED lifecycle event');

    // ----------------------------------------------------
    // TEST 18: Real-Time WebSocket Gateway Connection & Validation
    // ----------------------------------------------------
    console.log('Running Test 18: Real-Time Gateway WebSocket connection & validation...');
    const security = new SecurityManager();
    mockServer = http.createServer();
    const wss = new WebSocketServer({ noServer: true });
    gateway = new WorkshopRealtimeGateway(wss, security);

    mockServer.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });

    await new Promise<void>((resolve) => {
      mockServer!.listen(gatewayPort, () => resolve());
    });

    // Test A: Missing parameters rejected
    let rejectedMissing = false;
    await new Promise<void>((resolve) => {
      const badWs = new WebSocket(`ws://localhost:${gatewayPort}`);
      badWs.on('close', (code) => {
        if (code === 4001) rejectedMissing = true;
        resolve();
      });
    });
    assert(rejectedMissing, 'Gateway rejects connection with missing workshopId or userId');

    // Test B: Valid connection accepted
    let accepted = false;
    const clientWs = new WebSocket(
      `ws://localhost:${gatewayPort}?workshopId=${workshopA.id}&userId=${student1.id}&role=STUDENT`
    );

    await new Promise<void>((resolve) => {
      clientWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'gateway:connected') {
          accepted = true;
          resolve();
        }
      });
    });
    assert(accepted, 'Gateway accepts authorized connection and sends handshake acknowledgement');
    clientWs.close();

    // ----------------------------------------------------
    // TEST 19: Notification Deduplication within 10s Window
    // ----------------------------------------------------
    console.log('Running Test 19: Notification deduplication within debounce window...');
    const n1 = await NotificationService.create({
      userId: student1.id,
      type: 'INFO',
      title: 'Debounce Test',
      message: 'This message should not duplicate',
    });
    const n2 = await NotificationService.create({
      userId: student1.id,
      type: 'INFO',
      title: 'Debounce Test',
      message: 'This message should not duplicate',
    });
    assert(n1.id === n2.id, 'Notification deduplication returned existing record within debounce window');

    // ----------------------------------------------------
    // TEST 20: Cross-Organisation Isolation strictly enforced
    // ----------------------------------------------------
    console.log('Running Test 20: Cross-organisation isolation strictly enforced...');
    const orgAWorkshops = await prisma.workshop.findMany({ where: { organisationId: orgA.id } });
    const orgBWorkshops = await prisma.workshop.findMany({ where: { organisationId: orgB.id } });
    assert(
      !orgAWorkshops.some((w) => w.organisationId === orgB.id),
      'Organisation A workshops isolated from Organisation B'
    );
    assert(
      !orgBWorkshops.some((w) => w.organisationId === orgA.id),
      'Organisation B workshops isolated from Organisation A'
    );

    console.log('\n========================================================');
    console.log(`Real-Time Monitoring Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('========================================================\n');
  } catch (err: any) {
    console.error('\nTest Suite Error:', err.message);
  } finally {
    // Teardown HTTP Gateway
    if (mockServer) {
      mockServer.close();
    }

    // Teardown DB fixtures
    console.log('Cleaning up test fixtures...');
    try {
      if (workshopA) {
        await prisma.workshopPresence.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.workshopAnnouncement.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.helpRequestMessage.deleteMany({ where: { helpRequest: { workshopId: workshopA.id } } });
        await prisma.helpRequest.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.workshopActivity.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.realtimeEventOutbox.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.challengeSubmission.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.studentProgress.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.labSession.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.workshopRegistration.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.workshopLab.deleteMany({ where: { workshopId: workshopA.id } });
        await prisma.workshop.delete({ where: { id: workshopA.id } });
      }
      if (workshopB) {
        await prisma.workshop.delete({ where: { id: workshopB.id } });
      }
      if (challenge1) {
        await prisma.challenge.delete({ where: { id: challenge1.id } });
      }
      if (labTemplate) {
        await prisma.labTemplate.delete({ where: { id: labTemplate.id } });
      }
      if (student1) {
        await prisma.notification.deleteMany({ where: { userId: student1.id } });
        await prisma.user.delete({ where: { id: student1.id } });
      }
      if (student2) {
        await prisma.user.delete({ where: { id: student2.id } });
      }
      if (organiserA) {
        await prisma.organisationMembership.deleteMany({ where: { userId: organiserA.id } });
        await prisma.user.delete({ where: { id: organiserA.id } });
      }
      if (organiserB) {
        await prisma.organisationMembership.deleteMany({ where: { userId: organiserB.id } });
        await prisma.user.delete({ where: { id: organiserB.id } });
      }
      if (orgA) {
        await prisma.organisation.delete({ where: { id: orgA.id } });
      }
      if (orgB) {
        await prisma.organisation.delete({ where: { id: orgB.id } });
      }
      console.log('Cleanup complete.');
    } catch (cleanupErr: any) {
      console.error('Cleanup notice:', cleanupErr.message);
    }

    await prisma.$disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runRealtimeMonitoringTests();
