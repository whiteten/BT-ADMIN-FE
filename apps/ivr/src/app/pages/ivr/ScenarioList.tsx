/**
 * IVR 시나리오/버전 관리 페이지 (AS-IS IPR20S6020).
 *
 * <p>레이아웃: IVR 국선관리(IvrEndpointList) 패턴 복사 + 시나리오 특화 변경.</p>
 * <ul>
 *   <li>상단 헤더: 시나리오 타입 멀티 선택 + 시나리오명 검색 + 시나리오 추가 버튼 (테넌트는 로그인 정보로 자동)</li>
 *   <li>중단: 시나리오 마스터 카드 슬라이더 (L 220×130, '전체' 카드 + 종류별 시나리오 카드)</li>
 *   <li>하단: 좌측 시나리오 버전 그리드 (FCA BotVersionList 패턴) + 우측 배포 사이드바</li>
 * </ul>
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Dropdown, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ScenarioDeploySidebar from '../../features/scenario/components/ScenarioDeploySidebar';
import ScenarioMasterSheet, { type ScenarioMasterSheetRef } from '../../features/scenario/components/ScenarioMasterSheet';
import ScenarioTypeMultiSelect from '../../features/scenario/components/ScenarioTypeMultiSelect';
import ScenarioVersionGrid from '../../features/scenario/components/ScenarioVersionGrid';
import { scenarioQueryKeys, useDeleteScenario, useGetScenarios } from '../../features/scenario/hooks/useScenarioQueries';
import { SCENARIO_TYPE_COLORS, SCENARIO_TYPE_LABELS, type Scenario, type ScenarioType, type ScenarioVersion } from '../../features/scenario/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: 'ForCus', path: '/ivr' }, { title: '시나리오 관리' }, { title: '시나리오/버전 관리' }];

export default function ScenarioList() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedTypes, setSelectedTypes] = useState<ScenarioType[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ScenarioVersion | null>(null);
  const [deploySidebarOpen, setDeploySidebarOpen] = useState(true);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const masterSheetRef = useRef<ScenarioMasterSheetRef>(null);

  // 시나리오 목록 조회 (멀티 타입 + 검색)
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (selectedTypes.length > 0) params.types = selectedTypes.join(',');
    if (searchText.trim()) params.keyword = searchText.trim();
    return params;
  }, [selectedTypes, searchText]);

  const { data: scenarios = [] } = useGetScenarios({ params: queryParams });

  // 진입 시 첫 번째 카드 자동 선택
  useEffect(() => {
    if (!selectedScenarioId && scenarios.length > 0) {
      setSelectedScenarioId(scenarios[0].serviceId);
    }
  }, [scenarios, selectedScenarioId]);

  // 시나리오 변경 시 버전 선택 초기화
  useEffect(() => {
    setSelectedVersion(null);
  }, [selectedScenarioId]);

  const selectedScenario = useMemo(() => (selectedScenarioId ? (scenarios.find((s) => s.serviceId === selectedScenarioId) ?? null) : null), [scenarios, selectedScenarioId]);

  const { mutate: deleteMutate } = useDeleteScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
        setSelectedScenarioId(null);
      },
    },
  });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value);

  const handleCardSelect = (s: Scenario) => {
    setSelectedScenarioId(s.serviceId);
  };

  const handleEdit = useCallback((s: Scenario) => {
    masterSheetRef.current?.open(s);
  }, []);

  const handleDelete = useCallback(
    (s: Scenario) => {
      modal.confirm.execute({
        onOk: () => deleteMutate({ serviceId: s.serviceId }),
        options: {
          title: '시나리오 삭제',
          content: `"${s.serviceName}" 시나리오를 삭제하시겠습니까?\n버전이 1개 이상 있으면 삭제 불가입니다.`,
        },
      });
    },
    [modal, deleteMutate],
  );

  const getCardMenuItems = (s: Scenario) => [
    { key: 'edit', label: '수정', onClick: () => handleEdit(s) },
    { key: 'delete', label: '삭제', icon: <Trash2 className="size-4" />, danger: true, onClick: () => handleDelete(s) },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단 헤더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 h-[76px]">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-gray-400" />
              <span className="text-[12px] font-medium text-gray-600">시나리오 타입</span>
              <ScenarioTypeMultiSelect value={selectedTypes} onChange={setSelectedTypes} />
            </div>
            <div className="ml-2 flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="시나리오명 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 240 }}
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-[11px] text-slate-500">※ 테넌트는 로그인 정보로 자동 적용</div>
            <div className="ml-auto">
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => masterSheetRef.current?.open()}>
                시나리오 추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 py-3 h-[170px]">
            {scenarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">조건에 맞는 시나리오가 없습니다</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {scenarios.map((s) => {
                    const isSelected = selectedScenarioId === s.serviceId;
                    const tc = SCENARIO_TYPE_COLORS[s.serviceType] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };
                    return (
                      <div
                        key={s.serviceId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(s);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        onDoubleClick={() => handleEdit(s)}
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium ${tc.bg} ${tc.text} rounded`}>{SCENARIO_TYPE_LABELS[s.serviceType] ?? s.serviceType}</span>
                          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                            <Dropdown menu={{ items: getCardMenuItems(s) }} trigger={['click']} placement="bottomRight">
                              <button type="button" className="p-0.5 rounded hover:bg-gray-100">
                                <MoreVertical className="size-3.5 text-gray-400" />
                              </button>
                            </Dropdown>
                          </div>
                        </div>
                        <div className="font-semibold text-[14px] text-slate-800 truncate mb-2">{s.serviceName}</div>
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>ID: {s.serviceId}</div>
                          <div>
                            버전 {s.versionCount ?? 0}개{s.maxKeepTime != null && <span> · 유지 {s.maxKeepTime}초</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== 하단: 버전 그리드 + 배포 사이드바 ===== */}
        <div className="flex flex-1 min-h-0 gap-4">
          <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
            {selectedScenario ? (
              <ScenarioVersionGrid
                key={selectedScenario.serviceId}
                serviceId={selectedScenario.serviceId}
                serviceName={selectedScenario.serviceName}
                onSelectionChange={setSelectedVersion}
                onOpenDeploySidebar={() => setDeploySidebarOpen(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">시나리오를 선택하면 버전 목록이 표시됩니다</span>
              </div>
            )}
          </div>

          {deploySidebarOpen && selectedScenario && (
            <aside className="bg-white bt-shadow w-[340px] flex-shrink-0 overflow-hidden">
              <ScenarioDeploySidebar
                serviceId={selectedScenario.serviceId}
                selectedVersion={selectedVersion}
                candidateSystems={[]} /* TODO P4: 시스템 후보 API 추가 */
                onClose={() => setDeploySidebarOpen(false)}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Sheets */}
      <ScenarioMasterSheet ref={masterSheetRef} onSuccess={() => queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def })} />
    </div>
  );
}
