import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, DatePicker, Divider, Radio, Select, TimePicker, Tooltip, TreeSelect, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Camera, Download, Search } from 'lucide-react';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ComparisonToggle from './ComparisonToggle';
import { useExportPanelExcel } from '../../panel/hooks/usePanelQueries';
import { captureChartsToPng } from '../../panel/utils/captureCharts';
import { useReportEditorStore } from '../../report/hooks/useReportEditorStore';
import { useReportViewStore } from '../../report/hooks/useReportViewStore';
import type { PanelType } from '../../report/types';
import { useGetSearchConditionStages, useResolveStageOptions } from '../../search-condition/hooks/useSearchConditionQueries';
import type { SearchCondStage, SqlPreviewResult } from '../../search-condition/types';
import { useTimeUnitLimits } from '../hooks/useTimeUnitLimits';
import { type GlobalConditions, type QuickPreset, type TimeUnit, WEEKDAY_OPTIONS } from '../types';
import { createDisabledDate, createEndDisabledDate, getMaxDays, getRangeLabel, validateDateRange } from '../utils/dateRangeLimit';

interface GlobalFilterProps {
  reportId: number;
  mode: 'editor' | 'view';
}

// ── resolve 결과(value/label/parent/level) → antd TreeSelect 계층 데이터 ──────
type TreeSelectNode = { value: string; title: string; children: TreeSelectNode[] };
function buildTreeSelectData(items: SqlPreviewResult[]): TreeSelectNode[] {
  const nodeMap = new Map<string, TreeSelectNode>();
  const parentOf = new Map<string, string | null>();
  items.forEach((item) => {
    const v = item.value == null ? null : String(item.value);
    if (v == null || nodeMap.has(v)) return; // value 중복 행은 첫 행만
    nodeMap.set(v, { value: v, title: String(item.label ?? v), children: [] });
    parentOf.set(v, item.parent == null ? null : String(item.parent));
  });
  const roots: TreeSelectNode[] = [];
  nodeMap.forEach((node, v) => {
    const p = parentOf.get(v);
    const parentNode = p != null ? nodeMap.get(p) : undefined;
    if (parentNode) parentNode.children.push(node);
    else roots.push(node); // 부모 참조 깨진 항목은 루트로 폴백
  });
  return roots;
}

// ── 데이터셋 동적 검색조건 cascade — 한 검색조건의 단계(node) 체인 렌더 ──────────
// G4-b: 각 단계가 각자 데이터셋 컬럼(nodeFieldMap[nodeCode])으로 필터. 단일 조건은 fallbackFieldName.
interface SearchCondCascadeProps {
  searchCondId: number;
  /** nodeCode → 데이터셋 컬럼(fieldName) 매핑 (cascade 단계별 바인딩). */
  nodeFieldMap: Record<string, string>;
  /** 단일(노드코드 없는) 바인딩의 컬럼 — 루트 단계 폴백. */
  fallbackFieldName?: string;
  /** 보고서 ID — cascade 선택 체인 스냅샷을 보고서별로 저장/복원. */
  reportId: number;
  /** 운영자 모드 조회 대상 테넌트 — 옵션 조회(:tenantId)·스냅샷 키 스코프에 반영. */
  tenantId?: string | null;
  onChange(fieldName: string, val: string | string[] | null): void;
}

