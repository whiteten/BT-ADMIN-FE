/**
 * 마스킹 정책 관리 페이지 (시스템 관리자)
 *
 * 레이아웃:
 *  ┌─ PageHeader ─────────────────────────  [테스트 도구] ┐
 *  ├─ 카테고리 카드 슬라이더 (h-[170px]) ───────────────────┤
 *  ├─ 본문 (좌 360px 카테고리 설정 + 우 패턴 정책 그리드) ─┤
 *  └─────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Empty, Input, Switch } from 'antd';
import { ChevronLeft, ChevronRight, Pencil, Play, Plus, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import MaskCategoryEditModal, { type MaskCategoryEditModalRef } from './MaskCategoryEditModal';
import MaskPolicyDrawer, { type MaskPolicyDrawerRef } from './MaskPolicyDrawer';
import MaskTestModal, { type MaskTestModalRef } from './MaskTestModal';
import { useDeleteCategory, useDeletePolicy, useGetCategories, useGetPolicies } from '../../features/mask-policy/hooks/useMaskPolicyQueries';
import { type MaskCategoryConfig, type MaskPolicy, RULE_TYPE_OPTIONS } from '../../features/mask-policy/types/maskPolicy.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '설정', path: '/manager/resource/mask-policy' },
  { title: '보안', path: '/manager/resource/mask-policy' },
  { title: '마스킹 정책', path: '/manager/resource/mask-policy' },
];

/** 카테고리 코드별 아이콘 — 잘 알려진 카테고리만 매핑, 그 외는 '🔒' */
const CATEGORY_ICONS: Record<string, string> = {
  PHONE: '📞',
  EMAIL: '📧',
  NAME: '👤',
  CUSTOMER_ID: '🆔',
  ADDRESS: '🏠',
  SSN: '🔐',
  CARD_NUMBER: '💳',
  ACCOUNT: '🏦',
};

/** 승인 권한 키별 민감도 분류 (UI 배지용) */
function getSensitivityBadge(approverAuthKey: string): { label: string; className: string } | null {
  if (approverAuthKey.includes('sensitive')) {
    return { label: '매우 민감', className: 'bg-red-50 text-red-700' };
  }
  return null;
}

