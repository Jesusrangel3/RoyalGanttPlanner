type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  data?: unknown;
}

function emit(level: LogLevel, msg: string, data?: unknown): void {
  const entry: LogEntry = { ts: new Date().toISOString(), level, msg };
  if (data !== undefined) entry.data = data;

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info:  (msg: string, data?: unknown) => emit('info', msg, data),
  warn:  (msg: string, data?: unknown) => emit('warn', msg, data),
  error: (msg: string, data?: unknown) => emit('error', msg, data),
  debug: (msg: string, data?: unknown) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', msg, data);
  },
};