function SearchCondCascade({ searchCondId, nodeFieldMap, fallbackFieldName, reportId, tenantId, onChange }: SearchCondCascadeProps) {
  const { data: meta } = useGetSearchConditionStages({ searchCondId });
  const stages = useMemo(() => meta?.stages ?? [], [meta]);
  // 단계별 로컬 선택값 — cascade 구동(자식 조회) + 바인딩 컬럼 전송 양쪽에 사용.
  const [selected, setSelected] = useState<Record<string, string | string[] | null>>({});

  // nodeCode → 유효 부모 nodeCode. parentNodeCode 가 무효(자기참조/미존재)면 직전 단계로 폴백.
  const parentCodeOf = useMemo(() => {
    const codeSet = new Set(stages.map((s) => s.nodeCode));
    const m = new Map<string, string | null>();
    stages.forEach((s, idx) => {
      const pc = s.parentNodeCode;
      if (pc && pc !== s.nodeCode && codeSet.has(pc)) m.set(s.nodeCode, pc);
      else if (s.nodeDepth > 0 && idx > 0) m.set(s.nodeCode, stages[idx - 1].nodeCode);
      else m.set(s.nodeCode, null);
    });
    return m;
  }, [stages]);

  const fieldOf = (stage: SearchCondStage): string | undefined => nodeFieldMap[stage.nodeCode] ?? (stage.nodeDepth === 0 ? fallbackFieldName : undefined);

  // cascade 선택 체인(그룹+하위 단계 전체)을 보고서별 스냅샷으로 저장/복원.
  // searchValues 는 바인딩된 leaf 컬럼만 담아 그룹(부모) 복원이 안 되고, 그룹 미선택이면
  // 하위 옵션 조회가 비활성→선택값 label 도 못 띄운다. 전체 체인을 직접 보관해 해결.
  // 운영자 모드는 테넌트별로 유효 선택값이 다르므로 스냅샷 키를 테넌트로 스코프.
  const snapKey = `insight.report.cascade.${reportId}.${searchCondId}${tenantId ? `.${tenantId}` : ''}`;
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || stages.length === 0) return;
    try {
      const raw = localStorage.getItem(snapKey);
      if (raw) {
        const snap = JSON.parse(raw) as Record<string, string | string[] | null>;
        if (snap && typeof snap === 'object') setSelected(snap);
      }
    } catch {
      /* ignore */
    }
    seededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);
  // 선택 변경 시 스냅샷 저장 (seed 이후에만)
  useEffect(() => {
    if (!seededRef.current) return;
    try {
      localStorage.setItem(snapKey, JSON.stringify(selected));
    } catch {
      /* ignore */
    }
  }, [selected, snapKey]);

  const handleStageChange = (stage: SearchCondStage, val: string | string[] | null) => {
    // 자손 단계 수집 (BFS, 유효 부모 기준) — 부모 변경 시 자손 값·필터 리셋 대상.
    const descendants: SearchCondStage[] = [];
    const collect = (parentCode: string) => {
      stages
        .filter((s) => parentCodeOf.get(s.nodeCode) === parentCode)
        .forEach((child) => {
          descendants.push(child);
          collect(child.nodeCode);
        });
    };
    collect(stage.nodeCode);

    // 상태 갱신은 순수하게.
    setSelected((prev) => {
      const next = { ...prev, [stage.nodeCode]: val };
      descendants.forEach((c) => {
        next[c.nodeCode] = null;
      });
      return next;
    });

    // store 갱신(부수효과)은 updater 밖에서.
    const f = fieldOf(stage);
    if (f) onChange(f, val);
    descendants.forEach((c) => {
      const cf = fieldOf(c);
      if (cf) onChange(cf, null);
    });
  };

  return (
    <>
      {stages.map((stage) => {
        const parentCode = parentCodeOf.get(stage.nodeCode) ?? null;
        return (
          <StageSelect
            key={stage.nodeCode}
            searchCondId={searchCondId}
            stage={stage}
            fallbackTitle={meta?.title}
            hasParent={parentCode != null}
            parentValue={parentCode ? selected[parentCode] : undefined}
            tenantId={tenantId}
            value={selected[stage.nodeCode]}
            onChange={(val) => handleStageChange(stage, val)}
          />
        );
      })}
    </>
  );
}

// ── 단일 단계 Select — inputType별 렌더링 + 부모 선택값 기반 옵션 조회 ──────────
interface StageSelectProps {
  searchCondId: number;
  stage: SearchCondStage;
  fallbackTitle?: string;
  /** 유효 부모 단계가 존재하는지 (cascade 자식 여부). */
  hasParent: boolean;
  parentValue?: string | string[] | null;
  /** 운영자 모드 조회 대상 테넌트 — 옵션 조회(:tenantId) override. */
  tenantId?: string | null;
  value: string | string[] | null;
  onChange(val: string | string[] | null): void;
}

