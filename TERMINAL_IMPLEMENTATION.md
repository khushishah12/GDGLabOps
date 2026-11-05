# GDG LabOps – Browser Terminal & WebSocket Gateway

## 1. Overview

GDG LabOps provides a browser-based, interactive terminal emulator that connects directly to remote container execution nodes. This document details the WebSocket communication protocol, cryptographic authentication, PTY attachment, and terminal resizing mechanics.

---

## 2. Cryptographic Ticket Protocol

To ensure secure connection initiation without exposing long-lived user credentials or database tokens to the WebSocket gateway:
1. When a student navigates to a running lab session, the Next.js Control Plane checks their active session status and generates a short-lived **Terminal Connection Ticket**:
   ```typescript
   interface TerminalTicketPayload {
     sessionId: string;
     studentId: string;
     workshopId: string;
     profileId: string;
     issuedAt: number;
     expiresAt: number; // Current time + 300s (5 minutes)
     nonce: string;     // 16-byte random hex string
   }
   ```
2. The payload is JSON-serialized, base64url-encoded, and signed using HMAC-SHA256 with the shared cluster secret (`WORKER_DAEMON_SECRET`):
   ```
   ticket = base64url(payload) + "." + hmacSha256(base64url(payload), secret)
   ```
3. The browser initiates a WebSocket connection:
   ```
   wss://runner.labops.gdg.community/ws/terminal?ticket=<TICKET>
   ```
4. **Gateway Verification**:
   - The gateway validates the HMAC signature using constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
   - It checks `expiresAt` against `Date.now()`.
   - It checks the `nonce` against an in-memory cache of used nonces. If the nonce was already used, the connection is immediately rejected (preventing replay attacks).

---

## 3. Streaming Protocol & Message Types

Once authenticated, the WebSocket connection operates in bidirectional streaming mode:

### 3.1 Downstream (Container -> Browser)
- Raw binary or UTF-8 chunks emitted from the container's pseudo-terminal (PTY) stdout/stderr are forwarded directly over the WebSocket.
- The browser terminal emulator (xterm.js) renders ANSI escape sequences, colors, cursor positions, and line wrapping.

### 3.2 Upstream (Browser -> Container)
- **Raw Keystrokes & Input**: Standard keyboard inputs, control characters (`Ctrl+C`, `Ctrl+D`, `Backspace`), and command strings are written directly to the container's stdin stream.
- **Control Packets**: JSON-formatted control messages:
  - **Dynamic PTY Resize**:
    ```json
    {
      "type": "resize",
      "cols": 120,
      "rows": 32
    }
    ```
    The gateway invokes `pty.resize(cols, rows)` on the Docker exec instance, ensuring text-based programs (like `vim`, `nano`, `htop`, `less`) render accurately to the student's browser viewport.
  - **Ping / Keepalive**:
    ```json
    { "type": "ping" }
    ```
    The gateway replies with `{ "type": "pong", "timestamp": 1730825000000 }`.

---

## 4. Disconnect Handling & Reconnection

- When the browser disconnects (network interruption, tab refresh), the container **remains running** until its hard duration cap or idle timeout is reached.
- The student can refresh the tab or click "Resume Cloud Terminal"; the Control Plane issues a fresh ticket and reconnects the terminal to the existing container without losing session state or files.
