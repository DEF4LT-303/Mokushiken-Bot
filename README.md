# 🖥️ Discord VPS Monitor Bot

A high-performance Discord bot built with **Node.js** and **Discord.js v14** designed to monitor your VPS hardware metrics and system health in real-time.

It maintains an auto-refreshing status embed every **30 seconds** in your designated channel. If the bot restarts or server goes down, it **automatically detects previous status embeds, cleans them up, and posts a fresh embed at the bottom**, ensuring zero duplicate messages.

---

## ✨ Features

- **🔄 Real-Time Live Status Feed (Every 30s):**
  - **🔥 CPU Usage:** Live load percentage, progress bar, core count, CPU model, and 1m/5m/15m load averages.
  - **🧠 RAM & Swap:** Used vs total memory, available RAM, swap space, and visual utilization bar.
  - **💾 Disk Space:** Primary root mount space used, free space, filesystem type, and usage bar.
  - **🌐 Network Traffic:** Real-time download/upload transfer rates (`kB/s` or `MB/s`) and cumulative data sent/received.
  - **⏳ Uptime Tracker:** System uptime and bot process uptime.
  - **🟢 Health Status Indicator:** Color-coded health level (🟢 Healthy `<75%`, 🟡 Elevated `75-90%`, 🔴 High Load `>90%`).
  - **⏱️ Dynamic Discord Relative Timestamp:** Uses `<t:timestamp:R>` so users can instantly see when the feed was last refreshed.
- **🛡️ Smart Restart & Anti-Duplication:**
  - Persists channel and message IDs to disk (`data/monitor_state.json`).
  - Upon startup/recovery, scans the channel for existing status embeds.
  - Automatically deletes stale messages and posts a fresh one at the bottom, then continuously edits it in-place.
- **🎛️ Full Suite of Slash Commands:**
  - `/monitor setup [channel]` — Activate live 30s status feed in any text channel.
  - `/monitor stop [delete_message]` — Stop live monitoring and optionally delete the embed.
  - `/monitor status` — View the current monitoring configuration.
  - `/status [ephemeral]` — On-demand snapshot of VPS system health.
  - `/ping` — Measure Discord WebSocket, REST roundtrip, and VPS internet gateway latency.
  - `/top [sort_by] [limit]` — Ranked list of processes by CPU or Memory usage.
  - `/disk` — Detailed breakdown of all mounted drives and storage partitions.
  - `/network` — Network adapters, local IPs, MAC addresses, and total traffic.
  - `/docker` — Status of Docker containers (running/paused/stopped) and images.
  - `/exec <command>` — Secure shell command execution directly on VPS (Owner-only & opt-in).
  - `/help` — Interactive command documentation.

---

## 📋 Prerequisites

