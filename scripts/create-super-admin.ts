import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (arg) return arg.slice(prefix.length);

  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx < process.argv.length - 1) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  console.log('========================================================');
  console.log('🔐 GDG LabOps — Super Administrator Provisioning CLI');
  console.log('========================================================\n');

  const email = (getArg('email') || process.env.ADMIN_INITIAL_EMAIL || 'admin@gdgcampus.dev').toLowerCase().trim();
  const name = getArg('name') || process.env.ADMIN_INITIAL_NAME || 'Super Administrator';
  const password = getArg('password') || process.env.ADMIN_INITIAL_PASSWORD || 'Admin@SecurePass2026!';

  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid --email is required.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });
    console.log(`✅ Existing user "${updated.email}" successfully promoted to SUPER_ADMIN.`);
    console.log(`User ID: ${updated.id}`);
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`✅ New Super Administrator account successfully created.`);
    console.log(`Email:   ${created.email}`);
    console.log(`User ID: ${created.id}`);
  }

  console.log('\nCredentials are now ready for login at /login.');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Provisioning error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
