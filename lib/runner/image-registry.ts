/**
 * GDG LabOps - Approved Lab Image Registry & Security Profiles
 *
 * Enforces strict whitelist-only container configurations.
 * Neither students nor organisers can supply arbitrary Docker images
 * or modify low-level container security capabilities.
 */

export interface ResourceLimits {
  nanoCpus: number;       // e.g. 1_000_000_000 = 1.0 vCPU, 500_000_000 = 0.5 vCPU
  memoryMb: number;       // In Megabytes
  memorySwapMb: number;   // -1 to disable swap or equal to memoryMb to prevent swap abuse
  pidsLimit: number;      // Maximum number of simultaneous processes
  tmpfsSizeMb: number;    // Ephemeral tmpfs mount size
  maxDurationMinutes: number; // Hard lease time limit
  idleTimeoutMinutes: number; // Max duration without student terminal activity
}

export interface SecurityProfile {
  user: string;           // Non-root UID:GID e.g. "1000:1000" or "labuser"
  capDrop: string[];      // Linux capabilities to drop (e.g. ALL)
  capAdd: string[];       // Specific unprivileged capabilities allowed if needed
  noNewPrivileges: boolean;
  networkMode: 'none' | 'bridge';
  readOnlyRootFilesystem: boolean;
  tmpfsMounts: Record<string, string>; // e.g. { "/tmp": "rw,noexec,nosuid,size=64m" }
}

export interface ApprovedImageProfile {
  id: string;
  name: string;
  description: string;
  domain: string;
  imageTag: string;       // Docker image identifier (pinned)
  entrypointShell: string; // e.g. "/bin/bash" or "/bin/sh"
  workingDir: string;
  defaultLimits: ResourceLimits;
  security: SecurityProfile;
}

