import { Fragment } from 'react';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { APPLY_STATUS, SCENARIO_TYPE_LABELS, type Scenario, type ScenarioDeploySummary } from '../types';
import { IconAlertTriangle, IconMoreVertical } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ScenarioCardProps = {
  scenario: Scenario;
  onDetail?: (serviceId: number) => void;
  onDelete?: (scenario: Scenario) => void;
  onShowAssigned?: () => void;
  /** 신규 등록 직후 포커싱 하이라이트(다른 페이지 카드 선택과 동일한 테두리/그림자) */
  highlighted?: boolean;
};

/** 카드에 노출할 배포 시스템 최대 개수 (초과분은 "+N개 더"로 접고 상세 모달로 안내).
 *  카드 높이(h-[236px])상 실제로 잘리지 않고 보이는 행 수가 2개라, 보이는 수와 "+N"이 일치하도록 2로 맞춤. */
const MAX_VISIBLE_SYSTEMS = 2;

/** FCA DeployStatusBadge 색상 팔레트 차용 */
const BADGE_CLS = {
  applied: 'text-[#0AB39C] bg-[#0AB39C1A]',
  reserved: 'text-[#F7B84B] bg-[#F7B84B1A]',
  fail: 'text-[#F06548] bg-[#F065481A]',
  progress: 'text-[#1F79D4] bg-[#1F79D41A]',
  none: 'text-[#495057] bg-[#E9EBEC]',
};

const FAIL_STATUSES: number[] = [APPLY_STATUS.SEND_FAIL, APPLY_STATUS.CMD_FAIL, APPLY_STATUS.APPLY_FAIL];

type DeployKind = 'applied' | 'reserved' | 'fail' | 'progress';

function kindOf(d: ScenarioDeploySummary): DeployKind {
  const s = d.applyStatus;
  if (s === APPLY_STATUS.APPLIED) return 'applied';
  if (s === APPLY_STATUS.PENDING) return 'reserved';
  if (s != null && FAIL_STATUSES.includes(s)) return 'fail';
  if (s == null && d.serviceVer) return 'applied'; // 상태 미상이나 적용버전 있으면 배포로 간주
  return 'progress';
}

/** 시스템 행 표시 — 상태 대신 결과(성공/실패/예약/진행)로 표기 */
const RESULT_LABEL: Record<DeployKind, string> = { applied: '성공', fail: '실패', reserved: '예약', progress: '진행' };

function rowView(d: ScenarioDeploySummary) {
  const kind = kindOf(d);
  const ver = kind === 'reserved' ? (d.applyVer ?? d.serviceVer) : (d.serviceVer ?? d.applyVer);
  const color = kind === 'fail' ? 'text-[#F06548]' : kind === 'applied' ? 'text-[#0AB39C]' : kind === 'reserved' ? 'text-[#F7B84B]' : 'text-[#1F79D4]';
  const time = d.applyDatetime ? dayjs(d.applyDatetime).format('MM-DD HH:mm') : '-';
  return { ver: ver ?? '-', color, label: RESULT_LABEL[kind], time };
}

/**
 * IVR 시나리오 카드 (FCA AOE Agent 카드 FaqAgentCard UI 차용).
 * <p>글자 색/폰트/사이즈/여백 동일(antd Card, text-[#495057], w-[104px] 라벨 행).
 * 배포여부는 FCA DeployStatusBadge 색상 배지로 표시. 카드 높이 균일·상세보기 버튼 하단 고정. 버전 개수 미표시.</p>
 */
