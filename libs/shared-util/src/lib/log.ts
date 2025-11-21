import dayjs from 'dayjs';

const LEVELS = { SUCCESS: 'success', ERROR: 'error', WARN: 'warn', INFO: 'info', DEBUG: 'debug' } as const;
type LogLevel = (typeof LEVELS)[keyof typeof LEVELS];

const STYLE: Record<LogLevel, string> = {
  [LEVELS.SUCCESS]: 'color:green;font-weight:bold;',
  [LEVELS.ERROR]: 'color:red;font-weight:bold',
  [LEVELS.WARN]: 'color:orange;font-weight:bold',
  [LEVELS.INFO]: 'font-weight:bold;',
  [LEVELS.DEBUG]: 'color:gray;font-weight:bold',
};

class _Log {
  private title?: string;

  static getCurrentTime() {
    return dayjs().format('MM-DD HH:mm:ss.SSS');
  }

  constructor(title?: string) {
    this.title = title;
  }

  log(level: LogLevel, ...args: unknown[]) {
    const now = _Log.getCurrentTime();
    const style = STYLE[level];
    const _level = level.toUpperCase().padEnd(7, ' ');
    const title = this.title ? `[${this.title}]` : '';
    const prefix = `[${now}] %c${_level}`;
    if (title) console.log(prefix, style, title, ...args);
    else console.log(prefix, style, ...args);
  }

  success = (...args: unknown[]) => this.log(LEVELS.SUCCESS, ...args);
  error = (...args: unknown[]) => this.log(LEVELS.ERROR, ...args);
  warn = (...args: unknown[]) => this.log(LEVELS.WARN, ...args);
  info = (...args: unknown[]) => this.log(LEVELS.INFO, ...args);
  debug = (...args: unknown[]) => this.log(LEVELS.DEBUG, ...args);

  group = {
    start: (groupName: string, collapsed = false) => (collapsed ? console.groupCollapsed(groupName) : console.group(groupName)),
    end: () => console.groupEnd(),
  };
}

/**
 * 별도 타이틀이 필요하지 않을경우
 *
 * e.g.
 * import { Log } from "@/utils/log";
 * Log.info("메시지");
 */
const Log = new _Log();

/**
 * 타이틀을 사용할 경우
 *
 * e.g.
 * import { LOG } from "@/utils/log";
 * const Log = new LOG("타이틀명");
 * Log.debug("메시지");
 */
const LOG = _Log;

export { Log, LOG };
