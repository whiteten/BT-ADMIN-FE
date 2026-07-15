/**
 * 시나리오 분석 결과 페이지 (메뉴: 부가기능 > 시나리오 분석 결과).
 *
 * 레이아웃 (apps/stt/src/app/pages/stt-config/RecogList.tsx 우측 패널 패턴 참고):
 *  - 좌측: 시나리오 검색+종류 필터+flat list (apps/ivr/src/app/pages/scenario/ScenarioMenuControlList.tsx 좌측 패널과 동일 패턴).
 *  - 우측: 단일 흰 박스 안에 header(Segmented 토글 + 운영자 ScopeSelect)만 두고, 버전 선택 등
 *    화면별 필터/액션은 각 탭 컴포넌트 안에서 독립적으로 구성한다(RecogList의 GroupDetailPanel과 동일 원칙).
 *    - 시나리오별 메뉴관리 (AS-IS IPR20S6050) — TB_IR_SERVICEMENU 메뉴 트리, 읽기 전용
 *    - 시나리오 코드관리 (AS-IS IPR20S6070) — TB_IR_SERVICECODEITEM 코드 목록, 읽기 전용
 *  둘 다 시나리오 업로드 시점 SXML 분석 결과를 그대로 보여주며 CUD 없음(분석 파이프라인이 유일한 쓰기 경로).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Empty, Input, Segmented } from 'antd';
import { ChevronDown, Code2, FileText, ListTree, Search, Tags } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import { scenarioQueryKeys, useGetScenarios } from '../../features/scenario/hooks/useScenarioQueries';
import { SCENARIO_TYPE_COLORS, SCENARIO_TYPE_LABELS, type ScenarioType } from '../../features/scenario/types';
import ScenarioAnalysisCodeTab from '../../features/scenario-analysis/tabs/ScenarioAnalysisCodeTab';
import ScenarioAnalysisMenuTab from '../../features/scenario-analysis/tabs/ScenarioAnalysisMenuTab';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '부가기능' }, { title: '시나리오 분석 결과', path: '/ivr/addon/scenario-analysis' }];

type AnalysisMode = 'menu' | 'code';

const MODE_LABELS: Record<AnalysisMode, string> = {
  menu: '시나리오별 메뉴관리',
  code: '시나리오 코드관리',
};

const MODE_ICONS: Record<AnalysisMode, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  menu: ListTree,
  code: Code2,
};

/** Segmented 토글 (RecogList.tsx의 buildGroupDetailModeOptions와 동일 패턴) — 선택된 토글만 primary 색으로 강조. */
function buildModeOptions(mode: AnalysisMode) {
  return (Object.keys(MODE_LABELS) as AnalysisMode[]).map((value) => {
    const Icon = MODE_ICONS[value];
    return {
      value,
      label: (
        <span
          className={`flex items-center justify-center gap-2 w-[190px] px-2 py-0.5 text-[15px] ${
            value === mode ? 'font-bold text-[var(--color-bt-primary)]' : 'font-medium text-gray-500'
          }`}
        >
          <Icon className="h-5 w-5" />
          {MODE_LABELS[value]}
        </span>
      ),
    };
  });
}

