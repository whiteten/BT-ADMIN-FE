import type { AlarmRow } from './types';

/**
 * 데모 데이터 — URL 에 `?alarmDemo=1` 이 포함되면 위젯이 실 데이터 대신 본 값을 사용한다.
 *
 * 사용자 제공 TB_CC_ERRHISTORY 샘플(그룹DN 채널 소진 장애)을 기반으로,
 * 등급·복구 상태가 섞인 운영 상황을 재현한다. 운영에는 영향 없음.
 */
export const DEMO_ALARMS: AlarmRow[] = [
  {
    id: '17781207001289',
    date: '20260603',
    time: '091230',
    systemId: '7131',
    systemName: 'IC CTI 서버',
    nodeId: '1',
    nodeName: 'C1N1',
    processId: '196628',
    processName: 'ICM (CTI Main)',
    code: '2010030',
    kind: '2',
    level: 3,
    status: '1',
    issueKey: 'fa38f0f2-bb49-f111-bad0-b3950fc7bcb6',
    message: '그룹DN 30020 에 사용가능한 채널이 없습니다.',
  },
  {
    id: '17781206401288',
    date: '20260603',
    time: '091150',
    systemId: '7131',
    systemName: 'IC CTI 서버',
    nodeId: '1',
    nodeName: 'C1N1',
    processId: '196628',
    processName: 'ICM (CTI Main)',
    code: '2010030',
    kind: '2',
    level: 2,
    status: '1',
    issueKey: '1c5b2acf-bb49-f111-8dd9-b3950fc7bcb6',
    message: '그룹DN 30020 에 사용가능한 채널이 없습니다.',
  },
  {
    id: '17781205801287',
    date: '20260603',
    time: '090845',
    systemId: '2010051',
    systemName: 'IR IVR #2',
    nodeId: '2',
    nodeName: 'C1N2',
    processId: '196610',
    processName: 'IRM (IVR Main)',
    code: '3010012',
    kind: '1',
    level: 2,
    status: '1',
    issueKey: 'ca9763ab-bb49-f111-b98e-b3950fc7bcb6',
    message: 'IVR 채널 등록 실패 — SLEE 프로세스 응답 없음.',
  },
  {
    id: '17781205201286',
    date: '20260603',
    time: '084012',
    systemId: '2010011',
    systemName: 'IE 교환기 #2',
    nodeId: '2',
    nodeName: 'C1N2',
    processId: '180224',
    processName: 'IEM (교환 Main)',
    code: '1010044',
    kind: '1',
    level: 1,
    status: '1',
    issueKey: 'b21d4e90-bb49-f111-a1c2-b3950fc7bcb6',
    message: '메모리 사용율 임계 초과(주의) — 66%.',
  },
  {
    id: '17781204601285',
    date: '20260603',
    time: '081530',
    systemId: '7131',
    systemName: 'IC CTI 서버',
    nodeId: '1',
    nodeName: 'C1N1',
    processId: '196628',
    processName: 'ICM (CTI Main)',
    code: '2010030',
    kind: '2',
    level: 2,
    status: '2',
    issueKey: 'a3f00e21-bb49-f111-90aa-b3950fc7bcb6',
    message: '그룹DN 30010 에 사용가능한 채널이 없습니다.',
    repairTime: '20260603083000',
  },
  {
    id: '17781203901284',
    date: '20260603',
    time: '075905',
    systemId: '2010050',
    systemName: 'IR IVR #1',
    nodeId: '1',
    nodeName: 'C1N1',
    processId: '196610',
    processName: 'IRM (IVR Main)',
    code: '3010005',
    kind: '1',
    level: 1,
    status: '2',
    issueKey: '7c19ab33-bb49-f111-88de-b3950fc7bcb6',
    message: 'TGW 링크 일시 단절 후 자동 복구됨.',
    repairTime: '20260603080112',
  },
];

export function isAlarmDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('alarmDemo') === '1';
  } catch {
    return false;
  }
}
