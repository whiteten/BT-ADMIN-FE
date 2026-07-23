/**
 * 시나리오 환경변수 적용 Drawer (항목단위/파일단위 공용, IPR30S3030 적용 화면 회귀).
 *
 * <p>SleeConfigList.tsx의 "항목단위 적용"/"파일단위 적용" 버튼에서 open()으로 진입한다.
 * 대상 시스템 체크 → 실시간/예약 적용 방식 선택 → 전체 Overwrite/백업 옵션 → 제출.</p>
 *
 * forwardRef + useImperativeHandle 패턴.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, DatePicker, Drawer, Input, Radio, Tag, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CheckSquareIcon, FileCog, Info, ListChecks, type LucideIcon, Server, SlidersHorizontal } from 'lucide-react';
import { toast } from '@/shared-util';
import { useApplyItemImmediate, useApplyReservation, useGetSleeConfigIrSystems } from '../hooks/useSleeConfigQueries';
import type { SleeConfigIrSystem, SleeConfigProperty } from '../types';
import SleeConfigApplyResultModal, { type SleeConfigApplyResultModalRef } from './SleeConfigApplyResultModal';

function SectionHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="size-3.5 text-[#405189]" />
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
    </div>
  );
}

export interface SleeConfigApplyDrawerOpenParams {
  /** ITEM: 선택 속성만 / FILE: 환경파일 전체 (백엔드 scope() 자동 판정에 맞춤). */
  mode: 'ITEM' | 'FILE';
  tenantId: number;
  configFile: string;
  /** ITEM 모드의 대상 카테고리. FILE 모드는 null. */
  category: string | null;
  /** ITEM 모드 대상 속성 키(`category::property`). FILE 모드는 빈 Set. */
  selectedPropertyKeys: Set<string>;
  /** 현재 카테고리의 속성 목록 — 예약 모드에서 chgValue prefill 용. FILE 모드는 빈 배열. */
  properties: SleeConfigProperty[];
  /** FILE 모드 안내 문구용 — 환경파일의 전체 카테고리 개수. */
  categoryCount: number;
}

export interface SleeConfigApplyDrawerRef {
  open: (params: SleeConfigApplyDrawerOpenParams) => void;
  close: () => void;
}

interface State extends SleeConfigApplyDrawerOpenParams {
  visible: boolean;
}

const INITIAL_STATE: State = {
  visible: false,
  mode: 'ITEM',
  tenantId: 0,
  configFile: '',
  category: null,
  selectedPropertyKeys: new Set(),
  properties: [],
  categoryCount: 0,
};

