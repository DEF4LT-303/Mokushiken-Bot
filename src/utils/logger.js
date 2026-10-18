import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'bot.log');
const errorFilePath = path.join(logsDir, 'error.log');

// ANSI color codes for terminal / PM2 logs
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
};

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    })
    .join(' ');
}

function writeToFile(filePath, text) {
  try {
    fs.appendFileSync(filePath, `${text}\n`, 'utf8');
  } catch {
    // Fail silently on filesystem write errors to avoid crashing application
  }
}

export const logger = {
  info(...args) {
    const time = getTimestamp();
    const message = formatArgs(args);
    const consoleLine = `${colors.dim}[${time}]${colors.reset} ${colors.cyan}[INFO]${colors.reset} ${message}`;
    const fileLine = `[${time}] [INFO] ${message}`;

    console.log(consoleLine);
    writeToFile(logFilePath, fileLine);
  },

  warn(...args) {
    const time = getTimestamp();
    const message = formatArgs(args);
    const consoleLine = `${colors.dim}[${time}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${message}`;
    const fileLine = `[${time}] [WARN] ${message}`;

    console.warn(consoleLine);
    writeToFile(logFilePath, fileLine);
  },

  error(...args) {
    const time = getTimestamp();
    const message = formatArgs(args);
    const consoleLine = `${colors.dim}[${time}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${message}`;
    const fileLine = `[${time}] [ERROR] ${message}`;

    console.error(consoleLine);
    writeToFile(logFilePath, fileLine);
    writeToFile(errorFilePath, fileLine);
  },

  monitor(...args) {
    const time = getTimestamp();
    const message = formatArgs(args);
    const consoleLine = `${colors.dim}[${time}]${colors.reset} ${colors.green}[MONITOR]${colors.reset} ${message}`;
    const fileLine = `[${time}] [MONITOR] ${message}`;

    console.log(consoleLine);
    writeToFile(logFilePath, fileLine);
  },

  cmd(userTag, userId, guildName, commandName, durationMs, success = true) {
    const time = getTimestamp();
    const statusText = success ? 'SUCCESS' : 'FAILED';
    const message = `/${commandName} executed by ${userTag} (${userId}) in "${guildName || 'DM'}" - ${durationMs}ms [${statusText}]`;
    const consoleLine = `${colors.dim}[${time}]${colors.reset} ${colors.magenta}[CMD]${colors.reset} ${message}`;
    const fileLine = `[${time}] [CMD] ${message}`;

    console.log(consoleLine);
    writeToFile(logFilePath, fileLine);
  },
};
