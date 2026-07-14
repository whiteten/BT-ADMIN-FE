import type { CampaignDashboardWidgetType } from './campaign';

export type DashboardSubscribeOptions = Record<string, unknown>;

export type DashboardWidgetType = CampaignDashboardWidgetType;

export const DASHBOARD_MSG_TYPE = {
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  DATA: 'DATA',
  ERROR: 'ERROR',
  CONNECTED: 'CONNECTED',
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED',
} as const;

export type DashboardMsgType = (typeof DASHBOARD_MSG_TYPE)[keyof typeof DASHBOARD_MSG_TYPE];

interface DashboardWsBaseMessage {
  wsId: string;
}

export interface DashboardWsSubscribeMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.SUBSCRIBE;
  widgetId: string;
  widgetType: DashboardWidgetType;
  options: DashboardSubscribeOptions;
}

export interface DashboardWsUnsubscribeMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.UNSUBSCRIBE;
  widgetId: string;
}

export interface DashboardWsDataMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.DATA;
  widgetId: string;
  widgetType: DashboardWidgetType;
  data: unknown;
}

export interface DashboardWsErrorMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.ERROR;
  widgetId: string;
  message: string;
}

export interface DashboardWsConnectedMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.CONNECTED;
}

export interface DashboardWsSubscribedMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.SUBSCRIBED;
  widgetId: string;
  widgetType: DashboardWidgetType;
  options: DashboardSubscribeOptions;
}

export interface DashboardWsUnsubscribedMessage extends DashboardWsBaseMessage {
  type: typeof DASHBOARD_MSG_TYPE.UNSUBSCRIBED;
  widgetId: string;
}

export type DashboardWsServerMessage =
  | DashboardWsDataMessage
  | DashboardWsErrorMessage
  | DashboardWsConnectedMessage
  | DashboardWsSubscribedMessage
  | DashboardWsUnsubscribedMessage;
