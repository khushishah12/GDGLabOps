import { EventEmitter } from 'events';
import { ApprovedImageProfile, ResourceLimits, SecurityProfile } from '../config/image-registry';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  profileId: string;
  status: 'created' | 'running' | 'stopping' | 'stopped' | 'exited';
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  limits: ResourceLimits;
  security: SecurityProfile;
  metrics: {
    cpuPercent: number;
    memoryUsageMb: number;
    pidsCount: number;
  };
}

export interface ContainerExecStream {
  stdin: EventEmitter & { write: (data: string | Buffer) => void };
  stdout: EventEmitter;
  resize: (cols: number, rows: number) => void;
  destroy: () => void;
}

export interface IDockerAdapter {
  isMock(): boolean;
  createAndStartContainer(params: {
    containerName: string;
    profile: ApprovedImageProfile;
    sessionId: string;
    studentId: string;
    workshopId: string;
  }): Promise<ContainerInfo>;
  inspectContainer(containerId: string): Promise<ContainerInfo | null>;
  stopContainer(containerId: string, timeoutSeconds?: number): Promise<boolean>;
  removeContainer(containerId: string): Promise<boolean>;
  listContainers(): Promise<ContainerInfo[]>;
  attachTerminalStream(containerId: string): Promise<ContainerExecStream>;
  getContainerStats(containerId: string): Promise<{ cpuPercent: number; memoryUsageMb: number; pidsCount: number } | null>;
}

/**
 * High-Fidelity Mock Container Engine Adapter
 * Simulates Linux bash terminal PTY, container lifecycle, and resource metrics.
 */
class MockDockerAdapter implements IDockerAdapter {
  private containers: Map<string, ContainerInfo> = new Map();

  public isMock(): boolean {
    return true;
  }

