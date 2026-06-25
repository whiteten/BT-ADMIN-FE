import type { ScheduleServerActive, ScheduleServerProtocol } from '../constants/scheduleServerConstants';

export interface ScheduleServerItem {
  serverId: string;
  serverCategory: string;
  active: ScheduleServerActive;
  hostName: string;
  serverIp: string;
  serverPort: number;
  protocol: ScheduleServerProtocol;
}

export type ScheduleServerFormValues = {
  serverCategory: string;
  serverIp: string;
  hostName?: string;
  serverPort: number;
  protocol: ScheduleServerProtocol;
};
