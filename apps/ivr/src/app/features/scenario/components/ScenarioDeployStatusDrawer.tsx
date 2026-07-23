/**
 * 배포 현황 Drawer — 시나리오 전체의 모든 DNIS 시스템 풀상세.
 *
 * <p>운영자가 "지금 우리 시나리오가 어디에 어떻게 깔려있나" 한 번에 보고 싶을 때.
 * 상단 상태 요약 배지 + 카드별 좌측 상태 색상바로 한눈에 스캔 가능하게 구성.
 * 배지 색상 팔레트는 ScenarioList.tsx 카드의 배포 상태 배지와 동일한 톤 사용(앱 전역 일관성).</p>
 */
import { type ReactNode, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Drawer, Empty } from 'antd';
import dayjs from 'dayjs';
import { ArrowRight, Server, ServerOff } from 'lucide-react';
import { useGetDeployStatus } from '../hooks/useScenarioQueries';
import { APPLY_STATUS, APPLY_TIMING, type ApplyStatus, type DeployedSystem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { cn } from '@/lib/utils';

type StatusKind = 'success' | 'progress' | 'fail' | 'pending';

/** 배지 색상 팔레트 — ScenarioList.tsx 카드의 배포 상태 배지(BADGE_STYLE)와 동일 톤. */
const STATUS_STYLE: Record<StatusKind, { color: string; backgroundColor: string; borderColor: string }> = {
  success: { color: '#0AB39C', backgroundColor: '#0AB39C1A', borderColor: '#0AB39C55' },
  pending: { color: '#F7B84B', backgroundColor: '#F7B84B1A', borderColor: '#F7B84B55' },
  fail: { color: '#F06548', backgroundColor: '#F065481A', borderColor: '#F0654855' },
  progress: { color: '#1F79D4', backgroundColor: '#1F79D41A', borderColor: '#1F79D455' },
};

const STATUS_BORDER_L: Record<StatusKind, string> = {
  success: 'border-l-[#0AB39C]',
  pending: 'border-l-[#F7B84B]',
  fail: 'border-l-[#F06548]',
  progress: 'border-l-[#1F79D4]',
};

const STATUS_LABELS: Record<number, string> = {
  [APPLY_STATUS.PENDING]: '대기',
  [APPLY_STATUS.SEND_OK]: '전송완료',
  [APPLY_STATUS.SEND_FAIL]: '전송실패',
  [APPLY_STATUS.CMD_OK]: '명령완료',
  [APPLY_STATUS.CMD_FAIL]: '명령실패',
  [APPLY_STATUS.APPLIED]: '적용완료',
  [APPLY_STATUS.APPLY_FAIL]: '적용실패',
};

const STATUS_KIND_LABELS: Record<StatusKind, string> = {
  success: '적용완료',
  progress: '진행중',
  pending: '대기',
  fail: '실패',
};

function statusKindOf(status?: ApplyStatus | null): StatusKind {
  if (status === APPLY_STATUS.APPLIED) return 'success';
  if (status === APPLY_STATUS.SEND_FAIL || status === APPLY_STATUS.CMD_FAIL || status === APPLY_STATUS.APPLY_FAIL) return 'fail';
  if (status === APPLY_STATUS.SEND_OK || status === APPLY_STATUS.CMD_OK) return 'progress';
  return 'pending';
}

function StatusBadge({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap" style={STATUS_STYLE[kind]}>
      {children}
    </span>
  );
}

export interface ScenarioDeployStatusDrawerRef {
  open: (args: { serviceId: number; serviceName?: string }) => void;
  close: () => void;
}

const ScenarioDeployStatusDrawer = forwardRef<ScenarioDeployStatusDrawerRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    open: ({ serviceId: sid, serviceName: sname }) => {
      setServiceId(sid);
      setServiceName(sname);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { data: rows = [], isLoading } = useGetDeployStatus({
    params: { serviceId: serviceId ?? 0 },
    queryOptions: { enabled: !!serviceId && visible },
  });

  const summary = useMemo(() => {
    const counts: Record<StatusKind, number> = { success: 0, progress: 0, pending: 0, fail: 0 };
    rows.forEach((s: DeployedSystem) => {
      counts[statusKindOf(s.applyStatus)] += 1;
    });
    return counts;
  }, [rows]);

  return (
    <Drawer
      title={`배포 현황${serviceName ? ` — ${serviceName}` : ''}`}
      placement="right"
      size={520}
      open={visible}
      onClose={() => setVisible(false)}
      closable={{ placement: 'end' }}
      destroyOnHidden
    >
      <div className="w-full h-full flex flex-col">
        {/* 요약 — 전체 대수 + 상태별 배지 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-[#495057] font-semibold">총 {rows.length}대</span>
          {summary.success > 0 && <StatusBadge kind="success">적용완료 {summary.success}</StatusBadge>}
          {summary.progress > 0 && <StatusBadge kind="progress">진행중 {summary.progress}</StatusBadge>}
          {summary.pending > 0 && <StatusBadge kind="pending">대기 {summary.pending}</StatusBadge>}
          {summary.fail > 0 && <StatusBadge kind="fail">실패 {summary.fail}</StatusBadge>}
        </div>

        {isLoading ? (
          <FallbackSpinner size={36} tip="배포 현황을 불러오는 중..." />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-12 gap-3">
            <ServerOff className="size-12" />
            <Empty description="할당된 시스템이 없습니다" />
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto">
            {rows.map((s: DeployedSystem) => {
              const kind = statusKindOf(s.applyStatus);
              const isReserved = s.rtResvKind === APPLY_TIMING.RESERVED || !!s.applyVer;
              return (
                <div key={s.systemId} className={cn('p-3 rounded-md border border-slate-200 bg-white border-l-[3px]', STATUS_BORDER_L[kind])}>
                  {/* 헤더: 시스템명 + 상태 */}
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="size-4 text-[#405189] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 truncate">{s.systemName ?? `System ${s.systemId}`}</div>
                      {/* IP · node · HA그룹명 — 헷갈리는 HA그룹 숫자 id 는 제외 */}
                      <div className="text-[11px] text-slate-400 truncate">
                        {[s.ipAddress, s.nodeId != null ? `node ${s.nodeId}` : null, s.systemRole].filter(Boolean).join(' · ') || '-'}
                      </div>
                    </div>
                    <StatusBadge kind={kind}>{(s.applyStatus && STATUS_LABELS[s.applyStatus]) ?? STATUS_KIND_LABELS[kind]}</StatusBadge>
                  </div>

                  {/* 버전 전환 — 이전 → 현재 (+ 예약 대기) */}
                  <div className="flex items-center flex-wrap gap-1.5 mb-2 ml-6 text-[12px]">
                    <span className="text-slate-400">{s.priorVer ?? '-'}</span>
                    <ArrowRight className="size-3 text-slate-300 flex-shrink-0" />
                    <span className="font-semibold text-slate-800">{s.serviceVer ?? '-'}</span>
                    {s.applyVer && <StatusBadge kind="pending">예약 {s.applyVer}</StatusBadge>}
                  </div>

                  {/* 일시 / 작업자 / 예약 ID */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] ml-6 text-slate-600">
                    <div className="flex gap-1.5">
                      <span className="text-slate-400 flex-shrink-0">{isReserved ? '예약 일시' : '적용 일시'}</span>
                      <span className="truncate">{s.applyDatetime ? dayjs(s.applyDatetime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-slate-400 flex-shrink-0">작업자</span>
                      <span className="truncate">{s.workUserName ?? '-'}</span>
                    </div>
                    {s.svcResvId && (
                      <div className="flex gap-1.5 col-span-2">
                        <span className="text-slate-400 flex-shrink-0">예약 ID</span>
                        <span className="font-mono truncate">{s.svcResvId}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
});

ScenarioDeployStatusDrawer.displayName = 'ScenarioDeployStatusDrawer';
export default ScenarioDeployStatusDrawer;
