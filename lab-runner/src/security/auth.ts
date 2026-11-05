import crypto from 'crypto';

export interface TerminalTicketPayload {
  sessionId: string;
  studentId: string;
  workshopId: string;
  profileId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export class SecurityManager {
  private secret: string;
  private usedNonces: Set<string> = new Set();

  constructor(secret?: string) {
    this.secret = secret || process.env.WORKER_DAEMON_SECRET || 'gdg-labops-daemon-hmac-shared-cluster-key';
  }

  /**
   * Validate incoming Control Plane Bearer Secret
   */
  public validateDaemonAuth(authorizationHeader?: string): boolean {
    if (!authorizationHeader) return false;
    const parts = authorizationHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return false;
    }
    const token = parts[1];
    // Timing-safe comparison to prevent timing attacks
    return this.timingSafeEqual(token, this.secret);
  }

  /**
   * Create a signed single-use connection ticket (Control Plane can generate this directly or via this method)
   */
  public generateTicket(
    sessionId: string,
    studentId: string,
    workshopId: string,
    profileId: string,
    ttlSeconds: number = 300 // 5 minutes validity
  ): string {
    const payload: TerminalTicketPayload = {
      sessionId,
      studentId,
      workshopId,
      profileId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verify an incoming terminal connection ticket
   */
  public verifyTicket(ticketString: string): TerminalTicketPayload | null {
    if (!ticketString || typeof ticketString !== 'string') return null;

    const parts = ticketString.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, receivedSignature] = parts;

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');

    if (!this.timingSafeEqual(receivedSignature, expectedSignature)) {
      return null;
    }

    try {
      const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const payload: TerminalTicketPayload = JSON.parse(decodedJson);

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return null;
      }

      // Check replay attack via nonce
      if (this.usedNonces.has(payload.nonce)) {
        return null;
      }

      // Mark nonce as used
      this.usedNonces.add(payload.nonce);

      // Prune used nonces cache occasionally
      if (this.usedNonces.size > 10000) {
        this.usedNonces.clear();
      }

      return payload;
    } catch {
      return null;
    }
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
