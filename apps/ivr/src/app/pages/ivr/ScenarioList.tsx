/**
 * IVR 시나리오 목록 페이지.
 *
 * <p>시나리오 마스터 카드 그리드를 표시하고, 카드 클릭 시 상세 페이지로 이동한다.</p>
 * <p>FCA BotList 패턴 적용 — 시나리오 목록과 버전 관리를 별도 페이지로 분리.</p>
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Dropdown, Empty, Input } from 'antd';
import { Layers, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ScenarioMasterSheet, { type ScenarioMasterSheetRef } from '../../features/scenario/components/ScenarioMasterSheet';
import ScenarioTypeMultiSelect from '../../features/scenario/components/ScenarioTypeMultiSelect';
import { scenarioQueryKeys, useDeleteScenario, useGetScenarios } from '../../features/scenario/hooks/useScenarioQueries';
import { SCENARIO_TYPE_COLORS, SCENARIO_TYPE_LABELS, type Scenario, type ScenarioType } from '../../features/scenario/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '시나리오/버전 관리', path: '/ivr/ivr/scenario' }];

export default function ScenarioList() {
  const navigate = useNavigate();
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
  const masterSheetRef = useRef<ScenarioMasterSheetRef>(null);

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (selectedTypes.length > 0) params.types = selectedTypes.join(',');
    if (searchText.trim()) params.keyword = searchText.trim();
    return params;
  }, [selectedTypes, searchText]);

  const { data: scenarios = [] } = useGetScenarios({ params: queryParams });

  const { mutate: deleteMutate } = useDeleteScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
      },
    },
  });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value);

  const handleDetail = useCallback(
    (s: Scenario) => {
      navigate(`${s.serviceId}`);
    },
    [navigate],
  );

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
      {/* ===== 상단 헤더 ===== */}
      <div className="flex items-center gap-3 px-7 py-5 h-[76px] bg-white bt-shadow">
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

      {/* ===== 카드 그리드 ===== */}
      {scenarios.length === 0 ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
            <Empty description={false} imageStyle={{ height: 60 }} />
            <span className="text-sm">조건에 맞는 시나리오가 없습니다</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 w-full overflow-y-auto">
          {scenarios.map((s) => {
            const tc = SCENARIO_TYPE_COLORS[s.serviceType] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };
            return (
              <div
                key={s.serviceId}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col h-[150px]"
                onClick={() => handleDetail(s)}
                onDoubleClick={() => handleEdit(s)}
              >
                <div className="flex items-start justify-between mb-2">
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
                <div className="text-[11px] text-slate-500 space-y-0.5 mt-auto">
                  <div>ID: {s.serviceId}</div>
                  <div>
                    버전 {s.versionCount ?? 0}개{s.maxKeepTime != null && <span> · 유지 {s.maxKeepTime}초</span>}
                  </div>
                  {s.serviceDesc && <div className="truncate text-slate-400">{s.serviceDesc}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheets */}
      <ScenarioMasterSheet ref={masterSheetRef} onSuccess={() => queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def })} />
    </div>
  );
}