function StageSelect({ searchCondId, stage, fallbackTitle, hasParent, parentValue, tenantId, value, onChange }: StageSelectProps) {
  const parentMissing = hasParent && (parentValue == null || (Array.isArray(parentValue) && parentValue.length === 0));
  // 드롭다운 open 직접 제어 — 바깥 영역 클릭 시에만 닫히도록 (전체선택 체크박스 클릭으로 닫히지 않게)
  const [open, setOpen] = useState(false);
  // 전체선택 헤더 클릭이 유발하는 close(blur) 1회 무시 — 헤더는 드롭다운 내부이므로 닫히면 안 됨
  const suppressCloseRef = useRef(false);
  const handleOpenChange = (next: boolean) => {
    if (!next && suppressCloseRef.current) {
      suppressCloseRef.current = false;
      return;
    }
    setOpen(next);
  };

  const { data, isLoading } = useResolveStageOptions({
    searchCondId,
    nodeCode: stage.nodeCode,
    parentValue: parentValue ?? null,
    tenantId,
    queryOptions: { enabled: !parentMissing },
  });
  const options = (data ?? []).map((o) => ({ value: String(o.value ?? ''), label: String(o.label ?? o.value ?? '') }));
  const inputType = stage.inputType;
  const isMulti = inputType === 'MULTI_SELECT' || inputType === 'TREE_MULTI_SELECT';
  const title = stage.nodeLabel || fallbackTitle || stage.nodeCode;

  // 전체 선택/해제 — 드롭다운 맨 위 체크박스 한 줄. 트리는 리프(SHOW_CHILD)만 대상.
  const selectedArr = Array.isArray(value) ? value : [];
  const treeLeafVals = (() => {
    const items = data ?? [];
    const parents = new Set(items.map((d) => (d.parent == null ? null : String(d.parent))).filter((p): p is string => !!p));
    return items.map((d) => String(d.value ?? '')).filter((v) => v && !parents.has(v));
  })();
  const selectAllHeader = (allVals: string[]) => {
    const checkedCount = allVals.filter((v) => selectedArr.includes(v)).length;
    const allChecked = allVals.length > 0 && checkedCount === allVals.length;
    const indeterminate = checkedCount > 0 && checkedCount < allVals.length;
    return (
      <div
        className="px-3 py-1.5 border-b border-gray-100"
        onMouseDown={(e) => {
          e.preventDefault(); // focus 유지
          suppressCloseRef.current = true; // blur發 close 1회 무시
          window.setTimeout(() => {
            suppressCloseRef.current = false;
          }, 250); // close 안 나면 플래그 자동 해제
        }}
      >
        <Checkbox checked={allChecked} indeterminate={indeterminate} disabled={allVals.length === 0} onChange={(e) => onChange(e.target.checked ? allVals : null)}>
          전체 선택
        </Checkbox>
      </div>
    );
  };

  if (inputType === 'RADIO') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#495057] shrink-0">{title}</span>
        <Radio.Group value={value as string} onChange={(e) => onChange(e.target.value ?? null)} options={options} disabled={isLoading || parentMissing} />
      </div>
    );
  }

  // 계층 복수 선택 — resolve 결과의 parent/level 로 트리 렌더 (평면 Select 아님)
  if (inputType === 'TREE_MULTI_SELECT') {
    const treeData = buildTreeSelectData(data ?? []);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#495057] shrink-0">{title}</span>
        <TreeSelect
          treeData={treeData}
          value={(value as string[]) ?? []}
          open={open}
          onOpenChange={handleOpenChange}
          onChange={(val) => {
            const arr = val as string[];
            onChange(arr.length ? arr : null);
          }}
          treeCheckable
          showCheckedStrategy={TreeSelect.SHOW_CHILD}
          placeholder={parentMissing ? '상위 단계 선택 필요' : `${title} 선택`}
          disabled={parentMissing}
          loading={isLoading}
          allowClear
          treeDefaultExpandAll
          maxTagCount={2}
          maxTagPlaceholder={(omitted) => `+${omitted.length}`}
          style={{ minWidth: 180, maxWidth: 360 }}
          popupMatchSelectWidth={false}
          showSearch
          treeNodeFilterProp="title"
          popupRender={(menu) => (
            <>
              {selectAllHeader(treeLeafVals)}
              {menu}
            </>
          )}
        />
      </div>
    );
  }

  // 선택된 값을 드롭다운 맨 위로 정렬 — 하위 항목을 골라도 다시 찾기 쉽게(나머지는 원래 순서 유지)
  const selectedSet = new Set(isMulti ? selectedArr : value ? [value as string] : []);
  const orderedOptions = selectedSet.size ? [...options.filter((o) => selectedSet.has(o.value)), ...options.filter((o) => !selectedSet.has(o.value))] : options;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-[#495057] shrink-0">{title}</span>
      <Select
        mode={isMulti ? 'multiple' : undefined}
        placeholder={parentMissing ? '상위 단계 선택 필요' : `${title} 선택`}
        value={isMulti ? ((value as string[]) ?? []) : ((value as string) ?? undefined)}
        loading={isLoading}
        disabled={parentMissing}
        {...(isMulti ? { open, onOpenChange: handleOpenChange } : {})}
        options={orderedOptions}
        onChange={(val) => {
          if (isMulti) {
            const arr = val as string[];
            onChange(arr.length ? arr : null);
          } else {
            onChange((val as string) ?? null);
          }
        }}
        allowClear
        style={{ minWidth: 150, maxWidth: 320 }}
        popupMatchSelectWidth={false}
        showSearch
        optionFilterProp="label"
        maxTagCount={2}
        maxTagPlaceholder={(omitted) => `+${omitted.length}`}
        popupRender={
          isMulti
            ? (menu) => (
                <>
                  {selectAllHeader(options.map((o) => o.value))}
                  {menu}
                </>
              )
            : undefined
        }
      />
    </div>
  );
}