- **Node.js** v18.0.0 or higher (`node -v`)
- A Discord Bot Application from the [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🚀 Setup Guide

### 1. Create Your Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Name your bot (e.g. `VPS Monitor`) and navigate to the **Bot** tab on the left.
3. Click **Reset Token** and copy your **Bot Token**.
4. Navigate to **OAuth2** -> **General** and copy your **Application ID** (Client ID).
5. Generate an invite link under **OAuth2** -> **URL Generator**:
   - **Scopes:** `bot`, `applications.commands`
   - **Bot Permissions:**
     - `View Channels`
     - `Send Messages`
     - `Embed Links`
     - `Manage Messages` (needed to delete old embeds on restart)
     - `Read Message History`
6. Open the generated link in your browser and invite the bot to your server.

---

### 2. Configure Environment

1. Clone or copy this project to your VPS.
2. In the project root, duplicate `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here         # Optional: for instant slash command registration
   CHECK_INTERVAL=30                   # Refresh interval in seconds
   SERVER_NAME=Ubuntu-Production-VPS   # Custom display name (or leave blank for hostname)
   OWNER_IDS=your_discord_user_id      # For /exec command authorization
   ENABLE_EXEC=false                   # Set to true only if you want /exec enabled
   ```

---

### 3. Install Dependencies & Register Commands

```bash
# Install dependencies
npm install

# Register slash commands with Discord
npm run deploy
```

> **Note:** If `GUILD_ID` is set in `.env`, commands appear in your server immediately. If left empty, commands register globally and can take up to 1 hour to propagate.

---

### 4. Start the Bot

#### Development / Manual Start:
```bash
npm start
```

#### Production with PM2 (Recommended for VPS):
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start bot using ecosystem config
pm2 start ecosystem.config.cjs

# View live real-time logs
pm2 logs vps-monitor-bot

# Make PM2 restart automatically on VPS reboot
pm2 save
pm2 startup
```

Logs are also written directly to `./logs/bot.log` and `./logs/error.log`.

#### Production with Systemd (Linux alternative):
1. Copy `systemd/vps-monitor.service` to `/etc/systemd/system/vps-monitor.service`.
2. Update `WorkingDirectory` and `ExecStart` in the file to point to your bot directory and node binary.
3. Run:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable vps-monitor
   sudo systemctl start vps-monitor
   ```

---

## 🚀 GitHub Actions Auto-Deployment

A complete CI/CD workflow is provided in `.github/workflows/deploy.yml`. Whenever you push code to the `main` branch, GitHub Actions will:
1. Run automated tests to verify code integrity.
2. Securely connect to your VPS via SSH.
3. Pull the latest code, install production dependencies, refresh slash commands, and reload PM2 / systemd.

### Required GitHub Repository Secrets

Go to **Settings** -> **Secrets and variables** -> **Actions** in your GitHub repository and add:

| Secret Name | Value Example | Description |
| :--- | :--- | :--- |
| `VPS_HOST` | `198.51.100.1` | Your VPS public IP address or domain |
| `VPS_USERNAME` | `root` or `ubuntu` | SSH login username on the VPS |
| `VPS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Private SSH key authorized on your VPS |
| `VPS_PORT` | `22` (Optional) | SSH port (defaults to 22 if omitted) |
| `VPS_TARGET_DIR` | `/opt/monitor-bot` | Absolute path where repo is cloned on the VPS |

### Setting Up SSH Key for GitHub Actions

On your local machine or VPS, generate a dedicated deploy key (optional but recommended):
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key
```
1. Add the **public key** (`~/.ssh/github_deploy_key.pub`) to `~/.ssh/authorized_keys` on your VPS.
2. Add the **private key** (`~/.ssh/github_deploy_key`) as the `VPS_SSH_KEY` secret in your GitHub repository.


---

## 🎮 Discord Slash Commands

| Command | Description | Permissions |
| :--- | :--- | :--- |
| `/monitor setup [channel]` | Registers channel and starts live 30s status embed | `Manage Server` |
| `/monitor stop [delete_message]` | Disables monitoring in this server | `Manage Server` |
| `/monitor status` | Shows current monitoring config and health | `Manage Server` |
| `/status [ephemeral]` | Instant one-off VPS stats snapshot | Everyone |
| `/ping` | Tests Discord WebSocket, REST API, & VPS internet latency | Everyone |
| `/top [sort_by] [limit]` | Displays top 5–20 processes by CPU or RAM | Everyone |
| `/disk` | Displays all mounted filesystems and partition usage | Everyone |
| `/network` | Displays network adapters, IPs, and transfer stats | Everyone |
| `/docker` | Displays Docker containers and status | Everyone |
| `/exec <command>` | Runs shell command on VPS with output in codeblock | Bot Owner only |
| `/help` | Detailed bot guide and command listing | Everyone |

---

## 🛠️ Project Structure

```
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies and scripts
├── ecosystem.config.cjs      # PM2 process manager configuration
├── systemd/
│   └── vps-monitor.service   # Systemd unit file for Linux 24/7 hosting
├── data/
│   └── monitor_state.json    # Auto-generated persistent channel & message storage
└── src/
    ├── config.js             # Configuration validation and loader
    ├── deploy-commands.js    # Slash command deployment script
    ├── index.js              # Bot entry point and event handling
    ├── utils/
    │   ├── formatters.js     # Byte, duration, bitrate, and progress bar formatters
    │   └── storage.js        # Atomic JSON storage operations
    ├── services/
    │   ├── systemService.js  # Hardware metrics collection via systeminformation
    │   ├── embedBuilder.js   # Rich Discord embed templates
    │   └── monitorService.js # 30s background loop & anti-duplication recovery
    └── commands/
        ├── monitor.js        # /monitor (setup, stop, status)
        ├── status.js         # /status snapshot
        ├── ping.js           # /ping latency diagnostics
        ├── top.js            # /top process monitor
        ├── disk.js           # /disk storage partitions
        ├── network.js        # /network interfaces
        ├── docker.js         # /docker container statuses
        ├── exec.js           # /exec remote shell (secured)
        └── help.js           # /help command documentation
```

---

## 🛡️ Security Best Practices

- Never commit your `.env` file or share your `DISCORD_TOKEN`.
- The `/exec` command is disabled by default (`ENABLE_EXEC=false`). When enabled, it strictly restricts access to user IDs listed in `OWNER_IDS`.
- The monitoring loop handles Discord rate limits gracefully and performs atomic writes to ensure persistent data integrity.
