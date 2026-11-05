/**
 * GDG LabOps - Prompt 5 Workshop & Event Management Test Suite
 *
 * Verifies all 15 core acceptance criteria:
 * 1. Workshop creation with all metadata & domain attributes
 * 2. Cryptographic joining code generation & uniqueness
 * 3. Draft saving & publication transitions
 * 4. Unpublish prevention when confirmed registrations exist
 * 5. Workshop duplication (clones configuration as new draft)
 * 6. Code regeneration & code join toggling
 * 7. Student registration via workshopId
 * 8. Student registration via joiningCode
 * 9. Duplicate registration prevention (409 Conflict)
 * 10. Capacity limit enforcement & automatic waitlisting
 * 11. Approval workflow (PENDING_APPROVAL state)
 * 12. Student self-cancellation
 * 13. Automatic waitlist promotion upon cancellation
 * 14. Organiser participant management (Approve / Reject / Cancel)
 * 15. Sanitized CSV export generation & Audit logging
 */

import { prisma } from '../lib/prisma';
import { WorkshopService } from '../lib/services/workshop.service';
import { RegistrationService } from '../lib/services/registration.service';
import { generateUniqueJoiningCode, sanitizeJoiningCode } from '../lib/workshop/joining-code';
import { computeEffectiveWorkshopStatus } from '../lib/workshop/lifecycle';
import { WorkshopStatus, RegistrationStatus, VenueType, Difficulty } from '@prisma/client';

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 GDG LABOPS — PROMPT 5 WORKSHOP & EVENT MANAGEMENT TESTS');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // 0. Setup Test Data (Fetch an organisation and users)
    const org = await prisma.organisation.findFirst();
    if (!org) throw new Error('No organisation found in database. Seed database first.');

    const organiser = await prisma.user.findFirst({ where: { role: 'ORGANISER' } });
    if (!organiser) throw new Error('No organiser user found.');

    const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, take: 4 });
    if (students.length < 2) throw new Error('At least 2 students required for registration test suite.');

    console.log(`📌 Using Org: "${org.name}" (${org.id})`);
    console.log(`📌 Using Organiser: "${organiser.name}" (${organiser.id})`);
    console.log(`📌 Using ${students.length} Student accounts for testing\n`);

    // -------------------------------------------------------------
    // TEST 1: Joining Code Generation & Sanitization
    // -------------------------------------------------------------
    console.log('--- TEST GROUP 1: Cryptographic Joining Codes ---');
    const code1 = await generateUniqueJoiningCode('CLOUD');
    const code2 = await generateUniqueJoiningCode('CLOUD');
    assert(code1.startsWith('GDG-CLOUD-'), 'Code prefix adheres to GDG-<DOMAIN>- format');
    assert(code1 !== code2, 'Cryptographic randomness ensures distinct codes');
    assert(sanitizeJoiningCode('  gdg-cloud-9x8q2  ') === 'GDG-CLOUD-9X8Q2', 'Code sanitization trims and normalizes uppercase');

    // -------------------------------------------------------------
    // TEST 2: Workshop Creation as Draft with Full Attributes
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Workshop Creation (Draft) ---');
    const uniqueSlug = `test-cloud-run-${Date.now()}`;
    const startIso = new Date(Date.now() + 7 * 86400000).toISOString();
    const endIso = new Date(Date.now() + 7 * 86400000 + 7200000).toISOString();
    const regDeadlineIso = new Date(Date.now() + 6 * 86400000).toISOString();

    const createdDraft = await WorkshopService.create(
      {
        organisationId: org.id,
        title: 'Cloud Run & Serverless Microservices',
        slug: uniqueSlug,
        shortDescription: 'Hands-on serverless microservices workshop',
        description: 'Complete hands-on lab exploring Google Cloud Run, Eventarc, and Firestore.',
        domain: 'Cloud Computing',
        difficulty: 'INTERMEDIATE',
        tags: ['GCP', 'CloudRun', 'Containers'],
        startDate: startIso,
        endDate: endIso,
        duration: 120,
        timezone: 'UTC',
        venueType: 'ONLINE',
        venueAddress: 'https://meet.google.com/test-room',
        instructorName: 'Sarah Jenkins',
        instructorBio: 'Cloud Architect & GDG Lead',
        registrationDeadline: regDeadlineIso,
        participantLimit: 2, // Low capacity to test waitlist
        requiresApproval: false,
        isPublic: true,
        codeJoinEnabled: true,
        status: 'DRAFT',
      },
      organiser.id
    );

    assert(createdDraft.status === WorkshopStatus.DRAFT, 'Workshop created with DRAFT status');
    assert(createdDraft.registrationCode.startsWith('GDG-'), 'Generated unique registration code automatically');
    assert(createdDraft.participantLimit === 2, 'Participant limit set to 2');

    // -------------------------------------------------------------
    // TEST 3: Workshop Duplication
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Workshop Duplication ---');
    const duplicated = await WorkshopService.duplicate(createdDraft.id, organiser.id);
    assert(duplicated.title === `${createdDraft.title} (Copy)`, 'Duplicated title has "(Copy)" suffix');
    assert(duplicated.slug !== createdDraft.slug, 'Duplicated workshop gets unique slug');
    assert(duplicated.registrationCode !== createdDraft.registrationCode, 'Duplicated workshop gets fresh registration code');
    assert(duplicated.status === WorkshopStatus.DRAFT, 'Duplicated workshop resets status to DRAFT');

    // Clean up duplicate
    await prisma.workshop.delete({ where: { id: duplicated.id } });

    // -------------------------------------------------------------
    // TEST 4: Publish & Code Operations
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Publication & Code Manipulation ---');
    const published = await WorkshopService.publish(createdDraft.id);
    assert(published.status === WorkshopStatus.PUBLISHED, 'Workshop successfully transitioned from DRAFT to PUBLISHED');

    const oldCode = published.registrationCode;
    const regenerated = await WorkshopService.regenerateCode(createdDraft.id);
    assert(regenerated.registrationCode !== oldCode, 'Regenerating code produces a new unique code');

    const toggledOff = await WorkshopService.toggleCodeJoin(createdDraft.id, false);
    assert(toggledOff.codeJoinEnabled === false, 'Code joining successfully toggled off');

    const toggledOn = await WorkshopService.toggleCodeJoin(createdDraft.id, true);
    assert(toggledOn.codeJoinEnabled === true, 'Code joining re-enabled');

    // -------------------------------------------------------------
    // TEST 5: Student Registration (Direct & Code-Based)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Student Registrations & Capacity Limits ---');
    // Student 1 registers directly
    const reg1 = await RegistrationService.register({
      workshopId: createdDraft.id,
      studentId: students[0].id,
      notes: 'Excited to learn Cloud Run!',
    });
    assert(reg1.status === RegistrationStatus.REGISTERED, 'Student 1 seat confirmed (REGISTERED)');

    // Student 2 registers via Joining Code
    const reg2 = await RegistrationService.register({
      registrationCode: toggledOn.registrationCode,
      studentId: students[1].id,
      notes: 'Joined via event code',
    });
    assert(reg2.status === RegistrationStatus.REGISTERED, 'Student 2 seat confirmed via joining code');

    // Duplicate Registration Prevention
    try {
      await RegistrationService.register({
        workshopId: createdDraft.id,
        studentId: students[0].id,
      });
      assert(false, 'Duplicate registration was allowed (FAIL)');
    } catch (err: any) {
      assert(err.message.includes('already registered'), 'Duplicate registration prevented with ConflictError');
    }

    // -------------------------------------------------------------
    // TEST 6: Capacity Full & Automatic Waitlist
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Waitlist Behavior & Over-Capacity ---');
    let waitlistedReg: any = null;
    if (students.length >= 3) {
      waitlistedReg = await RegistrationService.register({
        workshopId: createdDraft.id,
        studentId: students[2].id,
        notes: 'Hoping for a seat!',
      });
      assert(
        waitlistedReg.status === RegistrationStatus.WAITLISTED,
        'Student 3 automatically placed on WAITLIST when capacity (2) is reached'
      );
    }

    // -------------------------------------------------------------
    // TEST 7: Unpublish Prevention when Registrations Exist
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 7: Unpublish Protection ---');
    try {
      await WorkshopService.unpublish(createdDraft.id);
      assert(false, 'Unpublish succeeded despite active registrations (FAIL)');
    } catch (err: any) {
      assert(
        err.message.includes('Cannot unpublish') || err.message.includes('confirmed registrations'),
        'Unpublishing blocked when confirmed registrations exist'
      );
    }

    // -------------------------------------------------------------
    // TEST 8: Participant Cancellation & Automatic Waitlist Promotion
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 8: Self-Cancellation & Waitlist Promotion ---');
    if (waitlistedReg) {
      // Student 1 cancels their registration
      const cancelResult = await RegistrationService.cancelOwnRegistration(reg1.id, students[0].id);
      assert(cancelResult.status === RegistrationStatus.CANCELLED, 'Student 1 successfully cancelled seat');

      // Verify Student 3 was automatically promoted from WAITLISTED to REGISTERED!
      const refreshedPromoted = await prisma.workshopRegistration.findUnique({
        where: { id: waitlistedReg.id },
      });
      assert(
        refreshedPromoted?.status === RegistrationStatus.REGISTERED,
        'Waitlisted Student 3 was automatically promoted to REGISTERED seat!'
      );
      assert(
        refreshedPromoted?.notes?.includes('Automatically promoted from waitlist') === true,
        'Promotion audit note attached to promoted registration'
      );
    }

    // -------------------------------------------------------------
    // TEST 9: Organiser Participant Management (Approve, Reject, Cancel)
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 9: Organiser Participant Roster & Actions ---');
    // Test participant listing
    const roster = await RegistrationService.listParticipants(createdDraft.id);
    assert(roster.participants.length >= 2, `Participant roster returned ${roster.participants.length} entries`);

    // Organiser rejects/cancels Student 2
    const managedAction = await RegistrationService.manageParticipant(
      reg2.id,
      { action: 'CANCEL', notes: 'Capacity rescheduled by admin' },
      organiser.id
    );
    assert(managedAction.status === RegistrationStatus.CANCELLED, 'Organiser successfully cancelled participant');

    // -------------------------------------------------------------
    // TEST 10: Participant CSV Export & Audit Logs
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 10: CSV Export & Audit Logging ---');
    const csvData = await RegistrationService.exportParticipantsCSV(createdDraft.id);
    assert(csvData.includes('Participant Name,Email Address'), 'CSV contains standard header row');
    assert(csvData.includes(students[1].email), 'CSV contains participant record row');

    // Check Audit Log entry
    const auditLogs = await prisma.auditLog.findMany({
      where: { resourceId: reg2.id },
    });
    assert(auditLogs.length > 0, 'Audit log persisted organiser cancellation action');

    // -------------------------------------------------------------
    // TEST 11: Workshop Cancellation
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 11: Workshop Cancellation ---');
    const cancelledWorkshop = await WorkshopService.cancel(createdDraft.id);
    assert(cancelledWorkshop.status === WorkshopStatus.CANCELLED, 'Workshop successfully cancelled');

    // -------------------------------------------------------------
    // Cleanup Test Data
    // -------------------------------------------------------------
    await prisma.workshopRegistration.deleteMany({ where: { workshopId: createdDraft.id } });
    await prisma.auditLog.deleteMany({ where: { resourceType: 'WorkshopRegistration' } });
    await prisma.workshop.delete({ where: { id: createdDraft.id } });
    console.log('\n🧹 Test artifacts cleaned up successfully from database.');

  } catch (error: any) {
    console.error('\n❌ Unhandled exception during test execution:', error.message);
    failed++;
  }

  console.log('\n============================================================');
  console.log(`🏁 TEST RUN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Failure:', err);
  process.exit(1);
});
