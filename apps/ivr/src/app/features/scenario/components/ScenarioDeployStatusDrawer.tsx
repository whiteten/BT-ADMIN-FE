/**
 * 배포 현황 Drawer — 시나리오 전체의 모든 DNIS 시스템 풀상세.
 *
 * <p>운영자가 "지금 우리 시나리오가 어디에 어떻게 깔려있나" 한 번에 보고 싶을 때.
 * 스타일: 배포 설정 Drawer(ScenarioDeployConfigDrawer)와 동일한 디자인 토큰 사용.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Drawer, Empty, Tag } from 'antd';
import dayjs from 'dayjs';
import { Activity, Server, ServerOff } from 'lucide-react';
import { useGetDeployStatus } from '../hooks/useScenarioQueries';
import type { DeployedSystem } from '../types';

const APPLY_STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  SEND_OK: '전송완료',
  SEND_FAIL: '전송실패',
  CMD_OK: '명령완료',
  CMD_FAIL: '명령실패',
  APPLIED: '적용완료',
  APPLY_FAIL: '적용실패',
};

const APPLY_RESULT_LABELS: Record<string, string> = {
  SUCCESS: '성공',
  FAIL: '실패',
};

export interface ScenarioDeployStatusDrawerRef {
  open: (args: { serviceId: number; serviceName?: string }) => void;
  close: () => void;
}

const ScenarioDeployStatusDrawer = forwardRef<ScenarioDeployStatusDrawerRef>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [, setServiceName] = useState<string | undefined>(undefined);

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

  return (
    <Drawer title="배포 현황" placement="right" width={520} open={visible} onClose={() => setVisible(false)} closable={{ placement: 'end' }} destroyOnHidden>
      <div className="w-full h-full flex flex-col">
        {/* 헤더 — 배포 설정과 동일한 패턴 */}
        <div className="flex items-center gap-2 mb-4">
          <Activity className="size-6 text-[#9599AD]" />
          <span className="text-lg text-[#212529] font-bold">시나리오 적용 시스템 현황</span>
        </div>
        <div className="mb-2">
          <span className="text-base text-[#495057] font-medium">총 {rows.length}대</span>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 py-8">로딩 중...</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 py-12 gap-3">
            <ServerOff className="size-12" />
            <Empty description="할당된 시스템이 없습니다" />
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto">
            {rows.map((s: DeployedSystem) => {
              const statusColor =
                s.applyStatus === 'APPLIED'
                  ? 'green'
                  : s.applyStatus === 'SEND_FAIL' || s.applyStatus === 'CMD_FAIL' || s.applyStatus === 'APPLY_FAIL'
                    ? 'red'
                    : s.applyStatus === 'PENDING' || s.applyStatus === 'SEND_OK' || s.applyStatus === 'CMD_OK'
                      ? 'blue'
                      : 'default';
              const isReserved = s.rtResvKind === 'RESERVED' || !!s.applyVer;
              return (
                <div key={s.systemId} className="p-3 rounded-md border border-slate-200 bg-white">
                  {/* 헤더: 시스템명 + 상태 */}
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="size-4 text-[#405189] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 truncate">{s.systemName ?? `System ${s.systemId}`}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {s.systemRole ?? '-'}
                        {s.ipAddress ? ` · ${s.ipAddress}` : ''}
                        {s.nodeId != null ? ` · node ${s.nodeId}` : ''}
                        {s.haGroupId != null ? ` · HA그룹 ${s.haGroupId}` : ''}
                      </div>
                    </div>
                    <Tag color={statusColor} className="!m-0 flex-shrink-0">
                      {(s.applyStatus && APPLY_STATUS_LABELS[s.applyStatus]) ?? s.applyStatus ?? '-'}
                    </Tag>
                  </div>

                  {/* 버전 정보 */}
                  <div className="grid grid-cols-3 gap-2 mb-2 text-[11px] ml-6">
                    <div>
                      <div className="text-slate-400">현재 적용</div>
                      <div className="font-semibold text-slate-800">{s.serviceVer ?? '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">이전 적용</div>
                      <div className="text-slate-700">{s.priorVer ?? '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">예약 대기</div>
                      <div>
                        {s.applyVer ? (
                          <Tag color="orange" className="!m-0">
                            {s.applyVer}
                          </Tag>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 결과 / 일시 / 작업자 */}
                  <div className="space-y-1 text-[11px] ml-6">
                    {s.applyResult && (
                      <div className="flex gap-2 text-slate-600">
                        <span className="text-slate-400 w-16 flex-shrink-0">적용 결과</span>
                        <span>{APPLY_RESULT_LABELS[s.applyResult] ?? s.applyResult}</span>
                      </div>
                    )}
                    {s.applyDatetime && (
                      <div className="flex gap-2 text-slate-600">
                        <span className="text-slate-400 w-16 flex-shrink-0">{isReserved ? '예약 일시' : '적용 일시'}</span>
                        <span>{dayjs(s.applyDatetime).format('YYYY-MM-DD HH:mm:ss')}</span>
                      </div>
                    )}
                    {s.workTime && (
                      <div className="flex gap-2 text-slate-600">
                        <span className="text-slate-400 w-16 flex-shrink-0">작업 시각</span>
                        <span>{dayjs(s.workTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                      </div>
                    )}
                    {(s.workUserName || s.workUser != null) && (
                      <div className="flex gap-2 text-slate-600">
                        <span className="text-slate-400 w-16 flex-shrink-0">작업자</span>
                        <span>{s.workUserName ?? `user#${s.workUser}`}</span>
                      </div>
                    )}
                    {s.svcResvId && (
                      <div className="flex gap-2 text-slate-600">
                        <span className="text-slate-400 w-16 flex-shrink-0">예약 ID</span>
                        <span className="font-mono">{s.svcResvId}</span>
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