const SleeConfigApplyDrawer = forwardRef<SleeConfigApplyDrawerRef>((_, ref) => {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [applyTiming, setApplyTiming] = useState<'REALTIME' | 'RESERVED'>('REALTIME');
  const [overwriteOn, setOverwriteOn] = useState(false);
  const [useBackupOn, setUseBackupOn] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [reservationAt, setReservationAt] = useState<Dayjs | null>(null);
  const [checkedSystemIds, setCheckedSystemIds] = useState<Set<number>>(new Set());
  // Drawer 열고 시스템 첫 로드 시점에만 자동 전체 체크. 이후 사용자 수동 해제 가능.
  const autoCheckDoneRef = useRef(false);
  const applyResultModalRef = useRef<SleeConfigApplyResultModalRef>(null);

  const handleClose = () => setState((prev) => ({ ...prev, visible: false }));

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setApplyTiming('REALTIME');
      setOverwriteOn(false);
      setUseBackupOn(false);
      setApplyReason('');
      setReservationAt(dayjs().add(10, 'minute'));
      setCheckedSystemIds(new Set()); // Drawer 데이터 로드 후 자동 체크 (useRef 가드)
      setState({ ...params, visible: true });
    },
    close: handleClose,
  }));

  const { visible, mode, tenantId, configFile, category, selectedPropertyKeys, properties, categoryCount } = state;

  const irSystemParams = useMemo(() => (tenantId && configFile ? { tenantId, configFile } : undefined), [tenantId, configFile]);
  const { data: irSystems = [] } = useGetSleeConfigIrSystems({
    params: irSystemParams,
    queryOptions: { enabled: visible && !!tenantId && !!configFile },
  });

  const { mutate: applyImmediate, isPending: isApplyingImmediate } = useApplyItemImmediate({
    mutationOptions: {
      onSuccess: (results) => {
        // 시스템별 결과를 모달로 표시 (적용됨 / 변경사항 없음 / 실패 3-state)
        applyResultModalRef.current?.open(results);

        const failCount = results.filter((r) => !r.success).length;
        const appliedCount = results.filter((r) => r.success && r.changed).length;
        const nochangeCount = results.filter((r) => r.success && !r.changed).length;
        if (failCount > 0) {
          toast.warning(`적용 ${appliedCount} · 변경없음 ${nochangeCount} · 실패 ${failCount}`);
        } else if (appliedCount === 0) {
          // 전부 동일 — 실제 반영된 변경이 없음
          toast.info('변경사항 없음 — 모든 시스템이 이미 동일합니다.');
        } else {
          toast.success(`${appliedCount}개 시스템에 적용 완료${nochangeCount > 0 ? ` · 변경없음 ${nochangeCount}` : ''}`);
        }
        handleClose();
      },
      onError: () => {
        toast.error('즉시 적용 요청이 실패했습니다.');
      },
    },
  });

  const { mutate: applyReservation, isPending: isApplyingReservation } = useApplyReservation({
    mutationOptions: {
      onSuccess: (result) => {
        // svcResvId 가 없으면 변경분이 없어 예약이 생성되지 않은 것 (즉시 적용의 "변경사항 없음"과 동일 정책)
        if (!result.svcResvId) {
          toast.info('변경사항 없음 — 예약할 변경 내용이 없습니다.');
          handleClose();
          return;
        }
        toast.success(`예약 등록 완료 (insert=${result.configSystemInserted}, update=${result.configSystemUpdated})`);
        handleClose();
      },
      onError: () => {
        toast.error('예약 등록 요청이 실패했습니다.');
      },
    },
  });

  const isApplying = isApplyingImmediate || isApplyingReservation;

  const handleSystemCheck = useCallback((systemId: number, checked: boolean) => {
    setCheckedSystemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(systemId);
      else next.delete(systemId);
      return next;
    });
  }, []);

  const handleSystemCheckAll = useCallback((checked: boolean, allIds: number[]) => {
    setCheckedSystemIds(checked ? new Set(allIds) : new Set());
  }, []);

  const handleSubmitApply = useCallback(() => {
    if (!tenantId || !configFile) return;
    if (checkedSystemIds.size === 0) return;
    if (mode === 'ITEM') {
      // ITEM: category + properties 필수
      if (!category || selectedPropertyKeys.size === 0) return;
    }

    const targetSystemIds = Array.from(checkedSystemIds);
    // ITEM: 선택 속성만 / FILE: 환경파일 전체 (백엔드 scope() 가 properties 빈 배열 → FILE 로 자동 판정)
    const selectedPropertyNames = mode === 'ITEM' ? Array.from(selectedPropertyKeys).map((key) => key.split('::')[1]) : [];
    // ITEM 은 category 가 보장됨 (위 validation), FILE 은 undefined → 백엔드 scope=FILE 판정.
    const requestCategory: string | undefined = mode === 'ITEM' ? (category ?? undefined) : undefined;

    const trimmedReason = applyReason.trim();

    if (applyTiming === 'REALTIME') {
      applyImmediate({
        tenantId,
        configFile,
        category: requestCategory,
        properties: selectedPropertyNames,
        targetSystemIds,
        chgOverride: overwriteOn,
        useBackup: useBackupOn,
        applyReason: trimmedReason || undefined,
      });
      return;
    }

    // 예약 모드.
    //   ITEM: 각 property 의 현재 USERCONFIG.value 를 chgValue 로 prefill.
    //   FILE: propertyChanges 비움 — 백엔드가 USERCONFIG vs CONFIGSYSTEM diff 로 자동 산출.
    if (!reservationAt) {
      toast.warning('예약 시각을 선택하세요.');
      return;
    }
    if (reservationAt.isBefore(dayjs())) {
      toast.warning('예약 시각은 현재 시각 이후여야 합니다.');
      return;
    }

    const propertyChanges =
      mode === 'ITEM'
        ? (() => {
            const propertyByName = new Map(properties.map((p) => [p.property, p]));
            return selectedPropertyNames.map((name) => ({
              property: name,
              chgValue: propertyByName.get(name)?.value ?? '',
            }));
          })()
        : [];

    applyReservation({
      tenantId,
      configFile,
      category: requestCategory,
      propertyChanges,
      targetSystemIds,
      applyDatetime: reservationAt.format('YYYY-MM-DDTHH:mm:ss'),
      applyReason: trimmedReason || undefined,
    });
  }, [
    mode,
    tenantId,
    configFile,
    category,
    checkedSystemIds,
    selectedPropertyKeys,
    applyImmediate,
    applyReservation,
    applyTiming,
    overwriteOn,
    useBackupOn,
    applyReason,
    reservationAt,
    properties,
  ]);

  // Drawer 첫 진입 시 시스템 목록 로드 1회만 자동 전체 체크 (예약중 시스템 제외).
  //   - checkedSystemIds.size 를 dep 에 넣지 않음 → 사용자가 해제하면 그대로 유지.
  //   - visible=false 로 닫힐 때 ref 리셋 → 다음 진입 시 다시 1회 자동 체크.
  //   - 예약중(svcResvId 있음) 시스템은 적용 대상에서 제외.
  useEffect(() => {
    if (!visible) {
      autoCheckDoneRef.current = false;
      return;
    }
    if (!autoCheckDoneRef.current && irSystems.length > 0) {
      const checkableIds = irSystems.filter((s) => !s.svcResvId).map((s) => s.systemId);
      setCheckedSystemIds(new Set(checkableIds));
      autoCheckDoneRef.current = true;
    }
  }, [visible, irSystems]);

  return (
    <>
      {/* ===== 적용 Drawer (MS관리 멤버관리 패턴 동일 — footer 포함) ===== */}
      <Drawer
        title={mode === 'ITEM' ? '항목단위 적용' : '파일단위 적용'}
        closable={{ placement: 'end' }}
        placement="right"
        open={visible}
        onClose={handleClose}
        styles={{ wrapper: { width: 580 }, body: { display: 'flex', flexDirection: 'column' } }}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              대상 시스템: {checkedSystemIds.size}/{irSystems.filter((s) => !s.svcResvId).length}
              {irSystems.some((s) => s.svcResvId) && <span className="text-slate-400"> · 예약중 {irSystems.filter((s) => !!s.svcResvId).length} 제외</span>}
            </span>
            <div className="flex gap-2">
              <Button onClick={handleClose}>취소</Button>
              <Button
                type="primary"
                loading={isApplying}
                disabled={checkedSystemIds.size === 0 || (mode === 'ITEM' && selectedPropertyKeys.size === 0) || (applyTiming === 'RESERVED' && !reservationAt)}
                onClick={handleSubmitApply}
              >
                적용
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* 선택된 항목 정보 — ITEM/FILE 분기 */}
          <div className="flex-shrink-0">
            <SectionHeader icon={mode === 'ITEM' ? CheckSquareIcon : FileCog} label={mode === 'ITEM' ? '선택된 항목' : '대상 환경파일'} />
            <div className="border border-slate-200 rounded-md p-3 bg-white">
              {mode === 'ITEM' ? (
                <>
                  <div className="text-[13px] font-semibold text-slate-800">{selectedPropertyKeys.size}개 속성</div>
                  <div className="text-[12px] text-slate-500 mt-1 truncate">
                    {configFile} / {category}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[13px] font-semibold text-slate-800 truncate">{configFile}</div>
                  <div className="text-[12px] text-slate-500 mt-1">카테고리 {categoryCount}개 · 환경파일 전체 반영</div>
                </>
              )}
            </div>
          </div>

          {/* 대상 시스템 목록 */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-slate-700 inline-flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-[#405189]" />
                대상 시스템 ({checkedSystemIds.size}/{irSystems.filter((s) => !s.svcResvId).length})
              </span>
              {irSystems.filter((s) => !s.svcResvId).length > 0 &&
                (() => {
                  const checkable = irSystems.filter((s) => !s.svcResvId);
                  const allChecked = checkable.length > 0 && checkable.every((s) => checkedSystemIds.has(s.systemId));
                  const someChecked = checkable.some((s) => checkedSystemIds.has(s.systemId));
                  return (
                    <Checkbox
                      checked={allChecked}
                      indeterminate={!allChecked && someChecked}
                      onChange={(e) =>
                        handleSystemCheckAll(
                          e.target.checked,
                          checkable.map((s) => s.systemId),
                        )
                      }
                    >
                      <span className="text-[12px] text-slate-500">전체</span>
                    </Checkbox>
                  );
                })()}
            </div>
            {irSystems.length === 0 ? (
              <div className="text-center text-slate-400 text-[13px] py-4 border border-dashed border-slate-200 rounded-md">적용 가능한 IR 시스템이 없습니다.</div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {irSystems.map((sys: SleeConfigIrSystem) => {
                  const reserved = !!sys.svcResvId;
                  return (
                    <label
                      key={sys.systemId}
                      className={`flex items-center gap-2 p-2.5 rounded-md border border-slate-200 bg-white ${
                        reserved ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#c5cbe0]'
                      }`}
                    >
                      <Checkbox checked={checkedSystemIds.has(sys.systemId)} disabled={reserved} onChange={(e) => handleSystemCheck(sys.systemId, e.target.checked)} />
                      <Server className="size-4 text-[#405189]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-slate-800 truncate">{sys.systemName}</div>
                        <div className="text-[12px] text-slate-400 truncate">
                          {sys.nodeName ?? `Node ${sys.nodeId}`}
                          {sys.haGroupName ? ` · ${sys.haGroupName}` : ''}
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

          {/* 적용 설정 — 하단 고정. layout shift 방지: 모드 토글해도 영역 높이 변화 없음. */}
          <div className="flex-shrink-0">
            <SectionHeader icon={SlidersHorizontal} label="적용 설정" />
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="w-full text-[12px]">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <th className="w-[84px] bg-slate-50 px-3 py-2.5 text-left align-top font-medium text-slate-600">적용 방식</th>
                    <td className="px-3 py-2.5">
                      {/* 적용 방식 + 예약 시각 인라인. DatePicker 는 실시간 모드에서도 자리 점유 (disabled). */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Radio.Group
                          value={applyTiming}
                          onChange={(e) => {
                            const v = e.target.value;
                            setApplyTiming(v);
                            // 예약 선택 시 기본 예약시각 = 현재 +1시간 (레거시 setApplyStatus 동등)
                            if (v === 'RESERVED' && !reservationAt) setReservationAt(dayjs().add(1, 'hour'));
                          }}
                        >
                          <Radio value="REALTIME">실시간</Radio>
                          <Radio value="RESERVED">예약(대기)</Radio>
                        </Radio.Group>
                        <DatePicker
                          showTime={{ format: 'HH:mm', minuteStep: 5 }}
                          format="YYYY-MM-DD HH:mm"
                          value={reservationAt}
                          onChange={(v) => setReservationAt(v)}
                          disabled={applyTiming !== 'RESERVED'}
                          disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                          placeholder="예약 시각"
                          style={{ width: 200 }}
                        />
                        <Tooltip title="현재 USERCONFIG 값을 예약 시각에 시스템에 반영합니다.">
                          <Info className="size-3.5 text-slate-400 cursor-help" />
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <th className="w-[84px] bg-slate-50 px-3 py-2.5 text-left align-top font-medium text-slate-600">적용 옵션</th>
                    <td className="px-3 py-2.5">
                      {/* 전체 Overwrite + 백업 — 항상 표시, 예약 모드일 때 disabled. */}
                      <div className="flex items-center gap-3">
                        <Tooltip
                          title={
                            applyTiming === 'RESERVED'
                              ? '예약 모드에서는 사용되지 않습니다 (실시간 적용 전용).'
                              : 'USERCONFIG 기준으로 CONFIGSYSTEM 을 강제 재구성 (delete + insert).'
                          }
                        >
                          <Checkbox checked={overwriteOn} disabled={applyTiming === 'RESERVED'} onChange={(e) => setOverwriteOn(e.target.checked)}>
                            전체 Overwrite
                          </Checkbox>
                        </Tooltip>
                        <Tooltip
                          title={
                            applyTiming === 'RESERVED'
                              ? '예약 모드에서는 사용되지 않습니다 (실시간 적용 전용).'
                              : '적용 전 TB_IR_SLEE_USERCONFIG 의 (테넌트, 환경파일) 전체를 스냅샷으로 보관 (최신 4개 묶음 유지).'
                          }
                        >
                          <Checkbox checked={useBackupOn} disabled={applyTiming === 'RESERVED'} onChange={(e) => setUseBackupOn(e.target.checked)}>
                            백업
                          </Checkbox>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th className="w-[84px] bg-slate-50 px-3 py-2.5 text-left align-top font-medium text-slate-600">적용 사유</th>
                    <td className="px-3 pt-2.5 pb-5">
                      <Input.TextArea
                        value={applyReason}
                        onChange={(e) => setApplyReason(e.target.value)}
                        placeholder="적용 이력에 기록할 사유를 입력하세요"
                        rows={4}
                        maxLength={500}
                        showCount
                        classNames={{ count: 'text-[10px]' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Drawer>

      <SleeConfigApplyResultModal ref={applyResultModalRef} />
    </>
  );
});
SleeConfigApplyDrawer.displayName = 'SleeConfigApplyDrawer';
export default SleeConfigApplyDrawer;
