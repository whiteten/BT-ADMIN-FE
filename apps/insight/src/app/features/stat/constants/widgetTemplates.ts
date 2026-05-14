export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  datasourceKey: string;
  defaultFields: string[];
  defaultVisualization: string;
  defaultW: number;
  defaultH: number;
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'ic-queue-sl',
    name: '큐 서비스 레벨',
    description: '인입/응답/포기/SL 핵심 지표',
    icon: '📞',
    category: 'IC',
    datasourceKey: 'ic-queue',
    defaultFields: ['PSR_TIME_KEY', 'QUEUE_ID', 'QUEUE_NAME', 'TOT_IB_CNT', 'ANSWER_CNT', 'ABANDON_CNT', 'SL_CNT'],
    defaultVisualization: 'LINE',
    defaultW: 6,
    defaultH: 3,
  },
  {
    id: 'ic-agent-perf',
    name: '상담원 성과',
    description: 'AHT / ACW / 점유율',
    icon: '👤',
    category: 'IC',
    datasourceKey: 'ic-agt-acw-spec',
    defaultFields: ['PSR_TIME_KEY', 'AGENT_ID', 'AGENT_NAME', 'TALK_TIME', 'ACW_TIME', 'LOGIN_TIME'],
    defaultVisualization: 'GRID',
    defaultW: 8,
    defaultH: 4,
  },
  {
    id: 'fca-bot-service',
    name: 'AI 봇 서비스',
    description: '봇 호출/완료/에스컬레이션',
    icon: '🤖',
    category: 'FCA',
    datasourceKey: 'fca.bot-service-stat',
    defaultFields: ['PSR_TIME_KEY', 'BOT_ID', 'BOT_NAME', 'CONN_CNT', 'COMPLETE_CNT', 'ESCALATION_CNT'],
    defaultVisualization: 'BAR',
    defaultW: 6,
    defaultH: 3,
  },
  {
    id: 'ir-containment',
    name: 'IVR 자가처리율',
    description: 'IVR 인입/자가처리/에스컬레이션',
    icon: '📊',
    category: 'IR',
    datasourceKey: 'ir.bot-service-stat',
    defaultFields: ['PSR_TIME_KEY', 'SERVICE_NO', 'CONN_CNT', 'SELF_SVC_CNT', 'AGENT_REQ_CNT'],
    defaultVisualization: 'LINE',
    defaultW: 6,
    defaultH: 3,
  },
];