export default function ScenarioAnalysisList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ─── State ────────────────────────────────────────────────────────────
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<ScenarioType>>(new Set());
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('menu');

  const autoOpenedTypeFilterRef = useRef(false);

  // 운영자 모드(통합운영) — 전체(actAsTenantId=null)면 API가 X-View-All-Tenants로 전체 테넌트 조회,
  // 대행 중이면 X-Act-As-Tenant로 그 테넌트만 조회. 일반 모드는 로그인 테넌트로 서버가 자동 스코프.
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const showTenantLabel = operatorMode && actAsTenantId === null;

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: scenarios = [] } = useGetScenarios();

  // ─── Derived ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedScenarioId === null && scenarios.length > 0) setSelectedScenarioId(scenarios[0].serviceId);
  }, [scenarios, selectedScenarioId]);

  useEffect(() => {
    if (selectedScenarioId && !scenarios.some((s) => s.serviceId === selectedScenarioId)) setSelectedScenarioId(null);
  }, [scenarios, selectedScenarioId]);

  const selectedScenario = useMemo(() => scenarios.find((s) => s.serviceId === selectedScenarioId) ?? null, [scenarios, selectedScenarioId]);

  const availableTypes = useMemo(() => Array.from(new Set(scenarios.map((s) => s.serviceType))), [scenarios]);

  useEffect(() => {
    if (!autoOpenedTypeFilterRef.current && availableTypes.length > 0) {
      autoOpenedTypeFilterRef.current = true;
      setTypeFilterOpen(true);
    }
  }, [availableTypes]);

  const searchedScenarios = useMemo(() => (scenarioSearch.trim() ? fuzzyFilter(scenarioSearch, scenarios, (s) => s.serviceName) : scenarios), [scenarios, scenarioSearch]);
  const visibleScenarios = useMemo(
    () => (selectedTypes.size === 0 ? searchedScenarios : searchedScenarios.filter((s) => selectedTypes.has(s.serviceType))),
    [searchedScenarios, selectedTypes],
  );

  const toggleType = (type: ScenarioType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // 우측 패널 header(Segmented와 한 행)에 얹는다 — RecogList.tsx의 scopeSelect prop과 동일 패턴.
  const scopeSelect = operatorMode ? (
    <ScopeSelect
      kind="tenant"
      options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
      value={actAsTenantId}
      onChange={(id) => {
        setActAsTenant(id);
        void queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
      }}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== 좌측: 시나리오 목록 ===== */}
        <div className="w-[340px] flex-shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-[#405189]" />
            <h3 className="text-sm font-semibold text-gray-800">시나리오</h3>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{visibleScenarios.length}개</span>
          </div>

          <Input
            allowClear
            prefix={<Search className="size-3.5 text-gray-400" />}
            placeholder="시나리오명 검색"
            value={scenarioSearch}
            onChange={(e) => setScenarioSearch(e.target.value)}
          />

          {availableTypes.length > 0 && (
            <div className="rounded-md bg-gray-50">
              <button type="button" className="flex w-full items-center justify-between px-2.5 py-2 select-none" onClick={() => setTypeFilterOpen((v) => !v)}>
                <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <Tags className="size-3.5" />
                  종류 필터
                  {selectedTypes.size > 0 && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{selectedTypes.size}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {selectedTypes.size > 0 && (
                    <span
                      className="text-xs text-[var(--color-bt-primary)] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTypes(new Set());
                      }}
                    >
                      초기화
                    </span>
                  )}
                  <ChevronDown className={cn('size-4 text-gray-400 transition-transform', typeFilterOpen ? '' : '-rotate-90')} />
                </span>
              </button>
              {typeFilterOpen && (
                <div className="px-2.5 pb-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {availableTypes.map((type) => {
                      const active = selectedTypes.has(type);
                      const color = SCENARIO_TYPE_COLORS[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleType(type)}
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs transition-colors',
                            active ? cn(color.bg, color.text, 'border-transparent') : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                          )}
                        >
                          {SCENARIO_TYPE_LABELS[type]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto -mx-1">
            {visibleScenarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{scenarioSearch || selectedTypes.size > 0 ? '검색 결과가 없습니다' : '등록된 시나리오가 없습니다'}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {visibleScenarios.map((s) => {
                  const isSelected = selectedScenarioId === s.serviceId;
                  return (
                    <div
                      key={s.serviceId}
                      onClick={() => setSelectedScenarioId(s.serviceId)}
                      title={s.serviceDesc || undefined}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer rounded-md border-l-[3px] px-3 py-2 transition-colors',
                        isSelected ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]' : 'border-transparent hover:bg-gray-50',
                      )}
                    >
                      <FileText className={cn('size-4 flex-shrink-0', isSelected ? 'text-[var(--color-bt-primary)]' : 'text-gray-400')} />
                      <span className={cn('flex-1 min-w-0 truncate text-sm', isSelected ? 'text-[var(--color-bt-primary)] font-medium' : 'text-gray-700')}>{s.serviceName}</span>
                      {showTenantLabel && s.tenantName && (
                        <Badge variant="secondary" className="text-[10px] leading-4 !h-5 shrink-0 ml-auto text-amber-700 bg-amber-50 border border-amber-200">
                          {s.tenantName}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== 우측: Segmented 토글(메뉴관리/코드관리) — RecogList.tsx GroupDetailPanel과 동일 구조 ===== */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 bg-white bt-shadow p-5 overflow-hidden">
          <header className="flex items-center gap-4 w-full flex-wrap flex-shrink-0">
            <Segmented options={buildModeOptions(mode)} value={mode} onChange={(v) => setMode(v as AnalysisMode)} size="large" />
            {scopeSelect}
          </header>
          <div className="flex-1 min-h-0 flex flex-col">
            {mode === 'menu' ? (
              <ScenarioAnalysisMenuTab serviceId={selectedScenarioId} scenarioName={selectedScenario?.serviceName ?? null} />
            ) : (
              <ScenarioAnalysisCodeTab serviceId={selectedScenarioId} scenarioName={selectedScenario?.serviceName ?? null} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
