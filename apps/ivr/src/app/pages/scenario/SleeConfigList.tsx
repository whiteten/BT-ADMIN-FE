/**
 * 시나리오 환경변수 관리 페이지
 * Pattern: 상단 테넌트 탭 + 카드 슬라이더 + 하단 카테고리(좌)+속성(우) 좌우 분할
 *          속성 체크 → "항목단위적용" → 380px Drawer (시나리오 배포 사이드바 패턴)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Dropdown, Empty, Input } from 'antd';
import { CheckSquareIcon, ClipboardList, Download, FileCog, Folder, History, MoreVertical, Search, SlidersHorizontal, Trash2, Upload as UploadIcon } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import PropertyEditDrawer, { type PropertyEditDrawerRef } from '../../features/slee-config/components/PropertyEditDrawer';
import SleeConfigApplyDrawer, { type SleeConfigApplyDrawerRef } from '../../features/slee-config/components/SleeConfigApplyDrawer';
import SleeConfigHistoryModal, { type SleeConfigHistoryModalRef } from '../../features/slee-config/components/SleeConfigHistoryModal';
import SleeConfigReservationResultModal, { type SleeConfigReservationResultModalRef } from '../../features/slee-config/components/SleeConfigReservationResultModal';
import SleeUserconfigImportModal, { type SleeUserconfigImportModalRef } from '../../features/slee-config/components/SleeUserconfigImportModal';
import {
  sleeConfigQueryKeys,
  useDeleteConfigFile,
  useDeleteProperty,
  useExportSleeConfig,
  useGetSleeConfigCategories,
  useGetSleeConfigFiles,
  useGetSleeConfigProperties,
} from '../../features/slee-config/hooks/useSleeConfigQueries';
import type { SleeConfigCategory, SleeConfigFile, SleeConfigProperty } from '../../features/slee-config/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '시나리오 환경변수', path: '/ivr/scenario/slee-config' }];

export default function SleeConfigList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): 헤더 미전달 → 서버가 TenantContext.isViewAllTenants() 로 전 테넌트 조회
  //  - 대행(actAsTenantId=X): apiClient 가 X-Act-As-Tenant 주입 → X 테넌트로 조회 스코프
  //  - 비운영자: 헤더 미주입 → 서버가 JWT 테넌트 기준으로 자신의 파일만 반환
  const myTenantId = useAuthStore((s) => (s.userInfo?.tenant ? Number(s.userInfo.tenant) : null));
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedConfigFile, setSelectedConfigFile] = useState<string | null>(null);
  // 선택된 카드(환경파일)가 속한 테넌트 — "전체" 스코프에선 카드마다 테넌트가 다를 수 있어 별도 추적.
  const [selectedFileTenantId, setSelectedFileTenantId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedPropertyKeys, setSelectedPropertyKeys] = useState<Set<string>>(new Set());
  const propertyEditDrawerRef = useRef<PropertyEditDrawerRef>(null);
  const importModalRef = useRef<SleeUserconfigImportModalRef>(null);
  const historyModalRef = useRef<SleeConfigHistoryModalRef>(null);
  const applyDrawerRef = useRef<SleeConfigApplyDrawerRef>(null);
  const reservationResultModalRef = useRef<SleeConfigReservationResultModalRef>(null);

  // ─── Data (API hooks) ────────────────────────────────────────────────────
  // 환경파일 목록 — 파라미터 없이 호출. 조회 스코프(내 테넌트/대행/전체)는 서버가 헤더로 판단.
  const { data: allConfigFiles = [] } = useGetSleeConfigFiles({});

  const categoryParams = useMemo(
    () => (selectedFileTenantId && selectedConfigFile ? { tenantId: selectedFileTenantId, configFile: selectedConfigFile } : undefined),
    [selectedFileTenantId, selectedConfigFile],
  );
  const { data: allCategories = [] } = useGetSleeConfigCategories({
    params: categoryParams,
    queryOptions: { enabled: !!selectedFileTenantId && !!selectedConfigFile },
  });

  const propertyParams = useMemo(
    () =>
      selectedFileTenantId && selectedConfigFile && selectedCategory ? { tenantId: selectedFileTenantId, configFile: selectedConfigFile, category: selectedCategory } : undefined,
    [selectedFileTenantId, selectedConfigFile, selectedCategory],
  );
  const { data: properties = [] } = useGetSleeConfigProperties({
    params: propertyParams,
    queryOptions: { enabled: !!selectedFileTenantId && !!selectedConfigFile && !!selectedCategory },
  });

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const filteredConfigFiles = useMemo(() => {
    if (!isSearching) return allConfigFiles;
    const kw = searchText.trim().toLowerCase();
    return allConfigFiles.filter((f) => f.configFile.toLowerCase().includes(kw));
  }, [allConfigFiles, isSearching, searchText]);

  // 목록(스코프) 변경 시 첫 번째 카드 자동 선택
  useEffect(() => {
    if (!selectedConfigFile && filteredConfigFiles.length > 0) {
      setSelectedConfigFile(filteredConfigFiles[0].configFile);
      setSelectedFileTenantId(filteredConfigFiles[0].tenantId);
    }
  }, [filteredConfigFiles, selectedConfigFile]);

  // 카테고리 변경 시 속성 선택 초기화
  useEffect(() => {
    setSelectedPropertyKeys(new Set());
  }, [selectedCategory]);

  // Import 대상 테넌트 — 대행 중이면 대행 테넌트, 아니면 내 테넌트. "전체" 스코프는 선택된 카드의 테넌트로 대체.
  const actAsTenantIdNum = actAsTenantId !== null ? Number(actAsTenantId) : null;
  const importTargetTenantId = operatorMode ? (actAsTenantIdNum ?? selectedFileTenantId) : myTenantId;
  // "전체" 스코프에서만 목록에 테넌트 배지 노출(대행/일반 모드는 전부 같은 테넌트라 무의미) — ScenarioMenuControlList.tsx 패턴 동일.
  const showTenantLabel = operatorMode && actAsTenantId === null;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleScopeChange = (tenantId: string | null) => {
    setActAsTenant(tenantId);
    setSelectedConfigFile(null);
    setSelectedFileTenantId(null);
    setSelectedCategory(null);
    setSearchText('');
    void queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getConfigFiles._def });
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setSelectedConfigFile(null);
    setSelectedFileTenantId(null);
    setSelectedCategory(null);
  };

  const handleCardSelect = (file: SleeConfigFile) => {
    setSelectedConfigFile(file.configFile);
    setSelectedFileTenantId(file.tenantId);
    setSelectedCategory(null);
  };

  const handleOpenItemApply = useCallback(() => {
    if (selectedPropertyKeys.size === 0 || !selectedFileTenantId || !selectedConfigFile) return;
    applyDrawerRef.current?.open({
      mode: 'ITEM',
      tenantId: selectedFileTenantId,
      configFile: selectedConfigFile,
      category: selectedCategory,
      selectedPropertyKeys,
      properties,
      categoryCount: allCategories.length,
    });
  }, [selectedPropertyKeys, selectedFileTenantId, selectedConfigFile, selectedCategory, properties, allCategories.length]);

  const handleOpenFileApply = useCallback(() => {
    if (!selectedFileTenantId || !selectedConfigFile) return;
    applyDrawerRef.current?.open({
      mode: 'FILE',
      tenantId: selectedFileTenantId,
      configFile: selectedConfigFile,
      category: null,
      selectedPropertyKeys: new Set(),
      properties: [],
      categoryCount: allCategories.length,
    });
  }, [selectedFileTenantId, selectedConfigFile, allCategories.length]);

  // ─── 속성 CUD ────────────────────────────────────────────────────────────
  const invalidateAllSleeConfig = useCallback(() => {
    // 환경파일/카테고리/속성 모두 무효화. 환경파일이 사라질 수 있어 카드 슬라이더까지 재조회.
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getConfigFiles._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getCategories._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getProperties._def });
  }, [queryClient]);

  const handleOpenPropertyCreate = useCallback(() => {
    if (!selectedFileTenantId || !selectedConfigFile) return;
    propertyEditDrawerRef.current?.openCreate({
      tenantId: selectedFileTenantId,
      configFile: selectedConfigFile,
      category: selectedCategory,
    });
  }, [selectedFileTenantId, selectedConfigFile, selectedCategory]);

  const handleOpenPropertyEdit = useCallback(
    (row: SleeConfigProperty) => {
      if (!selectedFileTenantId || !selectedConfigFile) return;
      propertyEditDrawerRef.current?.openEdit({
        tenantId: selectedFileTenantId,
        configFile: selectedConfigFile,
        category: row.category,
        property: row.property,
        value: row.value,
        ptyDesc: row.ptyDesc ?? null,
      });
    },
    [selectedFileTenantId, selectedConfigFile],
  );

  const { mutate: deleteSingleProperty } = useDeleteProperty({
    mutationOptions: {
      onSuccess: () => {
        toast.success('속성을 삭제했습니다.');
        invalidateAllSleeConfig();
      },
      onError: () => {
        toast.error('속성 삭제에 실패했습니다.');
      },
    },
  });

  // ─── Phase 1: 환경파일 전체 삭제 ─────────────────────────────────────────
  const { mutate: deleteConfigFile } = useDeleteConfigFile({
    mutationOptions: {
      onSuccess: (data, variables) => {
        toast.success(`환경파일이 삭제되었습니다. (USERCONFIG ${data.deletedRows}건 삭제${data.grantRemoved ? ' + GRANT 정리' : ''})`);
        // 삭제한 카드가 현재 선택된 카드였을 때만 선택 해제 (다른 카드 삭제 시 기존 선택 유지)
        if (selectedConfigFile === variables.configFile) {
          setSelectedConfigFile(null);
          setSelectedCategory(null);
        }
        invalidateAllSleeConfig();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '환경파일 삭제에 실패했습니다.';
        // 진행 예약 차단 메시지는 그대로 노출 (BE: "진행 중 예약이 있어 삭제할 수 없습니다. 예약 취소 후 삭제하세요.")
        toast.error(msg);
      },
    },
  });

  /** 카드 점세개 드롭다운의 "삭제" — 카드 선택 여부와 무관하게 해당 카드의 파일을 바로 삭제. */
  const handleDeleteConfigFile = useCallback(
    (file: SleeConfigFile) => {
      modal.confirm.delete({
        options: {
          title: '환경파일 전체 삭제',
          content: (
            <div>
              <p>
                환경파일 <b>"{file.configFile}"</b> 의 모든 속성을 삭제합니다.
              </p>
              <p className="text-[12px] text-slate-500 mt-2">※ 진행 중 예약이 있으면 차단됩니다. 적용 이력/예약 기록/백업은 보존됩니다.</p>
            </div>
          ),
        },
        onOk: () => deleteConfigFile({ tenantId: file.tenantId, configFile: file.configFile }),
      });
    },
    [modal, deleteConfigFile],
  );

  /** 카드 점세개 드롭다운 메뉴 (IvrEndpointList getCardMenuItems 패턴 동일). */
  const getCardMenuItems = (file: SleeConfigFile) => [
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDeleteConfigFile(file),
    },
  ];

  // ─── 환경변수 Export (cfg ZIP) — AS-IS IPR30S3030EX ──────────────────────
  const { mutate: exportConfig, isPending: isExporting } = useExportSleeConfig();
  const handleExport = useCallback(() => {
    if (!selectedFileTenantId || !selectedConfigFile) {
      toast.warning('Export할 환경파일을 선택하세요.');
      return;
    }
    exportConfig({ tenantId: selectedFileTenantId, configFile: selectedConfigFile });
  }, [selectedFileTenantId, selectedConfigFile, exportConfig]);

  // ─── 이력 모달 (Phase 6) ─────────────────────────────────────────────
  const handleOpenHistory = useCallback(() => {
    if (!selectedFileTenantId || !selectedConfigFile) return;
    historyModalRef.current?.open({ tenantId: selectedFileTenantId, configFile: selectedConfigFile });
  }, [selectedFileTenantId, selectedConfigFile]);

  // ─── 예약 적용 결과 모달 (AS-IS IPR30S3030L3) ──────────────────────────
  const handleOpenReservationResult = useCallback(() => {
    if (!selectedFileTenantId || !selectedConfigFile) return;
    reservationResultModalRef.current?.open({ tenantId: selectedFileTenantId, configFile: selectedConfigFile });
  }, [selectedFileTenantId, selectedConfigFile]);

  /** 행별 휴지통 단건 삭제 — DNIS관리(MCS) 와 동일하게 useModal 사용 (centered 모달). */
  const handleDeleteSingleProperty = useCallback(
    (row: SleeConfigProperty) => {
      if (!selectedFileTenantId || !selectedConfigFile) return;
      modal.confirm.delete({
        options: {
          title: '속성 삭제',
          content: `"${row.category} / ${row.property}" 속성을 삭제하시겠습니까?`,
        },
        onOk: () =>
          deleteSingleProperty({
            tenantId: selectedFileTenantId,
            configFile: selectedConfigFile,
            category: row.category,
            property: row.property,
          }),
      });
    },
    [modal, selectedFileTenantId, selectedConfigFile, deleteSingleProperty],
  );

  const handlePropertySelectionChanged = useCallback((api: { getSelectedRows: () => SleeConfigProperty[] }) => {
    const selected = api.getSelectedRows();
    setSelectedPropertyKeys(new Set(selected.map((p) => `${p.category}::${p.property}`)));
  }, []);

  // ─── ag-Grid columns ───────────────────────────────────────────────────
  const categoryColumnDefs: ColDef<SleeConfigCategory>[] = useMemo(
    () => [
      { headerName: '카테고리', field: 'category', flex: 3, minWidth: 200 },
      { headerName: '속성 수', field: 'propertyCount', flex: 1, minWidth: 100 },
    ],
    [],
  );

  const propertyColumnDefs: ColDef<SleeConfigProperty>[] = useMemo(
    () => [
      { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 40, maxWidth: 40, suppressSizeToFit: true },
      { headerName: '속성', field: 'property', flex: 2, minWidth: 150 },
      { headerName: '값', field: 'value', flex: 3, minWidth: 200 },
      { headerName: '설명', field: 'ptyDesc', flex: 2, minWidth: 150 },
      {
        headerName: '',
        colId: 'action',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<SleeConfigProperty>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              className="flex items-center justify-center w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSingleProperty(params.data!);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleDeleteSingleProperty],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 툴바(운영자모드 테넌트 스코프 + 액션) — 검색은 좌측 환경파일 목록으로 이동 ===== */}
        <div className="bg-white bt-shadow flex-shrink-0 px-5 h-[56px]">
          <header className="flex items-center gap-2 flex-wrap h-full">
            {operatorMode && (
              <ScopeSelect kind="tenant" options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))} value={actAsTenantId} onChange={handleScopeChange} />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button color="blue" variant="filled" icon={<History className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleOpenHistory}>
                적용이력
              </Button>
              <Button
                variant="solid"
                icon={<UploadIcon className="size-3.5" />}
                disabled={!importTargetTenantId}
                onClick={() => importTargetTenantId && importModalRef.current?.open(importTargetTenantId)}
              >
                Import
              </Button>
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} loading={isExporting} disabled={!selectedConfigFile} onClick={handleExport}>
                Export
              </Button>
            </div>
          </header>
        </div>

        <div className="flex flex-1 min-h-0 gap-4">
          {/* ===== 좌측: 환경파일 목록 (검색 + flat list — ScenarioMenuControlList.tsx 시나리오 목록 패턴) ===== */}
          <div className="bg-white bt-shadow flex flex-col flex-[1] min-w-0 min-h-0 overflow-hidden">
            <div className="px-5 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileCog className="size-4 text-[#405189]" />
                <h3 className="text-sm font-semibold text-gray-800">환경파일</h3>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{filteredConfigFiles.length}개</span>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex-1 min-h-0 flex flex-col gap-3 p-5 overflow-hidden">
              <Input allowClear prefix={<Search className="size-3.5 text-gray-400" />} placeholder="환경파일 검색" value={searchText} onChange={handleSearchChange} />

              <div className="flex-1 min-h-0 overflow-y-auto -mx-1">
                {filteredConfigFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                    <Empty description={false} styles={{ image: { height: 40 } }} />
                    <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 환경파일이 없습니다'}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {filteredConfigFiles.map((file) => {
                      const isSelected = selectedConfigFile === file.configFile && selectedFileTenantId === file.tenantId;
                      return (
                        <div
                          key={`${file.tenantId}-${file.configFile}`}
                          onClick={() => handleCardSelect(file)}
                          title={file.configFile}
                          className={cn(
                            'group flex items-center gap-2 cursor-pointer rounded-md border-l-[3px] px-3 py-2 transition-colors',
                            isSelected ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]' : 'border-transparent hover:bg-gray-50',
                          )}
                        >
                          <FileCog className={cn('size-4 flex-shrink-0', isSelected ? 'text-[var(--color-bt-primary)]' : 'text-gray-400')} />
                          <div className="flex-1 min-w-0">
                            <div className={cn('truncate text-sm', isSelected ? 'text-[var(--color-bt-primary)] font-medium' : 'text-gray-700')}>{file.configFile}</div>
                            <div className="text-[11px] text-gray-400 truncate">카테고리 {file.categoryCount}개</div>
                          </div>
                          {showTenantLabel && file.tenantName && (
                            <Badge variant="secondary" className="text-[10px] leading-4 !h-5 shrink-0 text-amber-700 bg-amber-50 border border-amber-200">
                              {file.tenantName}
                            </Badge>
                          )}
                          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 opacity-0 group-hover:opacity-100">
                            <Dropdown menu={{ items: getCardMenuItems(file) }} trigger={['click']} placement="bottomRight">
                              <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                                <MoreVertical className="size-3.5 text-gray-400" />
                              </button>
                            </Dropdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 카테고리 그리드 */}
          {/* 카테고리는 USERCONFIG (속성) 의 컬럼일 뿐 별도 마스터 없음 → 단독 CUD 불요 (레거시 IPR30S3030 도 없음) */}
          <div className="bg-white bt-shadow flex flex-col flex-[1] min-w-0 min-h-0 overflow-hidden">
            <div className="px-5 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Folder className="size-4 text-[#405189]" />
                <h3 className="text-sm font-semibold text-gray-800">
                  카테고리 — <span className="text-[#405189]">{selectedConfigFile ?? ''}</span>
                </h3>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{allCategories.length}개</span>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex-1 min-h-0 p-5">
              {selectedConfigFile ? (
                <AgGridReact<SleeConfigCategory>
                  rowData={allCategories}
                  columnDefs={categoryColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  getRowId={(params) => params.data.category}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                  rowSelection="single"
                  // 카테고리 목록 로드 시 선택된 행이 없으면 첫 번째 행 자동 선택
                  onRowDataUpdated={(e) => {
                    if (e.api.getSelectedRows().length > 0) return;
                    e.api.getDisplayedRowAtIndex(0)?.setSelected(true);
                  }}
                  onSelectionChanged={(e) => {
                    const selected = e.api.getSelectedRows();
                    setSelectedCategory(selected.length > 0 ? selected[0].category : null);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Empty description="환경파일을 선택하세요" />
                </div>
              )}
            </div>
          </div>

          {/* 속성 그리드 */}
          <div className="bg-white bt-shadow flex flex-col flex-[2] min-w-0 min-h-0 overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#405189]" />
                <h3 className="text-sm font-semibold text-gray-800">
                  속성 — <span className="text-[#405189]">{selectedCategory ?? ''}</span>
                </h3>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">{properties.length}개</span>
              </div>
              <div className="flex gap-2 items-center">
                <Button type="primary" icon={<span className="text-base leading-none">+</span>} disabled={!selectedConfigFile} onClick={handleOpenPropertyCreate}>
                  속성 추가
                </Button>
                <Button color="purple" variant="solid" icon={<CheckSquareIcon className="size-3.5" />} disabled={selectedPropertyKeys.size === 0} onClick={handleOpenItemApply}>
                  항목단위 적용 ({selectedPropertyKeys.size})
                </Button>
                <Button color="purple" variant="solid" icon={<FileCog className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleOpenFileApply}>
                  파일단위 적용
                </Button>
                <Button color="blue" variant="filled" icon={<ClipboardList className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleOpenReservationResult}>
                  예약 적용 결과
                </Button>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex-1 min-h-0 p-5">
              {selectedCategory ? (
                <AgGridReact<SleeConfigProperty>
                  rowData={properties}
                  columnDefs={propertyColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  getRowId={(params) => `${params.data.category}::${params.data.property}`}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                  rowSelection="multiple"
                  suppressRowClickSelection
                  onSelectionChanged={(e) => handlePropertySelectionChanged(e.api)}
                  onRowDoubleClicked={(e) => e.data && handleOpenPropertyEdit(e.data)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Empty description="카테고리를 선택하세요" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PropertyEditDrawer ref={propertyEditDrawerRef} onSuccess={invalidateAllSleeConfig} />
      <SleeUserconfigImportModal ref={importModalRef} />
      <SleeConfigHistoryModal ref={historyModalRef} />
      <SleeConfigReservationResultModal ref={reservationResultModalRef} />
      <SleeConfigApplyDrawer ref={applyDrawerRef} />
    </div>
  );
}
