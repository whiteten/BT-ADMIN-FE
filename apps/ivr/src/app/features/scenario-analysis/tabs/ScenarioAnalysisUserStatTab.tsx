/**
 * 사용자정의통계 관리 (AS-IS IPR20S6077) — 읽기 전용 카테고리/항목 목록.
 * TB_IR_USERSTATCATEGORY(좌측 카테고리 목록) + TB_IR_USERSTATITEM(우측 선택 카테고리의 항목 상세)를
 * 그대로 보여준다(시나리오 업로드 시점 SXML 분석 결과, CUD 없음). AS-IS와 동일하게 카테고리를 선택해야
 * 우측 항목 그리드가 채워지는 마스터-디테일 구조.
 * AS-IS JSP는 항목 그리드 세 번째 컬럼 헤더가 "아이템설명"인데 실제 바인딩 필드는 repeatSeq로 되어
 * 있는 표기 버그가 있다(itemDesc가 맞음) — 여기서는 실제 필드(itemDesc)로 바르게 바인딩한다.
 * 버전 선택은 이 탭 안에서 독립적으로 구성한다(다른 탭과 공유하지 않음).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef, GridApi, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Empty, Select } from 'antd';
import { useGetVersions } from '../../scenario/hooks/useScenarioQueries';
import { useGetScenarioAnalysisUserStatCategories, useGetScenarioAnalysisUserStatItems } from '../hooks/useScenarioAnalysisQueries';
import type { ScenarioAnalysisUserStatCategoryRow, ScenarioAnalysisUserStatItemRow } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  serviceId: number | null;
  scenarioName: string | null;
}

export default function ScenarioAnalysisUserStatTab({ serviceId, scenarioName }: Props) {
  const { gridOptions } = useAggridOptions();

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const categoryGridApiRef = useRef<GridApi<ScenarioAnalysisUserStatCategoryRow> | null>(null);

  const { data: versions = [] } = useGetVersions({
    params: { serviceId },
    queryOptions: { enabled: !!serviceId },
  });

  // 시나리오가 바뀌면 첫 버전 자동 선택
  useEffect(() => {
    if (versions.length > 0) {
      if (!selectedVersion || !versions.some((v) => v.serviceVer === selectedVersion)) {
        setSelectedVersion(versions[0].serviceVer);
      }
    } else {
      setSelectedVersion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions]);

  const versionOptions = versions.map((v) => {
    const base = `${v.serviceVer}${v.deployed ? '(+)' : ''}`;
    return { label: v.versionName ? `${base} (${v.versionName})` : base, value: v.serviceVer };
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useGetScenarioAnalysisUserStatCategories({
    params: serviceId && selectedVersion ? { serviceId, serviceVer: selectedVersion } : undefined,
    queryOptions: { enabled: !!serviceId && !!selectedVersion },
  });

  // 시나리오/버전이 바뀌면 첫 카테고리 자동 선택
  useEffect(() => {
    if (categories.length > 0) {
      if (!selectedCategoryId || !categories.some((c) => c.categoryId === selectedCategoryId)) {
        setSelectedCategoryId(categories[0].categoryId);
      }
    } else {
      setSelectedCategoryId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  // 자동 선택(첫 카테고리) 포함, selectedCategoryId가 바뀔 때마다 그리드 자체 선택 상태(ag-row-selected)를
  // 맞춰줘야 좌측 그리드에 "선택됨"이 시각적으로 보인다.
  useEffect(() => {
    if (!selectedCategoryId) return;
    categoryGridApiRef.current?.getRowNode(selectedCategoryId)?.setSelected(true, true);
  }, [selectedCategoryId, categories]);

  const { data: categoryItems = [], isLoading: isItemsLoading } = useGetScenarioAnalysisUserStatItems({
    params: serviceId && selectedVersion && selectedCategoryId ? { serviceId, serviceVer: selectedVersion, categoryId: selectedCategoryId } : undefined,
    queryOptions: { enabled: !!serviceId && !!selectedVersion && !!selectedCategoryId },
  });

  const categoryColumnDefs: ColDef<ScenarioAnalysisUserStatCategoryRow>[] = useMemo(
    () => [
      { headerName: '카테고리ID', field: 'categoryId', flex: 1, minWidth: 100 },
      { headerName: '카테고리명', field: 'categoryName', flex: 1.3, minWidth: 120 },
      { headerName: '카테고리설명', field: 'categoryDesc', flex: 1.5, minWidth: 140 },
    ],
    [],
  );

  const itemColumnDefs: ColDef<ScenarioAnalysisUserStatItemRow>[] = useMemo(
    () => [
      { headerName: '아이템명', field: 'itemName', flex: 1.2, minWidth: 140 },
      { headerName: '아이템SEQ', field: 'itemSeq', width: 100 },
      { headerName: '아이템설명', field: 'itemDesc', flex: 1.5, minWidth: 160 },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">사용자정의통계 관리{scenarioName && <span className="text-[#405189]"> — {scenarioName}</span>}</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedVersion} onChange={setSelectedVersion} options={versionOptions} style={{ width: 160 }} placeholder="버전" disabled={!serviceId} />
          <span className="text-[11px] text-gray-400 whitespace-nowrap">(DNIS 에서 시나리오 되고 있는 버전은 (+) 표시됩니다.)</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex gap-3">
        {!serviceId || !selectedVersion ? (
          <div className="flex items-center justify-center w-full h-full">
            <Empty description="시나리오와 버전을 선택하세요" />
          </div>
        ) : (
          <>
            <div className="flex-shrink-0" style={{ width: '40%' }}>
              {categories.length === 0 && !isCategoriesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="분석된 카테고리가 없습니다" />
                </div>
              ) : (
                <AgGridReact<ScenarioAnalysisUserStatCategoryRow>
                  rowData={categories}
                  columnDefs={categoryColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  loading={isCategoriesLoading}
                  getRowId={(p) => p.data.categoryId}
                  rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
                  onGridReady={(e) => {
                    categoryGridApiRef.current = e.api;
                  }}
                  onSelectionChanged={(e: SelectionChangedEvent<ScenarioAnalysisUserStatCategoryRow>) => {
                    const [row] = e.api.getSelectedRows();
                    if (row) setSelectedCategoryId(row.categoryId);
                  }}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {!selectedCategoryId ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="카테고리를 선택하세요" />
                </div>
              ) : categoryItems.length === 0 && !isItemsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Empty description="분석된 항목이 없습니다" />
                </div>
              ) : (
                <AgGridReact<ScenarioAnalysisUserStatItemRow>
                  rowData={categoryItems}
                  columnDefs={itemColumnDefs}
                  gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                  loading={isItemsLoading}
                  getRowId={(p) => `${p.data.categoryId}_${p.data.itemSeq}`}
                  defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true, resizable: true }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
