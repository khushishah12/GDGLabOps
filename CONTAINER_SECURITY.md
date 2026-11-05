# GDG LabOps – Container Security & Isolation Specification

## 1. Threat Modeling for Shared Workshop Infrastructure

Multi-tenant lab platforms where students execute commands inside Linux environments must defend against multiple attack vectors:
1. **Privilege Escalation**: Attempting to gain root privileges on the container or escaping to the host OS kernel.
2. **Resource Starvation (DoS)**: Fork bombs (`:(){ :|:& };:`), infinite loops, memory leaks, or disk filling exhausting host resources.
3. **Network Reconnaissance & SSRF**: Scanning internal subnets, attacking other students' containers, or reaching cloud provider instance metadata endpoints (`http://169.254.169.254/`).
4. **Data Tampering & Cross-Session Spillage**: Reading residual data left behind by another student's earlier session.
5. **Cryptojacking & Abuse**: Spawning unauthorized background miners or botnet agents.

---

## 2. Hardened Container Isolation Measures

GDG LabOps implements layered defense-in-depth at the container runtime level:

### 2.1 Non-Root User Execution
- Every container process runs as an unprivileged user: `UID 1000:GID 1000` (`labuser` or `node`).
- Root logins and `sudo` elevation are disabled.
- Setuid / setgid binaries cannot escalate privileges because the kernel flag `no-new-privileges: true` is unconditionally enforced.

### 2.2 Dropping Linux Kernel Capabilities
- Standard Docker containers retain 14 default capabilities (such as `CAP_CHOWN`, `CAP_FOWNER`, `CAP_KILL`, `CAP_NET_BIND_SERVICE`).
- GDG LabOps drops **ALL** capabilities (`CapDrop: ['ALL']`), only retaining strictly safe unprivileged capabilities if required for basic shell operation (`CHOWN`, `SETUID`, `SETGID`, `DAC_OVERRIDE`).
- High-risk capabilities such as `CAP_SYS_ADMIN`, `CAP_NET_ADMIN`, `CAP_SYS_PTRACE`, `CAP_SYS_RAWIO`, and `CAP_DAC_READ_SEARCH` are completely blocked.

### 2.3 Cgroups Resource Limits (Strict Quotas)
To prevent "noisy neighbor" effects and fork bombs, each container is constrained by strict Linux control groups:
- **CPU Quota**: Enforced via `NanoCPUs` (e.g. `1_000_000_000` = 1.0 vCPU). Prevents infinite loops from consuming the host processor.
- **Memory & Swap Cap**: Hard memory limit (e.g. 512MB – 1024MB). Swap is explicitly capped (`MemorySwap = Memory`) to prevent host swap thrashing.
- **Process ID Limit (PidsLimit)**: Hard-capped at 64–128 processes. This neutralizes fork bombs immediately; any attempt to spawn beyond the limit fails with `Resource temporarily unavailable`.

### 2.4 Ephemeral Filesystems & Tmpfs
- The host root filesystem is never mounted into student containers.
- Writable areas (`/tmp`, `/run`) are mounted as in-memory `tmpfs` with security flags:
  `rw,nosuid,nodev,noexec,size=64m`
- Containers are destroyed (`docker rm -f`) immediately upon session termination, instantly wiping all container filesystem layers.

### 2.5 Network Sandboxing
- Cybersecurity labs utilize `networkMode: "none"`, creating an air-gapped container with only a loopback interface.
- Standard labs using bridge networking are isolated using host-level iptables rules blocking access to:
  - Host loopback (`127.0.0.1` on the VM).
  - Cloud Instance Metadata (`169.254.169.254`).
  - Internal runner control port (e.g., `8080`).
  - Private subnet address ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).

---

## 3. Containers vs. MicroVMs (Production Evolution)

In production environments running completely untrusted, hostile code:
- **Standard Docker Containers** share the host Linux kernel. A zero-day kernel exploit could potentially allow a container breakout.
- **Recommended Evolution**:
  1. **gVisor (`runsc`)**: A lightweight user-space kernel implementation created by Google. Replacing `runc` with `runsc` in Docker's `daemon.json` intercepts and re-implements Linux syscalls in user space, providing virtualization-grade isolation with container-grade startup speeds.
  2. **Firecracker / Kata Containers**: Hardware-assisted microVMs providing isolated kernel boundaries per student session.

GDG LabOps's modular Docker adapter allows seamlessly switching between standard Docker (`runc`), gVisor (`runsc`), or Kata Containers simply by updating Docker's default runtime configuration without changing any platform code.