const RULE_TYPE_LABEL: Record<string, string> = Object.fromEntries(RULE_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export default function MaskPolicyPage() {
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const categoryEditRef = useRef<MaskCategoryEditModalRef>(null);
  const policyDrawerRef = useRef<MaskPolicyDrawerRef>(null);
  const testModalRef = useRef<MaskTestModalRef>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: isCategoriesLoading, refetch: refetchCategories } = useGetCategories();
  const { data: policies = [], isLoading: isPoliciesLoading, refetch: refetchPolicies } = useGetPolicies(selectedCategory);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const { mutate: deleteCategory } = useDeleteCategory({
    mutationOptions: {
      onSuccess: () => {
        toast.success('카테고리가 삭제되었습니다.');
        setSelectedCategory(null);
      },
    },
  });

  const { mutate: deletePolicy } = useDeletePolicy({
    mutationOptions: {
      onSuccess: () => {
        toast.success('패턴 정책이 삭제되었습니다.');
      },
    },
  });

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    const kw = searchText.trim().toLowerCase();
    return categories.filter((c) => c.category.toLowerCase().includes(kw) || c.label.toLowerCase().includes(kw));
  }, [categories, searchText]);

  // 진입 시 첫 번째 카테고리 자동 선택
  useEffect(() => {
    if (!selectedCategory && filteredCategories.length > 0) {
      setSelectedCategory(filteredCategories[0].category);
    }
  }, [filteredCategories, selectedCategory]);

  const selectedConfig = useMemo<MaskCategoryConfig | null>(() => {
    if (!selectedCategory) return null;
    return categories.find((c) => c.category === selectedCategory) ?? null;
  }, [categories, selectedCategory]);

  // 카테고리별 패턴 개수 — 카드에 노출할 통계 (현재 선택된 카테고리만 정확)
  // 다른 카테고리의 패턴 개수는 카테고리 응답에 포함되지 않으므로 별도 API가 없는 한 표시 불가.
  // 우선 selectedCategory와 동일한 카테고리에만 정확한 카운트, 다른 카드는 '?' 표시.

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
  };

  const handleCreateCategory = () => {
    categoryEditRef.current?.open('create');
  };

  const handleEditCategory = () => {
    if (selectedConfig) categoryEditRef.current?.open('edit', selectedConfig);
  };

  const handleDeleteCategory = () => {
    if (!selectedConfig) return;
    modal.confirm.execute({
      onOk: () => deleteCategory(selectedConfig.configId),
      options: {
        title: '카테고리 삭제',
        content: `"${selectedConfig.label}" 카테고리를 삭제하시겠습니까?\n해당 카테고리의 모든 패턴 정책도 함께 삭제됩니다.`,
      },
    });
  };

  const handleCreatePolicy = () => {
    if (!selectedCategory) {
      toast.error('카테고리를 먼저 선택하세요.');
      return;
    }
    policyDrawerRef.current?.open();
  };

  const handleEditPolicy = (p: MaskPolicy) => {
    policyDrawerRef.current?.open(p);
  };

  const handleDeletePolicy = (p: MaskPolicy) => {
    modal.confirm.execute({
      onOk: () => deletePolicy(p.policyId),
      options: {
        title: '패턴 정책 삭제',
        content: `우선순위 ${p.priority} "${p.pattern}" 패턴을 삭제하시겠습니까?`,
      },
    });
  };

  // ─── ag-Grid columns ──────────────────────────────────────────────────────
  const policyColumnDefs: ColDef<MaskPolicy>[] = useMemo(
    () => [
      {
        headerName: '우선순위',
        field: 'priority',
        width: 90,
        sort: 'asc',
      },
      {
        headerName: '패턴',
        field: 'pattern',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => (p.data ? <span className="font-mono text-[12px] text-gray-700">{p.data.pattern}</span> : null),
      },
      {
        headerName: '패턴 타입',
        field: 'patternType',
        width: 110,
      },
      {
        headerName: '룰',
        field: 'ruleType',
        width: 130,
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => (p.data ? (RULE_TYPE_LABEL[p.data.ruleType] ?? p.data.ruleType) : null),
      },
      {
        headerName: '자릿수',
        field: 'ruleParam',
        width: 80,
        cellClass: 'flex items-center justify-center',
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => p.data?.ruleParam ?? '-',
      },
      {
        headerName: '마스크',
        field: 'maskChar',
        width: 80,
        cellClass: 'flex items-center justify-center',
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => (p.data ? <span className="font-mono">{p.data.maskChar ?? '*'}</span> : null),
      },
      {
        headerName: '상태',
        field: 'enabled',
        width: 90,
        cellClass: 'flex items-center justify-center',
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => {
          if (!p.data) return null;
          return p.data.enabled === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">활성</span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500">비활성</span>
          );
        },
      },
      {
        headerName: '설명',
        field: 'description',
        flex: 2,
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => p.data?.description ?? <span className="text-gray-300">-</span>,
      },
      {
        headerName: '',
        colId: 'actions',
        width: 90,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellClass: 'flex items-center justify-center gap-2',
        cellRenderer: (p: ICellRendererParams<MaskPolicy>) => {
          if (!p.data) return null;
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPolicy(p.data!);
                }}
                title="편집"
              >
                <Pencil className="size-4 text-gray-500 hover:text-blue-600 hover:cursor-pointer" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePolicy(p.data!);
                }}
                title="삭제"
              >
                <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
              </button>
            </div>
          );
        },
      },
    ],
    // 핸들러는 closure로 stable하지 않지만, 페이지 내 state 변경에 따라 다시 만들어져도 부담이 적음
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 카테고리 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          {/* Header */}
          <div className="h-[56px] bg-[#f8f9fb] border-b-2 border-gray-200 flex items-center pr-3">
            <div className="px-5 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-700">카테고리</span>
              <span className="text-[11px] text-gray-400">{filteredCategories.length}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="카테고리 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreateCategory}>
                카테고리 추가
              </Button>
            </div>
          </div>

          {/* Card slider */}
          <div className="h-[170px] px-4 py-3 flex items-center">
            {isCategoriesLoading ? (
              <div className="w-full text-center text-gray-400 text-sm">로딩 중...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '등록된 카테고리가 없습니다'}</span>
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
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.category;
                    const sensitivity = getSensitivityBadge(cat.approverAuthKey);
                    const icon = CATEGORY_ICONS[cat.category] ?? '🔒';
                    const isDisabled = cat.enabled === 0;
                    // 카운트는 선택된 카테고리에 한해 표시 (다른 카드는 '-')
                    const patternCount = isSelected ? policies.length : null;
                    return (
                      <div
                        key={cat.configId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        } ${isDisabled ? 'opacity-60' : ''}`}
                        onClick={(e) => {
                          handleCategorySelect(cat.category);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                        }}
                      >
                        {/* 카드 헤더 */}
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[14px]">{icon}</span>
                            <span className="text-[13px] font-semibold text-gray-900 truncate">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[9px] text-gray-400">{cat.category}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                testModalRef.current?.open(cat.category);
                              }}
                              className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title={`${cat.label} 마스킹 테스트`}
                            >
                              <Play className="size-3" />
                            </button>
                          </div>
                        </div>

                        {/* 메타 정보 */}
                        <div className="text-[11px] text-gray-600 space-y-0.5 mt-1">
                          <div>
                            패턴 <span className="text-gray-900">{patternCount != null ? `${patternCount}건` : '-'}</span>
                          </div>
                          <div>
                            default <span className="text-gray-900">{cat.defaultHours}h</span> · max <span className="text-gray-900">{cat.maxHours}h</span>
                          </div>
                          <div className="truncate">
                            <span className="text-gray-500">권한 </span>
                            <span className="text-[10px] font-mono text-gray-700">{cat.approverAuthKey}</span>
                          </div>
                        </div>

                        {/* 하단 배지 */}
                        <div className="mt-auto flex items-center gap-1.5">
                          {cat.enabled === 1 ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">활성</span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">비활성</span>
                          )}
                          {sensitivity && <span className={`text-[10px] px-1.5 py-0.5 rounded ${sensitivity.className}`}>{sensitivity.label}</span>}
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

        {/* ===== 본문: 좌(카테고리 설정) + 우(패턴 정책 그리드) ===== */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* 좌측: 카테고리 설정 카드 */}
          <div className="w-[360px] flex-shrink-0 bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
            <div className="h-[44px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
              <div className="text-[13px] font-semibold text-gray-700 truncate">
                {selectedConfig ? `${CATEGORY_ICONS[selectedConfig.category] ?? '🔒'} ${selectedConfig.label} (${selectedConfig.category}) 설정` : '카테고리 설정'}
              </div>
              {selectedConfig && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleEditCategory} className="text-[11px] text-[#405189] hover:underline px-1">
                    편집
                  </button>
                  <button type="button" onClick={handleDeleteCategory} className="text-[11px] text-red-500 hover:underline px-1">
                    삭제
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {selectedConfig ? (
                <div className="space-y-4">
                  {/* 활성 */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">상태</div>
                    <div className="flex items-center gap-2">
                      <Switch checked={selectedConfig.enabled === 1} disabled size="small" />
                      <span className="text-[12px] text-gray-700">{selectedConfig.enabled === 1 ? '활성' : '비활성'}</span>
                    </div>
                  </div>

                  {/* 해지 유효 시간 */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">해지 유효 시간</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] text-gray-500 mb-0.5">기본값</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[18px] font-semibold text-gray-900">{selectedConfig.defaultHours}</span>
                          <span className="text-[11px] text-gray-500">시간</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-500 mb-0.5">최대값</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[18px] font-semibold text-gray-900">{selectedConfig.maxHours}</span>
                          <span className="text-[11px] text-gray-500">시간</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1.5">요청 시 기본값 자동 입력 · 최대값 초과 시 자동 clamp</div>
                  </div>

                  {/* 승인 권한 */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">승인 권한</div>
                    <div className="text-[12px] font-mono bg-gray-50 px-2 py-1 rounded text-gray-800 break-all">{selectedConfig.approverAuthKey}</div>
                    <div className="text-[10px] text-gray-500 mt-1">이 권한 보유자만 승인 가능</div>
                  </div>

                  {/* 사유 정책 */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">사유 정책</div>
                    <div className="text-[14px] text-gray-900">
                      {selectedConfig.requireReason === 1 ? '필수' : '선택'} · {selectedConfig.minReasonLength}자 이상
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">감사 추적 가능한 충분한 사유 보장</div>
                  </div>

                  {/* 메타 */}
                  {selectedConfig.workTime && (
                    <div className="border-t border-gray-100 pt-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">최근 변경</div>
                      <div className="text-[11px] text-gray-700">{selectedConfig.workTime}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} />
                  <span className="text-sm">카테고리를 선택하세요</span>
                </div>
              )}
            </div>
          </div>

          {/* 우측: 패턴 정책 그리드 */}
          <div className="flex-1 bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
            <div className="h-[44px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-gray-700">패턴 정책</span>
                <span className="text-[11px] text-gray-400">{selectedCategory ? `${policies.length}건 · 우선순위 ↑` : '카테고리 선택 필요'}</span>
              </div>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreatePolicy} disabled={!selectedCategory}>
                패턴 추가
              </Button>
            </div>

            <div className="flex-1">
              {selectedCategory ? (
                <AgGridReact<MaskPolicy>
                  rowData={policies}
                  columnDefs={policyColumnDefs}
                  gridOptions={{
                    ...gridOptions,
                    statusBar: undefined,
                    pagination: false,
                    sideBar: false,
                  }}
                  loading={isPoliciesLoading}
                  getRowId={(p) => String(p.data.policyId)}
                  defaultColDef={{
                    filter: true,
                    sortable: true,
                    suppressHeaderMenuButton: true,
                    resizable: true,
                  }}
                  onRowDoubleClicked={(e) => {
                    if (e.data) handleEditPolicy(e.data);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} />
                  <span className="text-sm">카테고리를 선택하면 패턴 정책이 표시됩니다</span>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex-shrink-0">
              우선순위 낮을수록 먼저 매칭됩니다. 첫 매칭된 룰이 적용되며, fallback 패턴(.*)은 항상 가장 높은 우선순위 값(예: 99)을 부여하세요.
            </div>
          </div>
        </div>
      </div>

      {/* ===== Modals / Drawers ===== */}
      <MaskCategoryEditModal
        ref={categoryEditRef}
        onSuccess={() => {
          refetchCategories();
        }}
      />
      {selectedCategory && (
        <MaskPolicyDrawer
          ref={policyDrawerRef}
          category={selectedCategory}
          onSuccess={() => {
            refetchPolicies();
            refetchCategories();
          }}
        />
      )}
      <MaskTestModal ref={testModalRef} categories={categories} />
    </div>
  );
}