export const APPROVED_IMAGE_REGISTRY: Record<string, ApprovedImageProfile> = {
  'ubuntu-fundamentals': {
    id: 'ubuntu-fundamentals',
    name: 'Linux & Ubuntu Fundamentals',
    description: 'Standard Linux environment with bash, coreutils, curl, nano, and file management tools.',
    domain: 'Cloud / Linux / DevOps',
    imageTag: 'ubuntu:22.04',
    entrypointShell: '/bin/bash',
    workingDir: '/home/labuser',
    defaultLimits: {
      nanoCpus: 1_000_000_000, // 1 vCPU
      memoryMb: 512,
      memorySwapMb: 512,       // No additional swap
      pidsLimit: 64,
      tmpfsSizeMb: 64,
      maxDurationMinutes: 60,
      idleTimeoutMinutes: 15,
    },
    security: {
      user: '1000:1000',
      capDrop: ['ALL'],
      capAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
      noNewPrivileges: true,
      networkMode: 'bridge',
      readOnlyRootFilesystem: false,
      tmpfsMounts: {
        '/tmp': 'rw,nosuid,nodev,size=64m',
        '/run': 'rw,nosuid,nodev,size=16m',
      },
    },
  },

  'python-dev': {
    id: 'python-dev',
    name: 'Python Developer Environment',
    description: 'Python 3.11 interactive environment with pip, virtualenv, and standard developer tools.',
    domain: 'Software Engineering / AI',
    imageTag: 'python:3.11-slim',
    entrypointShell: '/bin/bash',
    workingDir: '/home/labuser',
    defaultLimits: {
      nanoCpus: 1_000_000_000, // 1 vCPU
      memoryMb: 768,
      memorySwapMb: 768,
      pidsLimit: 96,
      tmpfsSizeMb: 128,
      maxDurationMinutes: 90,
      idleTimeoutMinutes: 20,
    },
    security: {
      user: '1000:1000',
      capDrop: ['ALL'],
      capAdd: ['CHOWN', 'SETUID', 'SETGID'],
      noNewPrivileges: true,
      networkMode: 'bridge',
      readOnlyRootFilesystem: false,
      tmpfsMounts: {
        '/tmp': 'rw,nosuid,nodev,size=128m',
        '/run': 'rw,nosuid,nodev,size=16m',
      },
    },
  },

  'node-dev': {
    id: 'node-dev',
    name: 'Node.js & JavaScript Workspace',
    description: 'Node.js 20 LTS runtime with npm, yarn, TypeScript, and modern JS utilities.',
    domain: 'Web Development / Cloud',
    imageTag: 'node:20-slim',
    entrypointShell: '/bin/bash',
    workingDir: '/home/node',
    defaultLimits: {
      nanoCpus: 1_000_000_000, // 1 vCPU
      memoryMb: 1024,
      memorySwapMb: 1024,
      pidsLimit: 128,
      tmpfsSizeMb: 128,
      maxDurationMinutes: 90,
      idleTimeoutMinutes: 20,
    },
    security: {
      user: '1000:1000',
      capDrop: ['ALL'],
      capAdd: ['CHOWN', 'SETUID', 'SETGID'],
      noNewPrivileges: true,
      networkMode: 'bridge',
      readOnlyRootFilesystem: false,
      tmpfsMounts: {
        '/tmp': 'rw,nosuid,nodev,size=128m',
        '/run': 'rw,nosuid,nodev,size=16m',
      },
    },
  },

  'git-lab': {
    id: 'git-lab',
    name: 'Git & Version Control Practice',
    description: 'Focused Git sandbox with git-cli, vim, nano, diff tools, and simulated remotes.',
    domain: 'DevOps / Open Source',
    imageTag: 'alpine/git:latest',
    entrypointShell: '/bin/sh',
    workingDir: '/home/labuser',
    defaultLimits: {
      nanoCpus: 500_000_000,  // 0.5 vCPU
      memoryMb: 256,
      memorySwapMb: 256,
      pidsLimit: 48,
      tmpfsSizeMb: 32,
      maxDurationMinutes: 60,
      idleTimeoutMinutes: 15,
    },
    security: {
      user: '1000:1000',
      capDrop: ['ALL'],
      capAdd: [],
      noNewPrivileges: true,
      networkMode: 'bridge',
      readOnlyRootFilesystem: false,
      tmpfsMounts: {
        '/tmp': 'rw,nosuid,nodev,size=32m',
      },
    },
  },

  'cyber-fundamentals': {
    id: 'cyber-fundamentals',
    name: 'Cybersecurity Fundamentals (Isolated)',
    description: 'Hardened, fully air-gapped Linux sandbox for secure forensics, crypto, and inspection tasks.',
    domain: 'Cybersecurity',
    imageTag: 'ubuntu:22.04',
    entrypointShell: '/bin/bash',
    workingDir: '/home/labuser',
    defaultLimits: {
      nanoCpus: 1_000_000_000, // 1 vCPU
      memoryMb: 512,
      memorySwapMb: 512,
      pidsLimit: 64,
      tmpfsSizeMb: 64,
      maxDurationMinutes: 60,
      idleTimeoutMinutes: 15,
    },
    security: {
      user: '1000:1000',
      capDrop: ['ALL'],
      capAdd: [],
      noNewPrivileges: true,
      networkMode: 'none', // Strictly air-gapped / no network interface
      readOnlyRootFilesystem: false,
      tmpfsMounts: {
        '/tmp': 'rw,noexec,nosuid,nodev,size=64m',
      },
    },
  },
};

/**
 * Validate that a requested environment profile is in the approved registry.
 * Throws an error or falls back to ubuntu-fundamentals.
 */
export function getApprovedImageProfile(profileId?: string | null): ApprovedImageProfile {
  if (!profileId || !APPROVED_IMAGE_REGISTRY[profileId]) {
    return APPROVED_IMAGE_REGISTRY['ubuntu-fundamentals'];
  }
  return APPROVED_IMAGE_REGISTRY[profileId];
}

/**
 * Validate profile ID strictly (returns boolean)
 */
export function isApprovedProfile(profileId: string): boolean {
  return Boolean(APPROVED_IMAGE_REGISTRY[profileId]);
}