export default function ScenarioCard({ scenario, onDetail, onDelete, onShowAssigned, highlighted }: ScenarioCardProps) {
  const { serviceId, serviceName, serviceType, mentfilePath, deploySystems = [] } = scenario;

  const counts = { applied: 0, reserved: 0, fail: 0, progress: 0 };
  let latest: string | null = null;
  deploySystems.forEach((d) => {
    counts[kindOf(d)] += 1;
    if (d.applyDatetime && (latest == null || d.applyDatetime > latest)) latest = d.applyDatetime;
  });
  const latestText = latest ? dayjs(latest).format('YYYY-MM-DD HH:mm') : '-';

  const visible = deploySystems.slice(0, MAX_VISIBLE_SYSTEMS);
  const restCount = deploySystems.length - visible.length;

  const title = (
    <span className="block truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" title={serviceName} onClick={() => onDetail?.(serviceId)}>
      {serviceName}
    </span>
  );

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end">
        <DropdownMenuItem onClick={() => onDetail?.(serviceId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete?.(scenario)} className="hover:cursor-pointer">
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const badgeBase = 'text-[13px] leading-[13px] font-medium !h-6 gap-1';

  return (
    <Card
      id={`scenario-card-${serviceId}`}
      title={title}
      styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      extra={extra}
      className={cn('transition-shadow hover:!border-[var(--color-bt-primary)]', highlighted && '!border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.25)]')}
    >
      <div className="flex flex-col h-[236px] text-[#495057]">
        <div className="flex flex-col gap-2">
          <div className="flex">
            <span className="w-[104px] shrink-0">시나리오 타입</span>
            <span className="mr-2">{SCENARIO_TYPE_LABELS[serviceType] ?? serviceType}</span>
          </div>
          <div className="flex">
            <span className="w-[104px] shrink-0">멘트 위치</span>
            <span className="mr-2 truncate" title={mentfilePath || undefined}>
              {mentfilePath || '-'}
            </span>
          </div>
          <div className="flex items-start">
            <span className="w-[104px] shrink-0">배포 여부</span>
            <div className="flex flex-wrap gap-1.5">
              {deploySystems.length === 0 ? (
                <Badge variant="secondary" className={cn(badgeBase, BADGE_CLS.none)}>
                  미배포
                </Badge>
              ) : (
                <>
                  {counts.applied > 0 && (
                    <Badge variant="secondary" className={cn(badgeBase, BADGE_CLS.applied)}>
                      배포 {counts.applied}
                    </Badge>
                  )}
                  {counts.reserved > 0 && (
                    <Badge variant="secondary" className={cn(badgeBase, BADGE_CLS.reserved)}>
                      예약 {counts.reserved}
                    </Badge>
                  )}
                  {counts.fail > 0 && (
                    <Badge variant="secondary" className={cn(badgeBase, BADGE_CLS.fail)}>
                      실패 {counts.fail}
                      <IconAlertTriangle className="!size-4 text-[#F06548]" />
                    </Badge>
                  )}
                  {counts.progress > 0 && (
                    <Badge variant="secondary" className={cn(badgeBase, BADGE_CLS.progress)}>
                      진행 {counts.progress}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex">
            <span className="w-[104px] shrink-0">최근 배포</span>
            <span className="mr-2">{latestText}</span>
          </div>
        </div>

        {/* 배포 시스템 — 컬럼 헤더 + 정렬 그리드(작은 글씨로 위계 구분) */}
        <div className="flex-1 min-h-0 mt-3 pt-2.5 border-t border-gray-100 overflow-hidden">
          {deploySystems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[13px] text-gray-400">아직 배포된 시스템이 없습니다</div>
          ) : (
            // 모든 열 좌측 정렬 + 버전·시간은 고정폭 숫자(tabular)로 세로 정렬을 맞춘다
            <div className="grid grid-cols-[minmax(0,1fr)_56px_48px_92px] items-center gap-x-3 gap-y-1.5 text-[13px]">
              <span className="text-[11px] text-gray-400">시스템</span>
              <span className="text-[11px] text-gray-400">버전</span>
              <span className="text-[11px] text-gray-400">결과</span>
              <span className="text-[11px] text-gray-400">시간</span>
              {visible.map((d) => {
                const v = rowView(d);
                const sysName = d.systemName ?? `#${d.systemId}`;
                return (
                  <Fragment key={d.systemId}>
                    <span className="truncate text-gray-700" title={sysName}>
                      {sysName}
                    </span>
                    <span className="font-mono tabular-nums text-gray-500 truncate">{v.ver}</span>
                    <span className={cn('truncate', v.color)}>{v.label}</span>
                    <span className="font-mono tabular-nums text-gray-400">{v.time}</span>
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* 더보기 — 카드 하단 고정 (배포된 시스템이 있을 때만 노출) */}
        {deploySystems.length > 0 && (
          <button type="button" className="mt-2 self-start text-[13px] text-[var(--color-bt-primary)] hover:underline" onClick={() => onShowAssigned?.()}>
            {restCount > 0 ? `+${restCount}개 더보기 ›` : '더보기 ›'}
          </button>
        )}
      </div>
    </Card>
  );
}
