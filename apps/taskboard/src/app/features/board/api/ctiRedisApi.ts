import ApiTaskboard from '@/shared-util';

/**
 * CTI Redis 실시간 데이터 API
 * TASKBOARD BE → Redis → TB_IC_CTIQMASTER / TB_IC_AGENTMASTER / TB_IC_GROUPMASTER
 *
 * BFF AGG Flow 등록 필요 (V67 migration):
 *   - taskboard-redis-queue  : GET → TASKBOARD /api/taskboard/redis/cti-queue
 *   - taskboard-redis-agent  : GET → TASKBOARD /api/taskboard/redis/cti-agent
 *   - taskboard-redis-group  : GET → TASKBOARD /api/taskboard/redis/cti-group
 */
const apiTaskboard = new ApiTaskboard({ serviceURL: '/bff' });

/** TB_IC_CTIQMASTER 큐 행 */
export interface CtiQueueRow {
  queueId: string;
  queueName: string;
  waitCount: number;
  talkCount: number;
  avgWaitSec: number;
}

/** TB_IC_AGENTMASTER 상담사 행 */
export interface CtiAgentRow {
  agentId: string;
  agentName: string;
  statusCode: string;
  statusName: string;
  talkCount: number;
  talkTimeSec: number;
}

/** TB_IC_GROUPMASTER 상담그룹 행 */
export interface CtiGroupRow {
  groupId: string;
  groupName: string;
  waitCount: number;
  talkCount: number;
  agentCount: number;
}

export const ctiRedisApi = {
  /** 큐 리스트 (TB_IC_CTIQMASTER via Redis) */
  getCtiQueueList: async (): Promise<CtiQueueRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-queue');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /** 상담사 리스트 (TB_IC_AGENTMASTER via Redis) */
  getCtiAgentList: async (): Promise<CtiAgentRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-agent');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },

  /** 상담그룹 리스트 (TB_IC_GROUPMASTER via Redis) */
  getCtiGroupList: async (): Promise<CtiGroupRow[]> => {
    const response = await apiTaskboard.get<any>('/taskboard-redis-group');
    const list = response?.data?.data?.value ?? response?.data?.data;
    return Array.isArray(list) ? list : [];
  },
};
