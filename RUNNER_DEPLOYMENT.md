# GDG LabOps – Execution Runner Host Deployment & Hardening Guide

## 1. Overview

The GDG LabOps Execution Runner (`lab-runner/`) is designed to run on a Linux Virtual Machine (e.g. Ubuntu 22.04 LTS on Google Compute Engine, AWS EC2, or a dedicated bare-metal server) equipped with Docker Engine.

```
                    INTERNET / STUDENTS
                            |
                     (HTTPS / WSS)
                            v
                   +-----------------+
                   |  Caddy / Nginx  |  TLS Termination & WebSocket Reverse Proxy
                   +--------+--------+
                            |
                 (Internal loopback 8080)
                            v
                 +---------------------+
                 |  lab-runner service |  Node.js Daemon (systemd)
                 +----------+----------+
                            |
               (UNIX Socket /var/run/docker.sock)
                            v
                 +---------------------+
                 |    Docker Engine    |  Hardened daemon.json (cgroups, non-root)
                 +---------------------+
```

---

## 2. Docker Daemon Hardening (`/etc/docker/daemon.json`)

To ensure security across all student containers:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "no-new-privileges": true,
  "icc": false,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 1024,
      "Soft": 1024
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 128,
      "Soft": 128
    }
  },
  "live-restore": true
}
```

Key flags:
- `"no-new-privileges": true`: System-wide prevention of setuid privilege escalation.
- `"icc": false`: Disables inter-container communication on the default bridge network, isolating student containers from each other.
- `"live-restore": true`: Keeps student containers running if the Docker daemon restarts.

---

## 3. Host Firewall & iptables Isolation

Block student containers from reaching the host VM's internal loopback, private cloud metadata, and other internal subnets:

```bash
# Block access to cloud instance metadata
sudo iptables -I DOCKER-USER -d 169.254.169.254 -j DROP

# Block access to host daemon internal port 8080 from containers
sudo iptables -I DOCKER-USER -p tcp --dport 8080 -j DROP

# Block container probing of host LAN
sudo iptables -I DOCKER-USER -d 10.0.0.0/8 -j DROP
sudo iptables -I DOCKER-USER -d 172.16.0.0/12 -j DROP
sudo iptables -I DOCKER-USER -d 192.168.0.0/16 -j DROP
```

---

## 4. Systemd Service Setup

Create `/etc/systemd/system/gdg-labops-runner.service`:

```ini
[Unit]
Description=GDG LabOps Execution Plane Runner
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/gdg-labops/lab-runner
Environment=NODE_ENV=production
Environment=RUNNER_PORT=8080
Environment=WORKER_DAEMON_SECRET="<YOUR_STRONG_HMAC_SECRET_64_CHARS>"
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gdg-labops-runner
sudo systemctl start gdg-labops-runner
sudo systemctl status gdg-labops-runner
```

---

## 5. Reverse Proxy with TLS (Caddy or Nginx)

### Using Caddy (Recommended)
```caddyfile
runner.labops.yourdomain.com {
    # WebSocket and REST reverse proxy
    reverse_proxy localhost:8080
}
```

### Using Nginx
```nginx
server {
    server_name runner.labops.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```
