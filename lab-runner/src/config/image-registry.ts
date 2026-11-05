/**
 * GDG LabOps - Execution Plane Approved Image Registry
 *
 * Immutable mapping of trusted container profiles to their exact tags,
 * resource constraints, and security isolation profiles.
 */

export interface ResourceLimits {
  nanoCpus: number;       // e.g. 1_000_000_000 = 1.0 vCPU
  memoryMb: number;       // Memory limit in MB
  memorySwapMb: number;   // -1 or equal to memoryMb
  pidsLimit: number;      // Maximum process count
  tmpfsSizeMb: number;    // Ephemeral tmpfs mount size
  maxDurationMinutes: number; // Hard cap on session runtime
  idleTimeoutMinutes: number; // Idle termination trigger
}

export interface SecurityProfile {
  user: string;           // Non-root UID:GID
  capDrop: string[];      // Linux capabilities dropped
  capAdd: string[];       // Safe capabilities permitted
  noNewPrivileges: boolean;
  networkMode: 'none' | 'bridge';
  readOnlyRootFilesystem: boolean;
  tmpfsMounts: Record<string, string>;
}

export interface ApprovedImageProfile {
  id: string;
  name: string;
  description: string;
  domain: string;
  imageTag: string;
  entrypointShell: string;
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
      nanoCpus: 1_000_000_000,
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
      nanoCpus: 1_000_000_000,
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
      nanoCpus: 1_000_000_000,
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
      nanoCpus: 500_000_000,
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
      nanoCpus: 1_000_000_000,
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
      networkMode: 'none',
      readOnlyRootFilesystem: false,
      tmpfsMounts: {
        '/tmp': 'rw,noexec,nosuid,nodev,size=64m',
      },
    },
  },
};

export function getApprovedImageProfile(profileId?: string | null): ApprovedImageProfile {
  if (!profileId || !APPROVED_IMAGE_REGISTRY[profileId]) {
    return APPROVED_IMAGE_REGISTRY['ubuntu-fundamentals'];
  }
  return APPROVED_IMAGE_REGISTRY[profileId];
}
