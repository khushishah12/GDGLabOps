# GDG LabOps — Neon PostgreSQL & Environment Setup Guide

This guide walks you through provisioning your serverless PostgreSQL database on **Neon**, configuring local environment variables, running migrations, seeding demo workshop data, and testing your setup.

---

## 1. Prerequisites

Before starting, ensure you have:
- **Node.js**: v18.18+ or v20+ / v22+ (`node -v`)
- **Package Manager**: npm v9+ or pnpm v9+
- A free account on [Neon.tech](https://neon.tech)

---

## 2. Setting Up Your Neon PostgreSQL Database

### Step 2.1: Create a Neon Project
1. Log in to the [Neon Console](https://console.neon.tech).
2. Click **Create Project**.
3. Name your project (e.g. `gdg-labops-production` or `gdg-labops-dev`).
4. Select PostgreSQL version **15** or **16**.
5. Choose your primary cloud region (e.g., `AWS us-east-2`, `AWS eu-central-1`).
6. Click **Create Project**. Neon creates a default database named `neondb` and an owner role.

---

### Step 2.2: Obtain Both Connection Strings

Prisma requires two connection strings when working with Neon:
1. **Pooled Connection (`DATABASE_URL`)**: Uses PgBouncer for low-latency serverless queries without exhausting connection limits.
2. **Direct Connection (`DIRECT_URL`)**: Connects directly to the compute instance for migrations and DDL operations.

#### How to copy them from the Neon Dashboard:
1. Navigate to your project **Dashboard** or **Connection Details** card.
2. In the dropdown, select **Prisma**.
3. Neon will automatically show you both connection strings:

```env
# 1. Pooled Connection (Notice "-pooler" in host and "?sslmode=require&pgbouncer=true")
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# 2. Direct Connection (No "-pooler", no "pgbouncer=true")
DIRECT_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## 3. Configuring Local Environment Variables

1. In the root of the `GDGLABOPS` workspace, create a `.env` file from `.env.example`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux / macOS / Bash
cp .env.example .env
```

2. Open `.env` in your editor and insert your actual credentials:

```dotenv
# ========================================================
# GDG LabOps – Active Environment Variables
# ========================================================

# Neon Pooled Connection
DATABASE_URL="postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-YOUR-PROJECT-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# Neon Direct Connection (for Prisma Migrate)
DIRECT_URL="postgresql://neondb_owner:YOUR_SECRET_PASSWORD@ep-YOUR-PROJECT.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Next.js Environment & Security
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-random-32-byte-hex-or-base64-string"
NEXTAUTH_URL="http://localhost:3000"

# Execution Plane Daemon Integration (For future phase)
WORKER_DAEMON_SECRET="gdg-labops-daemon-hmac-shared-cluster-key"
```

> [!NOTE]
> `.env` is listed in `.gitignore` and must never be committed to Git.

---

## 4. Running Migrations and Generating Prisma Client

Once `.env` is configured with valid Neon credentials:

### Step 4.1: Generate Prisma Client
Generates TypeScript types from your schema into `node_modules/@prisma/client`:
```bash
npm run prisma:generate
```

### Step 4.2: Apply Migrations to Neon
Apply the initial schema to your remote Neon PostgreSQL database:
```bash
npx prisma migrate dev --name init_gdg_labops_schema
```
Or for non-interactive CI / production environments:
```bash
npx prisma migrate deploy
```

### Step 4.3: (Optional) Inspect with Prisma Studio
Open a browser-based GUI to visually inspect your tables and records:
```bash
npx prisma studio
```
Access Prisma Studio at `http://localhost:5555`.

---

## 5. Seeding Demo Workshop Data & Accounts

We provide an idempotent seed script that populates realistic developer workshops, lab blueprints, structured challenge tasks, and student accounts.

Run the seed script:
```bash
npm run prisma:seed
```

### Preconfigured Demo Accounts:
After running the seeder, the following test accounts are ready for immediate login:

| Role | Email | Password | Portal Landing |
| :--- | :--- | :--- | :--- |
| **Organiser** | `alex.rivera@gdgcampus.dev` | `Organiser@Pass2026!` | `/dashboard/overview` |
| **Student** | `elena.rostova@student.gdg.dev` | `Student@Pass2026!` | `/student/overview` |
| **Student** | `marcus.chen@student.gdg.dev` | `Student@Pass2026!` | `/student/overview` |
| **Student** | `aisha.patel@student.gdg.dev` | `Student@Pass2026!` | `/student/overview` |

---

## 6. Provisioning the Initial Super Administrator

Super Admin privileges cannot be assigned through the registration form. Use the trusted server-side provisioning script:

```bash
npx tsx --env-file=.env scripts/create-super-admin.ts --name="Super Admin" --email="admin@gdgcampus.dev" --password="Admin@SecurePass2026!"
```

The script will automatically hash the password with bcrypt (12 salt rounds) and activate the account with `Role.SUPER_ADMIN`.

---

## 7. Running Backend & Authentication Test Suites

Run the test suites to verify system integrity:

### 1. Database & Schema Invariant Tests:
```bash
npx tsx scripts/test-backend.ts
```

### 2. Authentication, Rate Limiting & RBAC Tests:
```bash
npx tsx scripts/test-auth.ts
```
Expected output: **34 passed, 0 failed** across password hashing, brute-force rate limits, registration validation, and multi-tenant IDOR checks.

---

## 8. Starting the Next.js Platform

Start the development server:
```bash
npm run dev
```

Open your browser to:
- **Organiser Dashboard**: [http://localhost:3000/dashboard/overview](http://localhost:3000/dashboard/overview)
- **Workshops Catalog**: [http://localhost:3000/dashboard/workshops](http://localhost:3000/dashboard/workshops)
- **Student Explore & Registration**: [http://localhost:3000/student/explore](http://localhost:3000/student/explore)
- **Student Learning Hub**: [http://localhost:3000/student/overview](http://localhost:3000/student/overview)

---

## 8. Troubleshooting & FAQ

### Issue: `P1001: Can't reach database server at ...-pooler.neon.tech`
- **Cause**: Network restriction or expired Neon compute.
- **Solution**: Check your internet connection. Neon databases wake up automatically on connection, but verify in your Neon console that the project status is **Active**.

### Issue: `P2025: An operation failed because it depends on one or more records that were required but not found`
- **Cause**: Attempting to create a dependent record (like a Workshop) before its parent Organisation or User exists.
- **Solution**: Run `npm run prisma:seed` to ensure base records exist.

### Issue: Migrations fail with `prepared statement "s0" already exists`
- **Cause**: Running `prisma migrate` through a PgBouncer connection (`DATABASE_URL`).
- **Solution**: Ensure your `DIRECT_URL` is set to the unpooled endpoint (no `-pooler` in hostname and without `pgbouncer=true`). Prisma automatically routes migration commands through `DIRECT_URL`.
