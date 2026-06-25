import { DEFAULT_SCHEDULE_SERVER_PORT, SCHEDULE_SERVER_ACTIVE, SCHEDULE_SERVER_PROTOCOL } from './scheduleServerConstants';
import type { ScheduleServerItem } from '../types/scheduleServer';

export const MOCK_SCHEDULE_SERVER_LIST: ScheduleServerItem[] = [
  {
    serverId: 'schedule-server-001',
    serverCategory: '1',
    active: SCHEDULE_SERVER_ACTIVE.YES,
    hostName: 'scheduler01',
    serverIp: '100.100.107.33',
    serverPort: DEFAULT_SCHEDULE_SERVER_PORT,
    protocol: SCHEDULE_SERVER_PROTOCOL.HTTP,
  },
  {
    serverId: 'schedule-server-002',
    serverCategory: '2',
    active: SCHEDULE_SERVER_ACTIVE.YES,
    hostName: 'scheduler02',
    serverIp: '100.100.107.34',
    serverPort: DEFAULT_SCHEDULE_SERVER_PORT,
    protocol: SCHEDULE_SERVER_PROTOCOL.HTTP,
  },
  {
    serverId: 'schedule-server-003',
    serverCategory: '3',
    active: SCHEDULE_SERVER_ACTIVE.NO,
    hostName: 'scheduler03',
    serverIp: '100.100.107.35',
    serverPort: DEFAULT_SCHEDULE_SERVER_PORT,
    protocol: SCHEDULE_SERVER_PROTOCOL.HTTP,
  },
];