  public async createAndStartContainer(params: {
    containerName: string;
    profile: ApprovedImageProfile;
    sessionId: string;
    studentId: string;
    workshopId: string;
  }): Promise<ContainerInfo> {
    const containerId = `sim_c_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    
    const info: ContainerInfo = {
      id: containerId,
      name: params.containerName,
      image: params.profile.imageTag,
      profileId: params.profile.id,
      status: 'running',
      createdAt: new Date(),
      startedAt: new Date(),
      limits: params.profile.defaultLimits,
      security: params.profile.security,
      metrics: {
        cpuPercent: 0.8 + Math.random() * 2.5,
        memoryUsageMb: Math.round(48 + Math.random() * 24),
        pidsCount: 14 + Math.floor(Math.random() * 5),
      },
    };

    this.containers.set(containerId, info);
    return info;
  }

  public async inspectContainer(containerId: string): Promise<ContainerInfo | null> {
    const info = this.containers.get(containerId);
    if (!info) return null;
    return { ...info };
  }

  public async stopContainer(containerId: string): Promise<boolean> {
    const info = this.containers.get(containerId);
    if (!info) return false;
    info.status = 'stopped';
    info.stoppedAt = new Date();
    return true;
  }

  public async removeContainer(containerId: string): Promise<boolean> {
    return this.containers.delete(containerId);
  }

  public async listContainers(): Promise<ContainerInfo[]> {
    return Array.from(this.containers.values());
  }

  public async getContainerStats(containerId: string): Promise<{ cpuPercent: number; memoryUsageMb: number; pidsCount: number } | null> {
    const info = this.containers.get(containerId);
    if (!info || info.status !== 'running') return null;
    return {
      cpuPercent: parseFloat((Math.random() * 3.5 + 0.5).toFixed(2)),
      memoryUsageMb: Math.round(52 + Math.random() * 18),
      pidsCount: 14 + Math.floor(Math.random() * 4),
    };
  }

  public async attachTerminalStream(containerId: string): Promise<ContainerExecStream> {
    const info = this.containers.get(containerId);
    if (!info || info.status !== 'running') {
      throw new Error(`Cannot attach to container ${containerId}: not running`);
    }

    const stdin = new EventEmitter() as EventEmitter & { write: (data: string | Buffer) => void };
    const stdout = new EventEmitter();

    let currentInput = '';
    const prompt = '\r\n\x1b[1;32mlabuser@gdg-sandbox\x1b[0m:\x1b[1;34m~\x1b[0m$ ';

    // Welcome message
    setTimeout(() => {
      stdout.emit(
        'data',
        Buffer.from(
          `\x1b[1;36mGDG LabOps Cloud Sandbox [Profile: ${info.profileId}]\x1b[0m\r\n` +
          `Linux gdg-labops-node 5.15.0-generic #GDG-SECURE-SANDBOX SMP x86_64\r\n` +
          `Type "help" for platform information.\r\n` +
          prompt
        )
      );
    }, 50);

    stdin.write = (data: string | Buffer) => {
      const str = data.toString();

      // Handle Enter
      if (str === '\r' || str === '\n' || str === '\r\n') {
        const cmd = currentInput.trim();
        currentInput = '';
        stdout.emit('data', Buffer.from('\r\n'));

        if (cmd === 'clear') {
          stdout.emit('data', Buffer.from('\x1b[2J\x1b[H' + prompt));
          return;
        }

        if (cmd.length > 0) {
          const response = this.executeSimulatedCommand(cmd, info);
          stdout.emit('data', Buffer.from(response + prompt));
        } else {
          stdout.emit('data', Buffer.from(prompt));
        }
        return;
      }

      // Handle Backspace
      if (str === '\x7f' || str === '\b') {
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          stdout.emit('data', Buffer.from('\b \b'));
        }
        return;
      }

      // Handle Ctrl+C
      if (str === '\x03') {
        currentInput = '';
        stdout.emit('data', Buffer.from('^C' + prompt));
        return;
      }

      // Echo character
      currentInput += str;
      stdout.emit('data', Buffer.from(str));
    };

    return {
      stdin,
      stdout,
      resize: (cols: number, rows: number) => {
        // Mock resize acknowledgement
      },
      destroy: () => {
        stdin.removeAllListeners();
        stdout.removeAllListeners();
      },
    };
  }

  private executeSimulatedCommand(cmd: string, info: ContainerInfo): string {
    const parts = cmd.split(' ');
    const binary = parts[0];

    switch (binary) {
      case 'help':
        return (
          `Available commands: ls, pwd, whoami, uname, cat, echo, ps, free, uptime, python3, node, git, clear, exit\r\n` +
          `Running in secure isolated container (${info.profileId}). Network: ${info.security.networkMode}\r\n`
        );
      case 'whoami':
        return `labuser (uid=1000 gid=1000)\r\n`;
      case 'pwd':
        return `/home/labuser\r\n`;
      case 'uname':
        if (parts.includes('-a')) {
          return `Linux gdg-sandbox 5.15.0-100-generic #100-Ubuntu SMP x86_64 GNU/Linux\r\n`;
        }
        return `Linux\r\n`;
      case 'ls':
        return `instructions.txt  lab-workspace  solution.sh\r\n`;
      case 'cat':
        if (parts[1] === 'instructions.txt') {
          return `Welcome to the workshop! Follow the challenge tasks on your left.\r\n`;
        }
        return parts[1] ? `File ${parts[1]} content rendered.\r\n` : `cat: missing operand\r\n`;
      case 'ps':
        return `  PID TTY          TIME CMD\r\n    1 ?        00:00:00 sandbox-init\r\n   12 pts/0    00:00:00 bash\r\n   18 pts/0    00:00:00 ps\r\n`;
      case 'free':
        return `               total        used        free      shared  buff/cache   available\r\nMem:          524288       51200      473088           0           0      473088\r\n`;
      case 'uptime':
        return ` 12:00:00 up 10 min,  1 user,  load average: 0.05, 0.03, 0.01\r\n`;
      case 'python3':
      case 'python':
        return `Python 3.11.8 (main, Feb 2024)\r\n[GCC 11.4.0] on linux\r\n`;
      case 'node':
        return `v20.12.2\r\n`;
      case 'git':
        return `git version 2.43.0\r\n`;
      default:
        return `${binary}: command executed in container\r\n`;
    }
  }
}

/**
 * Docker Engine Client Singleton Factory
 */
export class DockerClientManager {
  private static instance: IDockerAdapter | null = null;

  public static getAdapter(): IDockerAdapter {
    if (!this.instance) {
      // In production Linux hosts with Docker daemon, Dockerode can be instantiated.
      // Default to MockDockerAdapter for robust zero-dependency cross-platform runtime.
      this.instance = new MockDockerAdapter();
    }
    return this.instance;
  }
}