// ── 단위별 DatePicker picker 모드 ────────────────────────────────────────
function getPickerMode(unit: TimeUnit): 'date' | 'month' | 'year' {
  if (unit === 'MONTHLY') return 'month';
  if (unit === 'YEARLY') return 'year';
  return 'date';
}

function getDateFormat(unit: TimeUnit): string {
  if (unit === 'MONTHLY') return 'YYYY-MM';
  if (unit === 'YEARLY') return 'YYYY';
  return 'YYYY-MM-DD';
}

// period는 단위와 무관하게 항상 풀 ISO로 저장·전송 (백엔드 파싱 호환)
const ISO_DATE = 'YYYY-MM-DD';

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
// 공통(검색일자 + 단위 + 비교)은 상단 고정 / 데이터셋 동적 검색조건은 그 아래 행.
export default function GlobalFilter({ reportId, mode }: GlobalFilterProps) {
  const { panels, report } = useReportEditorStore();
  const reportTitle = report?.title ?? '통계 보고서';
  const { globalFilter, committedFilter, setTimeUnit, setComparison, setPeriod, setSearchValue, setConditions, setTenantId, commitFilter, hydrateForReport } = useReportViewStore();

  // 운영자 모드 — 장표 안 테넌트 검색조건(필수 선행). 선택 전엔 하위 조건·조회 모두 차단.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants);
  const viewTenantId = globalFilter.tenantId ?? null;
  const tenantSelectionPending = mode === 'view' && operatorMode && !viewTenantId;
  const tenantOptions = (availableTenants ?? []).map((t) => ({ value: String(t.tenantId), label: t.tenantName }));

  // 편집 모드 — 데이터 스코프를 장표 "소유 테넌트"로 자동 고정 (선택형 아님).
  // 편집은 장표 정의(소유 테넌트 자산)를 만지는 작업이므로 미리보기·검색조건 옵션도
  // 소유 테넌트 기준이어야 한다. admin 이 타 테넌트 공유/기본 장표를 편집할 때 유효
  // (일반 사용자는 소유 테넌트 == 컨텍스트 테넌트라 동작 변화 없음).
  const editorOwnerTenantId = mode === 'editor' && report?.tenantId != null ? String(report.tenantId) : null;
  useEffect(() => {
    if (editorOwnerTenantId && globalFilter.tenantId !== editorOwnerTenantId) setTenantId(editorOwnerTenantId);
  }, [editorOwnerTenantId, globalFilter.tenantId, setTenantId]);

  // cascade 옵션 조회에 쓸 테넌트: 편집=소유 테넌트 고정, 뷰+운영자=선택 테넌트, 그 외=컨텍스트(미전송)
  const cascadeTenantId = editorOwnerTenantId ?? (mode === 'view' && operatorMode ? viewTenantId : undefined);

  // 뷰 진입(또는 보고서 전환) 시 저장된 조건 복원 — 글로벌 공통조건 + 보고서별 searchValues
  useEffect(() => {
    if (mode === 'view') hydrateForReport(reportId);
  }, [mode, reportId, hydrateForReport]);

  // 그리드 패널만 서버 Excel Export (보고서당 그리드 1개 한정). 그리드 패널이 있으면 편집/뷰 모드 무관하게 활성화.
  const gridPanel = panels.find((p) => p.panelType === 'GRID');
  const { mutate: exportExcel, isPending: isExporting } = useExportPanelExcel({
    mutationOptions: { onError: () => toast.error('내보내기에 실패했습니다.') },
  });
  const handleExport = () => {
    if (!gridPanel) return;
    exportExcel({
      reportId,
      panelId: gridPanel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
      tenantId: committedFilter.tenantId ?? null,
    });
  };

  // 차트 패널 PNG 캡처 — 화면의 차트(BAR/LINE/PIE/RADAR)만, 위→아래·좌→우 순으로 최대 6개 자동 분할.
  const CHART_TYPES: PanelType[] = ['BAR', 'LINE', 'PIE', 'RADAR'];
  const chartPanels = panels.filter((p) => CHART_TYPES.includes(p.panelType));
  const [isCapturing, setIsCapturing] = useState(false);
  const handleCapture = async () => {
    if (chartPanels.length === 0) return;
    setIsCapturing(true);
    try {
      const ordered = [...chartPanels].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
      const res = await captureChartsToPng(
        ordered.map((p) => ({ panelId: p.panelId, title: p.title })),
        reportTitle,
      );
      if (!res.ok) toast.error(res.reason ?? '차트 캡처에 실패했습니다.');
      else if (res.truncated) toast.success(`차트가 많아 상위 6개만 캡처했습니다. (총 ${chartPanels.length}개)`);
      else toast.success('차트를 캡처했습니다.');
    } catch {
      toast.error('차트 캡처에 실패했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  // 통계 설정(TIMEUNIT_LIMIT) 기반 단위별 최대 조회 기간 — 기간 조회조건 제한에 사용
  const { limits } = useTimeUnitLimits();

  const unit = globalFilter.timeUnit;
  const isMI = unit === '10MIN';
  const isHH = unit === 'HOURLY';
  const hasTime = isMI || isHH;

  // 시작/종료 시간 (10분/시간 단위 전용)
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [endTime, setEndTime] = useState<Dayjs | null>(
    dayjs()
      .hour(23)
      .minute(isMI ? 59 : 50),
  );

  // 시간 단위(10분/시간) 전용 추가 검색조건 — 점심시간 제외 · 제외요일 · 구간검색
  const [excludeLunch, setExcludeLunch] = useState(false);
  const [excludeDays, setExcludeDays] = useState<string[]>([]);
  const [useInterval, setUseInterval] = useState(false);
  const [intervalStart, setIntervalStart] = useState<Dayjs | null>(dayjs().hour(0).minute(0));
  const [intervalEnd, setIntervalEnd] = useState<Dayjs | null>(dayjs().hour(23).minute(0));

  // 빠른검색 프리셋 — 단위별로 목록이 달라짐(레거시 동일). 백엔드 비교 아님, 검색일자(기간)를 빠르게 세팅.
  const [quickPreset, setQuickPreset] = useState<QuickPreset | null>(null);

  // 필터 복원은 store.hydrateForReport(reportId) 로 일원화 (위 useEffect). 레거시 reportFilter_* 제거.

  // 패널 FILTER 슬롯 → searchCondId별로 단계(nodeCode)→데이터셋 컬럼(fieldName) 매핑 묶음 (cascade)
  const filterBindings = useMemo(() => {
    const map = new Map<number, { searchCondId: number; nodeFieldMap: Record<string, string>; fallbackFieldName?: string }>();
    panels.forEach((panel) => {
      panel.fieldMap
        .filter((f) => f.slotType === 'FILTER' && f.searchCondId != null)
        .forEach((f) => {
          const entry = map.get(f.searchCondId!) ?? { searchCondId: f.searchCondId!, nodeFieldMap: {} as Record<string, string> };
          if (f.nodeCode) {
            entry.nodeFieldMap[f.nodeCode] = f.fieldName;
          } else if (entry.fallbackFieldName == null) {
            entry.fallbackFieldName = f.fieldName; // 단일(노드코드 없는) 바인딩 — 루트 단계 폴백
          }
          map.set(f.searchCondId!, entry);
        });
    });
    return Array.from(map.values());
  }, [panels]);

  const fmt = getDateFormat(unit);
  // period는 항상 풀 ISO로 저장 → ISO로 파싱(단위별 fmt로 파싱하면 불일치로 Invalid Date 발생). 깨진 값은 오늘로 폴백.
  const startDate = useMemo(() => {
    const d = dayjs(globalFilter.period.from);
    return d.isValid() ? d : dayjs();
  }, [globalFilter.period.from]);
  const endDate = useMemo(() => {
    const d = dayjs(globalFilter.period.to);
    return d.isValid() ? d : dayjs();
  }, [globalFilter.period.to]);

  // disabledDate (시작일: 미래 비활성화 / 종료일: 시작일 이전·maxDays 초과 비활성화)
  const disabledStartDate = useMemo(() => createDisabledDate(unit), [unit]);
  const disabledEndDate = useMemo(() => createEndDisabledDate(startDate, unit, limits), [globalFilter.period.from, unit, limits]); // eslint-disable-line react-hooks/exhaustive-deps

  // 시작일·단위 변경 또는 통계설정 로드 시 종료일이 범위를 벗어나면 자동 조정
  useEffect(() => {
    if (!startDate.isValid() || !endDate.isValid()) return;
    const maxDays = getMaxDays(unit, limits);
    if (endDate.isBefore(startDate, 'day')) {
      setPeriod(startDate.format(ISO_DATE), startDate.format(ISO_DATE));
    } else if (Number.isFinite(maxDays) && endDate.diff(startDate, 'day') > maxDays) {
      const maxEnd = startDate.add(maxDays, 'day');
      const clamped = maxEnd.isAfter(dayjs(), 'day') ? dayjs() : maxEnd;
      setPeriod(startDate.format(ISO_DATE), clamped.format(ISO_DATE));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter.period.from, unit, limits]);

  // 시간 단위로 변경 시 분 자동 조정 (시작 00분, 종료 50분)
  useEffect(() => {
    if (isHH) {
      setStartTime((prev) => (prev ? prev.minute(0) : prev));
      setEndTime((prev) => (prev ? prev.minute(50) : prev));
    }
  }, [isHH]);

  const handleSetStart = (date: Dayjs | null) => {
    if (date) setPeriod(date.format(ISO_DATE), globalFilter.period.to);
  };

  const handleSetEnd = (date: Dayjs | null) => {
    if (date) setPeriod(globalFilter.period.from, date.format(ISO_DATE));
  };

  // 빠른검색 프리셋 → 검색일자(기간) 범위 산출 (레거시 SWAT UnitTypeControlV2.dateCalculation 동일).
  const computeQuickRange = (preset: QuickPreset): { from: string; to: string } => {
    const today = dayjs();
    switch (preset) {
      case 'TODAY':
        return { from: today.format(ISO_DATE), to: today.format(ISO_DATE) };
      case 'PREV_DAY': {
        const d = today.subtract(1, 'day');
        return { from: d.format(ISO_DATE), to: d.format(ISO_DATE) };
      }
      case 'LAST_WEEK':
        return { from: today.subtract(6, 'day').format(ISO_DATE), to: today.format(ISO_DATE) };
      case 'CUR_MONTH':
        return { from: today.startOf('month').format(ISO_DATE), to: today.format(ISO_DATE) };
      case 'PREV_MONTH': {
        const prev = today.subtract(1, 'month');
        return { from: prev.startOf('month').format(ISO_DATE), to: prev.endOf('month').format(ISO_DATE) };
      }
      case 'LAST_3MONTH':
        return { from: today.subtract(2, 'month').startOf('month').format(ISO_DATE), to: today.format(ISO_DATE) };
      case 'CUR_YEAR':
        return { from: today.startOf('year').format(ISO_DATE), to: today.format(ISO_DATE) };
      case 'PREV_YEAR': {
        const prev = today.subtract(1, 'year');
        return { from: prev.startOf('year').format(ISO_DATE), to: prev.endOf('year').format(ISO_DATE) };
      }
      case 'LAST_3YEAR':
        return { from: today.subtract(2, 'year').startOf('year').format(ISO_DATE), to: today.format(ISO_DATE) };
      default:
        return { from: today.format(ISO_DATE), to: today.format(ISO_DATE) };
    }
  };

  // 빠른검색: 단위별 프리셋으로 검색일자 세팅 (OFF=수동 기간 유지). 조회 시 이 기간으로 질의됨.
  const handleQuick = (preset: QuickPreset | null) => {
    setQuickPreset(preset);
    setComparison(null); // 백엔드 비교는 사용 안 함
    if (!preset) return; // OFF → 현재 기간 유지
    const range = computeQuickRange(preset);
    setPeriod(range.from, range.to);
  };

  // 운영자 모드 — 테넌트 변경: 조회 대상 교체 + 이 보고서의 cascade 스냅샷 전부 제거
  // (스냅샷 키는 테넌트 접미사가 붙으므로 prefix 스캔으로 지운다. searchValues 초기화는
  // store.setTenantId 가 처리, cascade 내부 상태는 key remount 로 초기화)
  const handleTenantChange = (val: string | undefined) => {
    setTenantId(val ?? null);
    try {
      const prefix = `insight.report.cascade.${reportId}.`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix)) localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
  };

  const handleQuery = () => {
    if (tenantSelectionPending) {
      message.warning('조회할 테넌트를 먼저 선택해주세요.');
      return;
    }
    const s = dayjs(globalFilter.period.from);
    const e = dayjs(globalFilter.period.to);
    if (s.isValid() && e.isValid() && !validateDateRange(s, e, unit, limits)) {
      message.warning(`검색 기간은 ${getRangeLabel(unit, limits)} 이내로 설정해주세요.`);
      return;
    }

    // 구간검색 시작 > 종료 검증
    if (hasTime && useInterval && intervalStart && intervalEnd && intervalStart.isAfter(intervalEnd)) {
      message.warning('구간검색 시작시간이 종료시간보다 늦을 수 없습니다.');
      return;
    }

    // 검색일자 시작/종료 시각 + 시간단위 전용 조건(점심/제외요일/구간) 백엔드 전달
    const toHHmm = (t: Dayjs | null) => (t ? t.format('HHmm') : null);
    const conditions: GlobalConditions = {
      // 구간검색 시 검색일자는 날짜만 → 시각은 intervalFrom/To로 전달 (startTime/endTime 비움)
      startTime: hasTime && !useInterval ? toHHmm(startTime) : null,
      endTime: hasTime && !useInterval ? toHHmm(endTime) : null,
      excludeLunch: hasTime ? excludeLunch : false,
      useInterval: hasTime ? useInterval : false,
      intervalFrom: hasTime && useInterval ? toHHmm(intervalStart) : null,
      intervalTo: hasTime && useInterval ? toHHmm(intervalEnd) : null,
      excludeDays: hasTime ? excludeDays : [],
    };
    setConditions(conditions);
    // 영속화(글로벌 공통조건 + 보고서별 searchValues)는 store.commitFilter 가 처리
    commitFilter();
  };

  return (
    <div className="flex flex-col gap-3 w-full bg-white border-b-2 border-[var(--color-bt-border)] shadow-sm p-5">
      {/* 1행: 공통 조회조건 (상단 고정) — 좌: 검색일자/단위 · 우: 비교/조회/Export */}
      <div className="flex items-start gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* 단위 */}
          <span className="text-sm font-medium text-[#495057] shrink-0">단위</span>
          <Select
            value={unit}
            onChange={(u: TimeUnit) => {
              setTimeUnit(u);
              setQuickPreset(null); // 단위별 프리셋 목록이 달라지므로 초기화
            }}
            options={[
              { label: '10분단위', value: '10MIN' },
              { label: '시간별', value: 'HOURLY' },
              { label: '일간', value: 'DAILY' },
              { label: '월간', value: 'MONTHLY' },
              { label: '년간', value: 'YEARLY' },
            ]}
            className="!max-w-[110px] !min-w-[90px]"
            popupMatchSelectWidth={false}
          />

          {/* 빠른검색 */}
          <Divider orientation="vertical" className="!h-5 !m-0" />
          <ComparisonToggle value={quickPreset} timeUnit={unit} onChange={handleQuick} />

          {/* 구간검색 (시간/10분 단위 전용) — 체크 시 기간은 날짜만, 시간은 여기서 단일 범위 입력 */}
          {hasTime && (
            <>
              <Divider orientation="vertical" className="!h-5 !m-0" />
              <span className="text-sm font-medium text-[#495057] shrink-0">구간검색</span>
              <Checkbox checked={useInterval} onChange={(e) => setUseInterval(e.target.checked)} />
            </>
          )}

          {/* 기간 */}
          <Divider orientation="vertical" className="!h-5 !m-0" />
          <span className="text-sm font-medium text-[#495057] shrink-0">기간</span>
          <DatePicker value={startDate} onChange={handleSetStart} picker={getPickerMode(unit)} format={fmt} allowClear={false} inputReadOnly disabledDate={disabledStartDate} />
          {/* 구간검색 시: 날짜만 표시(시간 숨김) → 시간 범위는 구간검색 쪽에서 단일 입력 */}
          {hasTime && !useInterval && (
            <TimePicker
              value={startTime}
              onChange={setStartTime}
              format={isMI ? 'HH:mm' : 'HH:00'}
              minuteStep={10}
              allowClear={false}
              needConfirm={false}
              inputReadOnly
              style={{ width: 100 }}
            />
          )}
          <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
          <DatePicker value={endDate} onChange={handleSetEnd} picker={getPickerMode(unit)} format={fmt} allowClear={false} inputReadOnly disabledDate={disabledEndDate} />
          {hasTime && !useInterval && (
            <TimePicker
              value={endTime}
              onChange={setEndTime}
              format={isMI ? 'HH:mm' : 'HH:50'}
              minuteStep={10}
              allowClear={false}
              needConfirm={false}
              inputReadOnly
              style={{ width: 100 }}
            />
          )}
          {/* 구간검색 시간 — 기간(날짜) 뒤에 단일 시각 범위 표시 */}
          {hasTime && useInterval && (
            <>
              <span className="text-sm font-medium text-[#495057] shrink-0">시간</span>
              <TimePicker
                value={intervalStart}
                onChange={setIntervalStart}
                format={isMI ? 'HH:mm' : 'HH:00'}
                minuteStep={10}
                allowClear={false}
                needConfirm={false}
                inputReadOnly
                style={{ width: 100 }}
              />
              <span className="text-sm font-medium text-[#495057] shrink-0">~</span>
              <TimePicker
                value={intervalEnd}
                onChange={setIntervalEnd}
                format={isMI ? 'HH:mm' : 'HH:50'}
                minuteStep={10}
                allowClear={false}
                needConfirm={false}
                inputReadOnly
                style={{ width: 100 }}
              />
            </>
          )}

          {/* 점심시간 제외 · 요일구분 (시간/10분 단위 전용) — 한 줄에 안 들어가면 자연 줄바꿈(가로 divider 없음) */}
          {hasTime && (
            <>
              <Divider orientation="vertical" className="!h-5 !m-0" />
              <span className="text-sm font-medium text-[#495057] shrink-0">점심시간 제외</span>
              <Checkbox checked={excludeLunch} onChange={(e) => setExcludeLunch(e.target.checked)} />
              <Divider orientation="vertical" className="!h-5 !m-0" />
              <span className="text-sm font-medium text-[#495057] shrink-0">요일구분</span>
              <Select
                mode="multiple"
                value={excludeDays}
                onChange={(v) => setExcludeDays(v ?? [])}
                allowClear
                maxTagCount="responsive"
                options={WEEKDAY_OPTIONS}
                placeholder="제외할 요일 선택"
                className="!min-w-[150px] !max-w-[300px]"
                popupMatchSelectWidth={false}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleQuery}>
            조회
          </Button>
          <Tooltip title={gridPanel ? undefined : '그리드 패널이 있는 보고서만 Export 가능합니다'}>
            <Button color="cyan" variant="solid" icon={<Download className="size-4" />} disabled={!gridPanel} loading={isExporting} onClick={handleExport}>
              Export
            </Button>
          </Tooltip>
          <Tooltip title={chartPanels.length ? undefined : '차트 패널이 있는 보고서만 캡처할 수 있습니다'}>
            <Button color="purple" variant="solid" icon={<Camera className="size-4" />} disabled={!chartPanels.length} loading={isCapturing} onClick={handleCapture}>
              캡처
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 2행: 데이터셋 동적 검색조건 (공통 아래) — 운영자 모드는 테넌트 조건이 필수 선행 */}
      {((mode === 'view' && operatorMode) || filterBindings.length > 0) && (
        <>
          <Divider className="!my-0" />
          <div className="flex flex-wrap items-center gap-3">
            {mode === 'view' && operatorMode && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#495057] shrink-0">
                  테넌트 <span className="text-red-500">*</span>
                </span>
                <Select
                  value={viewTenantId ?? undefined}
                  onChange={handleTenantChange}
                  options={tenantOptions}
                  placeholder="조회할 테넌트 선택"
                  status={viewTenantId ? undefined : 'warning'}
                  showSearch
                  optionFilterProp="label"
                  style={{ minWidth: 180, maxWidth: 280 }}
                  popupMatchSelectWidth={false}
                />
              </div>
            )}
            {tenantSelectionPending ? (
              <span className="text-sm text-[var(--color-bt-fg-muted)]">테넌트를 선택하면 검색조건과 데이터가 해당 테넌트 기준으로 조회됩니다.</span>
            ) : (
              filterBindings.map(({ searchCondId, nodeFieldMap, fallbackFieldName }) => (
                <SearchCondCascade
                  key={operatorMode ? `${searchCondId}:${viewTenantId}` : searchCondId}
                  searchCondId={searchCondId}
                  nodeFieldMap={nodeFieldMap}
                  fallbackFieldName={fallbackFieldName}
                  reportId={reportId}
                  tenantId={cascadeTenantId}
                  onChange={(fieldName, val) => setSearchValue(fieldName, val)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
