/**
 * 시나리오 환경변수 관리 페이지
 * Pattern: 상단 테넌트 탭 바 + 카드 슬라이더 (ConfigFile) + 하단 카테고리 ag-Grid
 *          카테고리 선택 → "속성관리" 클릭 → 680px Drawer로 속성 목록
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Drawer, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetSleeConfigCategories, useGetSleeConfigFiles, useGetSleeConfigProperties, useGetSleeConfigTenants } from '../../features/slee-config/hooks/useSleeConfigQueries';
import { type SleeConfigCategory, type SleeConfigFile, type SleeConfigProperty } from '../../features/slee-config/types/sleeConfig.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시나리오 관리' }, { title: '시나리오 환경변수', path: '/ivr/ivr/slee-config' }];

export default function SleeConfigList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedConfigFile, setSelectedConfigFile] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [propertyDrawerOpen, setPropertyDrawerOpen] = useState(false);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Data (API hooks) ────────────────────────────────────────────────────
  const { data: rawTenants = [] } = useGetSleeConfigTenants();
  const tenants = useMemo(() => [...rawTenants].sort((a, b) => a.tenantId - b.tenantId), [rawTenants]);

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
    queryOptions: { enabled: !!selectedTenantId && !!selectedConfigFile && !!selectedCategory && propertyDrawerOpen },
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

  const filteredCategories = allCategories;

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

  const handleOpenPropertyDrawer = useCallback(() => {
    if (selectedCategory) setPropertyDrawerOpen(true);
  }, [selectedCategory]);

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
      { headerName: '속성', field: 'property', flex: 2, minWidth: 150 },
      { headerName: '값', field: 'value', flex: 3, minWidth: 200 },
      { headerName: '설명', field: 'ptyDesc', flex: 2, minWidth: 150 },
    ],
    [],
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
                          <div>카테고리: {file.categoryCount}개</div>
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

        {/* ===== 하단: 카테고리 ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              {selectedFileObj ? `${selectedFileObj.configFile} 카테고리` : '카테고리'} ({filteredCategories.length})
            </span>
            <div className="flex gap-2 items-center">
              <Button disabled={!selectedCategory} onClick={handleOpenPropertyDrawer}>
                속성관리
              </Button>
              <Button type="primary" disabled={!selectedConfigFile}>
                + 카테고리 추가
              </Button>
              <span className="w-px h-5 bg-gray-200 mx-1" />
              <Button disabled={!selectedConfigFile}>배포설정</Button>
              <Button type="primary" disabled={!selectedConfigFile}>
                배포
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {selectedConfigFile ? (
              <AgGridReact<SleeConfigCategory>
                rowData={filteredCategories}
                columnDefs={categoryColumnDefs}
                gridOptions={{
                  ...gridOptions,
                  statusBar: undefined,
                  pagination: false,
                  sideBar: false,
                }}
                getRowId={(params) => params.data.category}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                rowSelection="single"
                onSelectionChanged={(e) => {
                  const selected = e.api.getSelectedRows();
                  setSelectedCategory(selected.length > 0 ? selected[0].category : null);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
                <Empty description={false} />
                <span className="text-sm">상단에서 환경파일을 선택하세요</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== 속성관리 Drawer (680px) ===== */}
      <Drawer
        title={`속성관리 — ${selectedCategory ?? ''}`}
        placement="right"
        width={680}
        open={propertyDrawerOpen}
        onClose={() => setPropertyDrawerOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
            <span className="text-sm text-gray-500">{properties.length}개 속성</span>
            <Button type="primary" size="small">
              + 속성 추가
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <AgGridReact<SleeConfigProperty>
              rowData={properties}
              columnDefs={propertyColumnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              getRowId={(params) => `${params.data.category}-${params.data.property}`}
              defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
