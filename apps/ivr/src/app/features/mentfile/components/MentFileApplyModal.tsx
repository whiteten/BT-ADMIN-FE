/**
 * 멘트파일 적용 Drawer (AS-IS IPR30S3020 적용 팝업) — 즉시/예약 통합.
 *
 * <p>시각 패턴: 시나리오 배포 사이드바({@code ScenarioDeploySidebar}) 통일 — Drawer placement="right",
 * bg-slate-50 메타 카드, div 기반 시스템 카드 리스트.</p>
 *
 * <p>도메인 차이:</p>
 * <ul>
 *   <li>시나리오: 배포 설정에서 미리 할당된 시스템 → 읽기 전용</li>
 *   <li>멘트: 사용자가 직접 시스템 선택 (체크박스) + 예약중 시스템 disabled</li>
 *   <li>결과: 멘트×시스템 매트릭스 결과 → Drawer 안에서 영역 전환</li>
 * </ul>
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, DatePicker, Drawer, Radio, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CheckCircle, ListChecks, Server, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import { mentFileQueryKeys, useApplyMentFile, useGetApplyTargets } from '../hooks/useMentFileQueries';
import { MENT_APPLY_STATUS_LABELS, type MentApplyResponse, type MentApplyResultItem, type MentApplyTarget, type MentRtServKind } from '../types';

export interface MentFileApplyModalRef {
  open: (mentfileIds: number[]) => void;
  close: () => void;
}

const MentFileApplyModal = forwardRef<MentFileApplyModalRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [mentfileIds, setMentfileIds] = useState<number[]>([]);
  const [rtServKind, setRtServKind] = useState<MentRtServKind>(0);
  const [reservationAt, setReservationAt] = useState<Dayjs | null>(null);
  const [checkedSystems, setCheckedSystems] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<MentApplyResponse | null>(null);
  // 자동 전체 체크는 1회만 — 사용자가 직접 해제할 수 있도록 보장 (이전엔 checkedSystems.size=0 일 때 다시 자동 체크돼 무한 토글)
  const autoCheckDoneRef = useRef(false);

  const firstMentfileId = mentfileIds[0];

  // ─── 적용 대상 시스템 로드 (첫 멘트 기준 메타 — 실 적용은 BE 에서 systemIds 기반 재조회) ───
  const { data: targets = [], isFetching } = useGetApplyTargets({
    params: firstMentfileId != null ? { mentfileId: firstMentfileId } : undefined,
    queryOptions: { enabled: visible && firstMentfileId != null },
  });

  // 첫 로드 시 예약 안 된 시스템 자동 전체 체크 — autoCheckDoneRef 로 1회만
  useEffect(() => {
    if (!visible || isFetching || targets.length === 0) return;
    if (autoCheckDoneRef.current) return;
    autoCheckDoneRef.current = true;

    const auto = new Set<number>();
    targets.forEach((t) => {
      if (!t.svcResvId) auto.add(t.systemId);
    });
    setCheckedSystems(auto);
  }, [visible, isFetching, targets]);

  const checkableTargets = useMemo(() => targets.filter((t) => !t.svcResvId), [targets]);
  const reservedCount = targets.length - checkableTargets.length;

  // ─── 적용 mutation ──────────────────────────────────────────────────────
  const { mutate: applyMutate, isPending } = useApplyMentFile({
    mutationOptions: {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: mentFileQueryKeys.list.queryKey });
        queryClient.invalidateQueries({ queryKey: mentFileQueryKeys.applyTargets._def });

        if (data.failCount === 0) {
          toast.success(rtServKind === 0 ? `즉시 적용 성공 — ${data.successCount}건` : `예약 적용 등록 — ${data.successCount}건 (예약 ID: ${data.svcResvId})`);
        } else if (data.successCount === 0) {
          toast.error(`적용 실패 — 전체 ${data.failCount}건 실패`);
        } else {
          toast.warning(`결과: 성공 ${data.successCount} / 실패 ${data.failCount}`);
        }
      },
      onError: (err) => toast.error(`적용 실패: ${(err as Error).message ?? '알 수 없는 오류'}`),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (ids) => {
      setMentfileIds(ids);
      setRtServKind(0);
      setReservationAt(null);
      setCheckedSystems(new Set());
      setResult(null);
      autoCheckDoneRef.current = false; // 다음 open 시 다시 1회 자동 체크 허용
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const handleSubmit = () => {
    if (checkedSystems.size === 0) {
      toast.warning('적용할 시스템을 선택하세요.');
      return;
    }
    if (rtServKind === 2) {
      if (!reservationAt) {
        toast.warning('예약 일시를 입력하세요.');
        return;
      }
      if (!reservationAt.isAfter(dayjs())) {
        toast.warning('예약 일시는 현재 시각 이후여야 합니다.');
        return;
      }
    }
    applyMutate({
      mentfileIds,
      systemIds: Array.from(checkedSystems),
      rtServKind,
      // BE 는 LocalDateTime (timezone 없음) 으로 파싱 — toISOString() 의 UTC 문자열 을 보내면 시각이 9시간 빠지는 timezone 버그 발생.
      // 로컬 시각 그대로 전송: "2026-06-08T17:35:00"
      applyDatetime: rtServKind === 2 ? reservationAt?.format('YYYY-MM-DDTHH:mm:ss') : undefined,
    });
  };

  const handleCheckAll = (checked: boolean) => {
    if (checked) setCheckedSystems(new Set(checkableTargets.map((t) => t.systemId)));
    else setCheckedSystems(new Set());
  };

  const handleSystemCheck = (systemId: number, checked: boolean) => {
    setCheckedSystems((prev) => {
      const next = new Set(prev);
      if (checked) next.add(systemId);
      else next.delete(systemId);
      return next;
    });
  };

  const allChecked = checkableTargets.length > 0 && checkableTargets.every((t) => checkedSystems.has(t.systemId));
  const someChecked = checkableTargets.some((t) => checkedSystems.has(t.systemId));

  return (
    <Drawer
      title="멘트파일 적용"
      closable={{ placement: 'end' }}
      placement="right"
      styles={{ wrapper: { width: 560 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            대상 시스템: {checkedSystems.size}/{checkableTargets.length}
            {reservedCount > 0 && <span className="text-slate-400"> · 예약중 {reservedCount} 제외</span>}
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setVisible(false)}>{result ? '닫기' : '취소'}</Button>
            {!result && (
              <Button type="primary" loading={isPending} disabled={checkedSystems.size === 0} onClick={handleSubmit}>
                {rtServKind === 0 ? '즉시 적용' : '예약 등록'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {!result ? (
        <div className="flex flex-col gap-4">
          {/* 선택된 멘트파일 정보 — 메타 카드 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">선택된 멘트파일</div>
            <div className="text-[13px] font-semibold text-slate-800">{mentfileIds.length}건</div>
            <div className="text-[11px] text-slate-500 mt-1">이미 예약된 시스템은 선택할 수 없습니다.</div>
          </div>

          {/* 대상 시스템 목록 — 체크박스 카드 리스트 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-slate-700 inline-flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-[#405189]" />
                대상 시스템 ({checkedSystems.size}/{checkableTargets.length})
              </span>
              {checkableTargets.length > 0 && (
                <Checkbox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={(e) => handleCheckAll(e.target.checked)}>
                  <span className="text-[12px] text-slate-500">전체</span>
                </Checkbox>
              )}
            </div>
            {targets.length === 0 ? (
              <div className="text-center text-slate-400 text-[13px] py-4 border border-dashed border-slate-200 rounded-md">적용 가능한 IR 시스템이 없습니다.</div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {targets.map((sys: MentApplyTarget) => {
                  const reserved = !!sys.svcResvId;
                  return (
                    <label
                      key={sys.systemId}
                      className={`flex items-center gap-2 p-2.5 rounded-md border border-slate-200 bg-white ${
                        reserved ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#c5cbe0]'
                      }`}
                    >
                      <Checkbox checked={checkedSystems.has(sys.systemId)} disabled={reserved} onChange={(e) => handleSystemCheck(sys.systemId, e.target.checked)} />
                      <Server className="size-4 text-[#405189]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-slate-800 truncate">{sys.systemName}</div>
                        <div className="text-[12px] text-slate-400 truncate">
                          {sys.nodeName ?? `Node ${sys.nodeId ?? '-'}`}
                          {sys.ioIpAddress ? ` · ${sys.ioIpAddress}` : ''}
                        </div>
                      </div>
                      {reserved && (
                        <Tag color="blue" className="!m-0 !text-[11px] !leading-5 !py-0">
                          예약중
                        </Tag>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 적용 방식 — 인라인 Radio + DatePicker */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] text-slate-600 flex-shrink-0">적용 방식</span>
              <Radio.Group
                value={rtServKind}
                onChange={(e) => {
                  const next = e.target.value as MentRtServKind;
                  setRtServKind(next);
                  if (next === 2 && !reservationAt) {
                    setReservationAt(dayjs().add(1, 'hour').startOf('hour'));
                  }
                }}
              >
                <Radio value={0}>즉시</Radio>
                <Radio value={2}>예약</Radio>
              </Radio.Group>
              <DatePicker
                showTime={{ format: 'HH:mm', minuteStep: 10 }}
                format="YYYY-MM-DD HH:mm"
                value={reservationAt}
                onChange={setReservationAt}
                disabled={rtServKind !== 2}
                disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                placeholder="예약 시각"
                style={{ width: 200 }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ===== 적용 결과 ===== */
        <div className="flex flex-col gap-4">
          {/* 결과 요약 카드 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">적용 결과</div>
            <div className="text-[13px] text-slate-800">
              전체 <b>{result.totalCount}</b> · 성공 <b className="text-green-600">{result.successCount}</b> · 실패 <b className="text-red-600">{result.failCount}</b>
            </div>
            {result.svcResvId && (
              <div className="text-[11px] text-slate-500 mt-1">
                예약 ID: <b>{result.svcResvId}</b>
              </div>
            )}
          </div>

          {/* 결과 매트릭스 — 멘트 × 시스템 */}
          <div>
            <div className="text-[12px] font-semibold text-slate-700 mb-2">결과 상세 ({result.results.length})</div>
            <div className="space-y-2">
              {result.results.map((r: MentApplyResultItem) => (
                <div
                  key={`${r.mentfileId}-${r.systemId}`}
                  className={`flex items-center gap-2 p-2.5 rounded-md border ${r.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  {r.success ? <CheckCircle className="size-4 text-green-600 flex-shrink-0" /> : <XCircle className="size-4 text-red-600 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-slate-800 truncate">
                      {r.mentName} → {r.systemName}
                    </div>
                    {r.message && <div className="text-[10px] text-slate-500 truncate">{r.message}</div>}
                  </div>
                  <Tag color={r.success ? 'green' : 'red'}>{MENT_APPLY_STATUS_LABELS[r.applyStatus] ?? r.applyStatus}</Tag>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
});

MentFileApplyModal.displayName = 'MentFileApplyModal';
export default MentFileApplyModal;
