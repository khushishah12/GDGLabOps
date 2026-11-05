# GDG LabOps — Security Architecture & Threat Mitigations

> **Standard:** OWASP Top 10 & OWASP Authentication / Authorization Cheat Sheets  
> **Classification:** Production Developer Workshop Infrastructure  
> **Status:** Verified via Automated Security Test Suite  

---

## 1. Threat Model & Implemented Mitigations

| Threat Category | Potential Attack Vector | GDG LabOps Mitigation Strategy |
| :--- | :--- | :--- |
| **Broken Access Control** | Student attempts to access `/api/workshops` creation or modify another chapter's labs. | Enforced at data layer via [`lib/auth/rbac.ts`](file:///d:/projects/GDGLABOPS/lib/auth/rbac.ts). Independent server-side role check rejects students with `403 Forbidden`. |
| **Insecure Direct Object Reference (IDOR)** | Organiser A alters `organisationId` or `workshopId` in the URL/payload to edit Organiser B's workshop. | `requireOrganisationMembership()` and `requireWorkshopOwnership()` cross-reference session identity against relational foreign keys in PostgreSQL. Cross-tenant access is rejected. |
| **Privilege Escalation** | Attacker registers a new account and sends `role: "SUPER_ADMIN"` or `role: "ORGANISER"`. | Zod registration schema (`lib/validations/index.ts`) strictly rejects any non-STUDENT role. Super Admins can only be created via server CLI (`scripts/create-super-admin.ts`). |
| **Credential Stuffing & Brute Force** | High-velocity dictionary attacks against `/api/auth/[...nextauth]` credentials login. | Sliding-window rate limiter (`lib/auth/rate-limit.ts`) limits failed logins to **5 attempts per 15 minutes** per email/IP. Triggers `429 RATE_LIMITED` upon threshold breach. |
| **Account Enumeration** | Attacker probes `/api/auth/forgot-password` or `/api/auth/[...nextauth]` to harvest valid email addresses. | Generic error messages are returned across all endpoints: "Invalid email or password" and "If an account exists, instructions have been sent". |
| **Insecure Token Storage** | Storing raw password reset or email verification tokens in database tables. | Tokens are cryptographically generated (32 random bytes) and **only SHA-256 hashes** are persisted with strict 1-hour expiration limits. |
| **Session Theft / XSS** | Malicious third-party scripts reading JWT tokens from `localStorage` or `sessionStorage`. | Auth.js session cookies are configured with `HttpOnly: true`, making them completely inaccessible to client JavaScript. |
| **Cross-Site Request Forgery (CSRF)** | Unauthorized commands transmitted from a malicious website while user is logged in. | SameSite cookie policy set to `Lax` in conjunction with NextAuth double-submit CSRF tokens on state-changing requests. |
| **Remote Code Execution in Lab Challenges** | Untrusted users submitting arbitrary shell execution commands as challenge test rules. | Challenge tasks use strict predefined JSON assertion schemas (`FILE_EXISTS`, `PORT_LISTENING`, `PROCESS_STATUS`) — **no arbitrary shell scripts stored or executed from database**. |
| **Infrastructure Fingerprinting** | Internal Docker container IDs or host IP addresses exposed to students. | `containerReference` and host topology details are stripped from all student-facing API responses. |

---

## 2. Secure Administrator Provisioning

Super Administrator accounts **cannot be created through web forms or public APIs**.

### To create or promote a Super Administrator:
Execute the trusted server CLI script:
```bash
npx tsx --env-file=.env scripts/create-super-admin.ts --name="Admin Name" --email="admin@gdgcampus.dev" --password="YourSecurePassword@2026!"
```

### Safety Features:
- Does not store passwords in command history if passed via environment variables (`ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`).
- Automatically hashes passwords using 12 bcrypt salt rounds before writing to PostgreSQL.
- Idempotently promotes existing users without breaking referential integrity.
- Prevents Super Admins from suspending or revoking their own account to prevent lock-outs.

---

## 3. Known Limitations & Roadmap Enhancements

1. **In-Memory Rate Limiting**: The current rate limiter runs in-process memory. When horizontally scaling the Next.js control plane across multiple serverless Vercel nodes, rate limiting will be migrated to an external Redis / Upstash KV store.
2. **Multi-Factor Authentication (MFA)**: WebAuthn / Passkey support is planned for Prompt 7 to allow organisers and admins to authenticate with hardware security keys.
3. **Audit Logging Delivery**: Security events are currently logged locally; external syslog / Google Cloud Cloud Logging streaming will be integrated during production deployment.
