/**
 * 시나리오 환경변수 관리 페이지
 * Pattern: 상단 테넌트 탭 + 카드 슬라이더 + 하단 카테고리(좌)+속성(우) 좌우 분할
 *          속성 체크 → "항목단위적용" → 380px Drawer (시나리오 배포 사이드바 패턴)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Checkbox, DatePicker, Drawer, Empty, Input, Radio, Tag, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileCog,
  FileText,
  History,
  Info,
  Search,
  Server,
  Settings,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import PropertyEditDrawer, { type PropertyEditDrawerRef } from '../../features/slee-config/components/PropertyEditDrawer';
import SleeConfigApplyResultModal, { type SleeConfigApplyResultModalRef } from '../../features/slee-config/components/SleeConfigApplyResultModal';
import SleeConfigHistoryModal, { type SleeConfigHistoryModalRef } from '../../features/slee-config/components/SleeConfigHistoryModal';
import SleeConfigReservationResultModal, { type SleeConfigReservationResultModalRef } from '../../features/slee-config/components/SleeConfigReservationResultModal';
import SleeUserconfigImportModal, { type SleeUserconfigImportModalRef } from '../../features/slee-config/components/SleeUserconfigImportModal';
import {
  sleeConfigQueryKeys,
  useApplyItemImmediate,
  useApplyReservation,
  useDeleteConfigFile,
  useDeleteProperty,
  useExportSleeConfig,
  useGetSleeConfigCategories,
  useGetSleeConfigFiles,
  useGetSleeConfigIrSystems,
  useGetSleeConfigProperties,
  useGetSleeConfigTenants,
} from '../../features/slee-config/hooks/useSleeConfigQueries';
import type { SleeConfigCategory, SleeConfigFile, SleeConfigIrSystem, SleeConfigProperty } from '../../features/slee-config/types';
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

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedConfigFile, setSelectedConfigFile] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [applyDrawerOpen, setApplyDrawerOpen] = useState(false);
  // 적용 범위 — ITEM: 선택 속성만, FILE: 환경파일 전체 (백엔드의 scope() 자동 판정에 맞춤)
  const [applyMode, setApplyMode] = useState<'ITEM' | 'FILE'>('ITEM');
  const [selectedPropertyKeys, setSelectedPropertyKeys] = useState<Set<string>>(new Set());
  const [applyTiming, setApplyTiming] = useState<'REALTIME' | 'RESERVED'>('REALTIME');
  const [overwriteOn, setOverwriteOn] = useState(false);
  const [useBackupOn, setUseBackupOn] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [reservationAt, setReservationAt] = useState<Dayjs | null>(null);
  const [checkedSystemIds, setCheckedSystemIds] = useState<Set<number>>(new Set());
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const propertyEditDrawerRef = useRef<PropertyEditDrawerRef>(null);
  const importModalRef = useRef<SleeUserconfigImportModalRef>(null);
  const historyModalRef = useRef<SleeConfigHistoryModalRef>(null);
  const applyResultModalRef = useRef<SleeConfigApplyResultModalRef>(null);
  const reservationResultModalRef = useRef<SleeConfigReservationResultModalRef>(null);
  // Drawer 열고 시스템 첫 로드 시점에만 자동 전체 체크. 이후 사용자 수동 해제 가능.
  const autoCheckDoneRef = useRef(false);

  // ─── Data (API hooks) ────────────────────────────────────────────────────
  const { data: rawTenants = [] } = useGetSleeConfigTenants();
  const tenants = useMemo(() => [...rawTenants].sort((a, b) => a.tenantId - b.tenantId), [rawTenants]);
  const tenantNameMap = useMemo(() => new Map(tenants.map((t) => [t.tenantId, t.tenantName])), [tenants]);

  const configFileParams = useMemo(() => (selectedTenantId ? { tenantId: selectedTenantId } : undefined), [selectedTenantId]);
  const { data: allConfigFiles = [] } = useGetSleeConfigFiles({
    params: configFileParams,
    queryOptions: { enabled: !!selectedTenantId },
  });

  const categoryParams = useMemo(
    () => (selectedTenantId && selectedConfigFile ? { tenantId: selectedTenantId, configFile: selectedConfigFile } : undefined),
    [selectedTenantId, selectedConfigFile],
  );
  const { data: allCategories = [] } = useGetSleeConfigCategories({
    params: categoryParams,
    queryOptions: { enabled: !!selectedTenantId && !!selectedConfigFile },
  });

  const propertyParams = useMemo(
    () => (selectedTenantId && selectedConfigFile && selectedCategory ? { tenantId: selectedTenantId, configFile: selectedConfigFile, category: selectedCategory } : undefined),
    [selectedTenantId, selectedConfigFile, selectedCategory],
  );
  const { data: properties = [] } = useGetSleeConfigProperties({
    params: propertyParams,
    queryOptions: { enabled: !!selectedTenantId && !!selectedConfigFile && !!selectedCategory },
  });

  const irSystemParams = useMemo(
    () => (selectedTenantId && selectedConfigFile ? { tenantId: selectedTenantId, configFile: selectedConfigFile } : undefined),
    [selectedTenantId, selectedConfigFile],
  );
  const { data: irSystems = [] } = useGetSleeConfigIrSystems({
    params: irSystemParams,
    queryOptions: { enabled: !!selectedTenantId && !!selectedConfigFile && applyDrawerOpen },
  });

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;

  const filteredConfigFiles = useMemo(() => {
    if (!isSearching) return allConfigFiles;
    const kw = searchText.trim().toLowerCase();
    return allConfigFiles.filter((f) => f.configFile.toLowerCase().includes(kw));
  }, [allConfigFiles, isSearching, searchText]);

  const selectedFileObj = useMemo(() => {
    if (!selectedConfigFile || !selectedTenantId) return null;
    return allConfigFiles.find((f) => f.configFile === selectedConfigFile && f.tenantId === selectedTenantId) ?? null;
  }, [allConfigFiles, selectedConfigFile, selectedTenantId]);

  // 진입 시 첫 번째 테넌트 자동 선택
  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].tenantId);
    }
  }, [tenants, selectedTenantId]);

  // 테넌트 변경 시 첫 번째 카드 자동 선택
  useEffect(() => {
    if (!selectedConfigFile && filteredConfigFiles.length > 0) {
      setSelectedConfigFile(filteredConfigFiles[0].configFile);
    }
  }, [filteredConfigFiles, selectedConfigFile]);

  // 카테고리 변경 시 속성 선택 초기화
  useEffect(() => {
    setSelectedPropertyKeys(new Set());
  }, [selectedCategory]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTenantSelect = (tenantId: number) => {
    if (selectedTenantId === tenantId) return;
    setSelectedTenantId(tenantId);
    setSelectedConfigFile(null);
    setSelectedCategory(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setSelectedConfigFile(null);
    setSelectedCategory(null);
  };

  const handleCardSelect = (file: SleeConfigFile) => {
    setSelectedConfigFile(file.configFile);
    setSelectedCategory(null);
  };

  const resetApplyFormState = useCallback(() => {
    setApplyTiming('REALTIME');
    setOverwriteOn(false);
    setUseBackupOn(false);
    setApplyReason('');
    setReservationAt(dayjs().add(10, 'minute'));
    setCheckedSystemIds(new Set()); // Drawer 데이터 로드 후 자동 체크 (useRef 가드)
  }, []);

  const handleOpenItemApply = useCallback(() => {
    if (selectedPropertyKeys.size === 0) return;
    setApplyMode('ITEM');
    resetApplyFormState();
    setApplyDrawerOpen(true);
  }, [selectedPropertyKeys, resetApplyFormState]);

  const handleOpenFileApply = useCallback(() => {
    if (!selectedConfigFile) return;
    setApplyMode('FILE');
    resetApplyFormState();
    setApplyDrawerOpen(true);
  }, [selectedConfigFile, resetApplyFormState]);

  // ─── 속성 CUD ────────────────────────────────────────────────────────────
  const invalidateAllSleeConfig = useCallback(() => {
    // 환경파일/카테고리/속성 모두 무효화. 환경파일이 사라질 수 있어 카드 슬라이더까지 재조회.
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getConfigFiles._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getCategories._def });
    queryClient.invalidateQueries({ queryKey: sleeConfigQueryKeys.getProperties._def });
  }, [queryClient]);

  const handleOpenPropertyCreate = useCallback(() => {
    if (!selectedTenantId || !selectedConfigFile) return;
    propertyEditDrawerRef.current?.openCreate({
      tenantId: selectedTenantId,
      configFile: selectedConfigFile,
      category: selectedCategory,
    });
  }, [selectedTenantId, selectedConfigFile, selectedCategory]);

  const handleOpenPropertyEdit = useCallback(
    (row: SleeConfigProperty) => {
      if (!selectedTenantId || !selectedConfigFile) return;
      propertyEditDrawerRef.current?.openEdit({
        tenantId: selectedTenantId,
        configFile: selectedConfigFile,
        category: row.category,
        property: row.property,
        value: row.value,
        ptyDesc: row.ptyDesc ?? null,
      });
    },
    [selectedTenantId, selectedConfigFile],
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
      onSuccess: (data) => {
        toast.success(`환경파일이 삭제되었습니다. (USERCONFIG ${data.deletedRows}건 삭제${data.grantRemoved ? ' + GRANT 정리' : ''})`);
        // 환경파일이 사라졌으니 선택 해제 + 전체 재조회
        setSelectedConfigFile(null);
        setSelectedCategory(null);
        invalidateAllSleeConfig();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '환경파일 삭제에 실패했습니다.';
        // 진행 예약 차단 메시지는 그대로 노출 (BE: "진행 중 예약이 있어 삭제할 수 없습니다. 예약 취소 후 삭제하세요.")
        toast.error(msg);
      },
    },
  });

  const handleDeleteConfigFile = useCallback(() => {
    if (!selectedTenantId || !selectedConfigFile) return;
    modal.confirm.delete({
      options: {
        title: '환경파일 전체 삭제',
        content: (
          <div>
            <p>
              환경파일 <b>"{selectedConfigFile}"</b> 의 모든 속성을 삭제합니다.
            </p>
            <p className="text-[12px] text-slate-500 mt-2">※ 진행 중 예약이 있으면 차단됩니다. 적용 이력/예약 기록/백업은 보존됩니다.</p>
          </div>
        ),
      },
      onOk: () => deleteConfigFile({ tenantId: selectedTenantId, configFile: selectedConfigFile }),
    });
  }, [modal, selectedTenantId, selectedConfigFile, deleteConfigFile]);

  // ─── 환경변수 Export (cfg ZIP) — AS-IS IPR30S3030EX ──────────────────────
  const { mutate: exportConfig, isPending: isExporting } = useExportSleeConfig();
  const handleExport = useCallback(() => {
    if (!selectedTenantId || !selectedConfigFile) {
      toast.warning('Export할 환경파일을 선택하세요.');
      return;
    }
    exportConfig({ tenantId: selectedTenantId, configFile: selectedConfigFile });
  }, [selectedTenantId, selectedConfigFile, exportConfig]);

  // ─── 이력 모달 (Phase 6) ─────────────────────────────────────────────
  const handleOpenHistory = useCallback(() => {
    if (!selectedTenantId || !selectedConfigFile) return;
    historyModalRef.current?.open({ tenantId: selectedTenantId, configFile: selectedConfigFile });
  }, [selectedTenantId, selectedConfigFile]);

  // ─── 예약 적용 결과 모달 (AS-IS IPR30S3030L3) ──────────────────────────
  const handleOpenReservationResult = useCallback(() => {
    if (!selectedTenantId || !selectedConfigFile) return;
    reservationResultModalRef.current?.open({ tenantId: selectedTenantId, configFile: selectedConfigFile });
  }, [selectedTenantId, selectedConfigFile]);

  /** 행별 휴지통 단건 삭제 — DNIS관리(MCS) 와 동일하게 useModal 사용 (centered 모달). */
  const handleDeleteSingleProperty = useCallback(
    (row: SleeConfigProperty) => {
      if (!selectedTenantId || !selectedConfigFile) return;
      modal.confirm.delete({
        options: {
          title: '속성 삭제',
          content: `"${row.category} / ${row.property}" 속성을 삭제하시겠습니까?`,
        },
        onOk: () =>
          deleteSingleProperty({
            tenantId: selectedTenantId,
            configFile: selectedConfigFile,
            category: row.category,
            property: row.property,
          }),
      });
    },
    [modal, selectedTenantId, selectedConfigFile, deleteSingleProperty],
  );

  const handlePropertySelectionChanged = useCallback((api: { getSelectedRows: () => SleeConfigProperty[] }) => {
    const selected = api.getSelectedRows();
    setSelectedPropertyKeys(new Set(selected.map((p) => `${p.category}::${p.property}`)));
  }, []);

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
        setApplyDrawerOpen(false);
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
          setApplyDrawerOpen(false);
          return;
        }
        toast.success(`예약 등록 완료 (insert=${result.configSystemInserted}, update=${result.configSystemUpdated})`);
        setApplyDrawerOpen(false);
      },
      onError: () => {
        toast.error('예약 등록 요청이 실패했습니다.');
      },
    },
  });

  const isApplying = isApplyingImmediate || isApplyingReservation;

  const handleSubmitApply = useCallback(() => {
    if (!selectedTenantId || !selectedConfigFile) return;
    if (checkedSystemIds.size === 0) return;
    if (applyMode === 'ITEM') {
      // ITEM: category + properties 필수
      if (!selectedCategory || selectedPropertyKeys.size === 0) return;
    }

    const targetSystemIds = Array.from(checkedSystemIds);
    // ITEM: 선택 속성만 / FILE: 환경파일 전체 (백엔드 scope() 가 properties 빈 배열 → FILE 로 자동 판정)
    const selectedPropertyNames = applyMode === 'ITEM' ? Array.from(selectedPropertyKeys).map((key) => key.split('::')[1]) : [];
    // ITEM 은 selectedCategory 가 보장됨 (위 validation), FILE 은 undefined → 백엔드 scope=FILE 판정.
    const requestCategory: string | undefined = applyMode === 'ITEM' ? (selectedCategory ?? undefined) : undefined;

    const trimmedReason = applyReason.trim();

    if (applyTiming === 'REALTIME') {
      applyImmediate({
        tenantId: selectedTenantId,
        configFile: selectedConfigFile,
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
      applyMode === 'ITEM'
        ? (() => {
            const propertyByName = new Map(properties.map((p) => [p.property, p]));
            return selectedPropertyNames.map((name) => ({
              property: name,
              chgValue: propertyByName.get(name)?.value ?? '',
            }));
          })()
        : [];

    applyReservation({
      tenantId: selectedTenantId,
      configFile: selectedConfigFile,
      category: requestCategory,
      propertyChanges,
      targetSystemIds,
      applyDatetime: reservationAt.format('YYYY-MM-DDTHH:mm:ss'),
      applyReason: trimmedReason || undefined,
    });
  }, [
    applyMode,
    selectedTenantId,
    selectedConfigFile,
    selectedCategory,
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
  //   - applyDrawerOpen=false 로 닫힐 때 ref 리셋 → 다음 진입 시 다시 1회 자동 체크.
  //   - 예약중(svcResvId 있음) 시스템은 적용 대상에서 제외.
  useEffect(() => {
    if (!applyDrawerOpen) {
      autoCheckDoneRef.current = false;
      return;
    }
    if (!autoCheckDoneRef.current && irSystems.length > 0) {
      const checkableIds = irSystems.filter((s) => !s.svcResvId).map((s) => s.systemId);
      setCheckedSystemIds(new Set(checkableIds));
      autoCheckDoneRef.current = true;
    }
  }, [applyDrawerOpen, irSystems]);

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
        {/* ===== 상단: 테넌트 탭 바 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            <button
              type="button"
              className="flex-shrink-0 w-10 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            <div ref={tabScrollRef} className="flex items-stretch flex-1 min-w-0 overflow-x-auto divide-x divide-gray-200" style={{ scrollbarWidth: 'none' }}>
              {tenants.map((tenant) => {
                const isActive = selectedTenantId === tenant.tenantId;
                return (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleTenantSelect(tenant.tenantId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <FileText className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{tenant.tenantName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({tenant.configFileCount})</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="flex-shrink-0 w-10 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="환경파일 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button
                variant="solid"
                icon={<UploadIcon className="size-3.5" />}
                disabled={!selectedTenantId}
                onClick={() => selectedTenantId && importModalRef.current?.open(selectedTenantId)}
              >
                Import
              </Button>
              <Button color="cyan" variant="solid" icon={<Download className="size-3.5" />} loading={isExporting} disabled={!selectedConfigFile} onClick={handleExport}>
                Export
              </Button>
              <Button color="purple" variant="solid" icon={<FileCog className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleOpenFileApply}>
                파일단위 적용
              </Button>
              <Button color="blue" variant="filled" icon={<ClipboardList className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleOpenReservationResult}>
                예약 적용 결과
              </Button>
              <Button color="blue" variant="filled" icon={<History className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleOpenHistory}>
                이력
              </Button>
              <Button color="red" variant="solid" icon={<Trash2 className="size-3.5" />} disabled={!selectedConfigFile} onClick={handleDeleteConfigFile}>
                파일삭제
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 py-3 h-[170px]">
            {filteredConfigFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 환경파일이 없습니다'}</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none' }}>
                  {filteredConfigFiles.map((file) => {
                    const isCardSelected = selectedConfigFile === file.configFile;
                    return (
                      <div
                        key={`${file.tenantId}-${file.configFile}`}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(file);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                      >
                        <span className="text-sm font-semibold text-gray-800 truncate mb-1.5">{file.configFile}</span>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Building2 className="size-3 text-gray-400" />
                            <span className="truncate">{tenantNameMap.get(file.tenantId) ?? `Tenant ${file.tenantId}`}</span>
                          </div>
                          <div>카테고리 수: {file.categoryCount}</div>
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

        {/* ===== 하단: 카테고리(좌) + 속성(우) ===== */}
        <div className="flex flex-1 min-h-0 gap-4">
          {/* 카테고리 그리드 */}
          <div className="bg-white bt-shadow flex flex-col w-[420px] flex-shrink-0 min-h-0 overflow-hidden">
            {/* 카테고리는 USERCONFIG (속성) 의 컬럼일 뿐 별도 마스터 없음 → 단독 CUD 불요 (레거시 IPR30S3030 도 없음) */}
            {/* 헤더 min-h-[49px] — 속성 그리드 헤더(버튼 포함) 와 높이 통일 */}
            <div className="px-4 py-2 flex items-center flex-shrink-0 border-b border-gray-100 min-h-[49px]">
              <span className="text-sm font-semibold text-gray-800">카테고리 ({allCategories.length})</span>
            </div>
            <div className="flex-1 min-h-0">
              {selectedConfigFile ? (
                <AgGridReact<SleeConfigCategory>
                  rowData={allCategories}
                  columnDefs={categoryColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  getRowId={(params) => params.data.category}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                  rowSelection="single"
                  onSelectionChanged={(e) => {
                    const selected = e.api.getSelectedRows();
                    setSelectedCategory(selected.length > 0 ? selected[0].category : null);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} imageStyle={{ height: 32 }} />
                  <span className="text-xs">환경파일을 선택하세요</span>
                </div>
              )}
            </div>
          </div>

          {/* 속성 그리드 */}
          <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-4 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100 min-h-[49px]">
              <span className="text-sm font-semibold text-gray-800">
                {selectedCategory ? `${selectedCategory} 속성` : '속성'} ({properties.length})
              </span>
              <div className="flex gap-2 items-center">
                <Button color="purple" variant="solid" icon={<Settings className="size-3.5" />} disabled={selectedPropertyKeys.size === 0} onClick={handleOpenItemApply}>
                  항목단위 적용 ({selectedPropertyKeys.size})
                </Button>
                {/* 삭제는 행별 휴지통으로 처리 (DNIS관리(MCS) 패턴 동일) */}
                <Button type="primary" icon={<span className="text-base leading-none">+</span>} disabled={!selectedConfigFile} onClick={handleOpenPropertyCreate}>
                  속성 추가
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {selectedCategory ? (
                <AgGridReact<SleeConfigProperty>
                  rowData={properties}
                  columnDefs={propertyColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  getRowId={(params) => `${params.data.category}::${params.data.property}`}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                  rowSelection="multiple"
                  onSelectionChanged={(e) => handlePropertySelectionChanged(e.api)}
                  onRowDoubleClicked={(e) => e.data && handleOpenPropertyEdit(e.data)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                  <Empty description={false} imageStyle={{ height: 32 }} />
                  <span className="text-xs">카테고리를 선택하세요</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 적용 Drawer (MS관리 멤버관리 패턴 동일 — 680px + footer) ===== */}
      <Drawer
        title={applyMode === 'ITEM' ? '항목단위 적용' : '파일단위 적용'}
        closable={{ placement: 'end' }}
        placement="right"
        open={applyDrawerOpen}
        onClose={() => setApplyDrawerOpen(false)}
        styles={{ wrapper: { width: 680 }, body: { display: 'flex', flexDirection: 'column' } }}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              대상 시스템: {checkedSystemIds.size}/{irSystems.filter((s) => !s.svcResvId).length}
              {irSystems.some((s) => s.svcResvId) && <span className="text-slate-400"> · 예약중 {irSystems.filter((s) => !!s.svcResvId).length} 제외</span>}
            </span>
            <div className="flex gap-2">
              <Button onClick={() => setApplyDrawerOpen(false)}>취소</Button>
              <Button
                type="primary"
                loading={isApplying}
                disabled={checkedSystemIds.size === 0 || (applyMode === 'ITEM' && selectedPropertyKeys.size === 0) || (applyTiming === 'RESERVED' && !reservationAt)}
                onClick={handleSubmitApply}
              >
                적용
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* 선택된 항목 정보 — ITEM/FILE 분기 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex-shrink-0">
            <div className="text-[11px] text-slate-500 mb-0.5">{applyMode === 'ITEM' ? '선택된 항목' : '대상 환경파일'}</div>
            {applyMode === 'ITEM' ? (
              <>
                <div className="text-[13px] font-semibold text-slate-800">{selectedPropertyKeys.size}개 속성</div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  {selectedConfigFile} / {selectedCategory}
                </div>
              </>
            ) : (
              <>
                <div className="text-[13px] font-semibold text-slate-800 truncate">{selectedConfigFile}</div>
                <div className="text-[11px] text-slate-500 mt-1">카테고리 {allCategories.length}개 · 환경파일 전체 반영</div>
              </>
            )}
          </div>

          {/* 대상 시스템 목록 — 남은 공간 다 차지 */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-[12px] font-semibold text-slate-700">
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
                      <span className="text-[11px] text-slate-500">전체</span>
                    </Checkbox>
                  );
                })()}
            </div>
            {irSystems.length === 0 ? (
              <div className="text-center text-slate-400 text-[12px] py-4 border border-dashed border-slate-200 rounded-md">적용 가능한 IR 시스템이 없습니다.</div>
            ) : (
              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
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
                        <div className="text-[12px] font-medium text-slate-800 truncate">{sys.systemName}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {sys.nodeName ?? `Node ${sys.nodeId}`}
                          {sys.ioIpAddress ? ` · ${sys.ioIpAddress}` : ''}
                        </div>
                      </div>
                      {reserved && <Tag color="blue">예약중</Tag>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 적용 설정 — 하단 고정. layout shift 방지: 모드 토글해도 영역 높이 변화 없음. */}
          <div className="border-t border-slate-100 pt-3 flex-shrink-0">
            {/* 적용 방식 + 예약 시각 인라인. DatePicker 는 실시간 모드에서도 자리 점유 (disabled). */}
            <div className="mb-3 flex items-center gap-3 flex-wrap">
              <span className="text-[12px] text-slate-600 flex-shrink-0">적용 방식</span>
              <Radio.Group value={applyTiming} onChange={(e) => setApplyTiming(e.target.value)}>
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

            {/* 전체 Overwrite + 백업 — 항상 표시, 예약 모드일 때 disabled. */}
            <div className="mb-3 flex items-center gap-6">
              <Tooltip
                title={applyTiming === 'RESERVED' ? '예약 모드에서는 사용되지 않습니다 (실시간 적용 전용).' : 'USERCONFIG 기준으로 CONFIGSYSTEM 을 강제 재구성 (delete + insert).'}
              >
                <Checkbox checked={overwriteOn} disabled={applyTiming === 'RESERVED'} onChange={(e) => setOverwriteOn(e.target.checked)}>
                  <span className="text-[12px]">전체 Overwrite</span>
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
                  <span className="text-[12px]">백업</span>
                </Checkbox>
              </Tooltip>
            </div>

            <div>
              <div className="text-[12px] text-slate-600 mb-1">적용 사유 (선택)</div>
              <Input.TextArea
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                placeholder="적용 이력에 기록할 사유를 입력하세요"
                rows={2}
                maxLength={500}
                showCount
              />
            </div>
          </div>
        </div>
      </Drawer>

      <PropertyEditDrawer ref={propertyEditDrawerRef} onSuccess={invalidateAllSleeConfig} />
      <SleeUserconfigImportModal ref={importModalRef} />
      <SleeConfigHistoryModal ref={historyModalRef} />
      <SleeConfigReservationResultModal ref={reservationResultModalRef} />
      <SleeConfigApplyResultModal ref={applyResultModalRef} />
    </div>
  );
}
