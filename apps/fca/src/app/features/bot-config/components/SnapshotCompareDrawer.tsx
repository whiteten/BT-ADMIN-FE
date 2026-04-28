import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef, GetDataPath, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Divider, Drawer, Input, Select, Tag } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCompareSnapshots, useGetSnapshots } from '../hooks/useModelQueries';
import type { FlatDiffItem, SnapshotDiffItem, SnapshotListItem } from '../types/snapshot';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * SnapshotCompareDrawer ref 타입
 */
export interface SnapshotCompareDrawerRef {
  open: (params: { modelId: string; data: SnapshotListItem }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  data: SnapshotListItem | null;
}

/**
 * 변경 상태별 색상 매핑
 */
const changeStatusConfig: Record<string, { color: string; text: string }> = {
  추가: { color: 'green', text: '추가' },
  삭제: { color: 'red', text: '삭제' },
  수정: { color: 'orange', text: '수정' },
  변경없음: { color: 'default', text: '변경없음' },
};

/**
 * 변경상태 셀 렌더러
 */
const ChangeStatusCellRenderer = (params: ICellRendererParams<FlatDiffItem>) => {
  const status = params.value as string;
  const config = changeStatusConfig[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
};

/**
 * 계층 데이터를 플랫 데이터로 변환
 */
const flattenDiffItems = (items: SnapshotDiffItem[], parentPath: string[] = []): FlatDiffItem[] => {
  const result: FlatDiffItem[] = [];

  items.forEach((item) => {
    // path에 label(Intent 이름/Sentence 텍스트)을 사용하여 트리에 표시
    const currentPath = [...parentPath, item.label];
    result.push({ ...item, path: currentPath });

    if (item.children && item.children.length > 0) {
      result.push(...flattenDiffItems(item.children, currentPath));
    }
  });

  return result;
};

/**
 * Diff 데이터에서 통계 계산
 */
const getDiffStats = (items: SnapshotDiffItem[] | undefined) => {
  if (!items) return { parent: { total: 0, added: 0, deleted: 0, modified: 0, unchanged: 0 }, child: { total: 0, added: 0, deleted: 0, modified: 0, unchanged: 0 } };

  const flatItems = flattenDiffItems(items);
  const parentTypes = ['INTENT', 'ENTITY'];

  const countByStatus = (arr: FlatDiffItem[]) => ({
    total: arr.length,
    added: arr.filter((i) => i.changeStatus === '추가').length,
    deleted: arr.filter((i) => i.changeStatus === '삭제').length,
    modified: arr.filter((i) => i.changeStatus === '수정').length,
    unchanged: arr.filter((i) => i.changeStatus === '변경없음').length,
  });

  const parentItems = flatItems.filter((i) => parentTypes.includes(i.type || ''));
  const childItems = flatItems.filter((i) => !parentTypes.includes(i.type || ''));

  return {
    parent: countByStatus(parentItems),
    child: countByStatus(childItems),
  };
};

/**
 * Keyword Diff 통계 계산
 */
const getKeywordDiffStats = (items: SnapshotDiffItem[] | undefined) => {
  const empty = { total: 0, added: 0, deleted: 0, modified: 0, unchanged: 0 };
  if (!items) return empty;
  return {
    total: items.length,
    added: items.filter((i) => i.changeStatus === '추가').length,
    deleted: items.filter((i) => i.changeStatus === '삭제').length,
    modified: items.filter((i) => i.changeStatus === '수정').length,
    unchanged: items.filter((i) => i.changeStatus === '변경없음').length,
  };
};

/**
 * Entity Diff 데이터에서 통계 계산 (개체/대표값/유사어)
 */
const getEntityDiffStats = (items: SnapshotDiffItem[] | undefined) => {
  const empty = { total: 0, added: 0, deleted: 0, modified: 0, unchanged: 0 };
  if (!items) return { entity: empty, value: empty, synonym: empty };

  const flatItems = flattenDiffItems(items);

  const countByStatus = (arr: FlatDiffItem[]) => ({
    total: arr.length,
    added: arr.filter((i) => i.changeStatus === '추가').length,
    deleted: arr.filter((i) => i.changeStatus === '삭제').length,
    modified: arr.filter((i) => i.changeStatus === '수정').length,
    unchanged: arr.filter((i) => i.changeStatus === '변경없음').length,
  });

  return {
    entity: countByStatus(flatItems.filter((i) => i.type === 'ENTITY')),
    value: countByStatus(flatItems.filter((i) => i.type === 'ENTITY_VALUE')),
    synonym: countByStatus(flatItems.filter((i) => i.type === 'ENTITY_TYPEVALUES')),
  };
};

/**
 * 스냅샷 비교 Drawer
 */
const SnapshotCompareDrawer = forwardRef<SnapshotCompareDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    data: null,
  });
  const [targetSnapshotId, setTargetSnapshotId] = useState<string>('');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['intent', 'entity', 'keyword']));

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const { gridOptions } = useAggridOptions();

  const { open, data, modelId } = drawerState;

  const { data: snapshotList } = useGetSnapshots({
    params: { modelId },
    queryOptions: { enabled: !!modelId && open },
  });

  // 스냅샷 비교 API 호출
  const { data: compareResult, isLoading: isCompareLoading } = useCompareSnapshots({
    params: {
      modelId,
      snapshotVersion: data?.modelVersion ?? '',
      compareVersion: targetSnapshotId || 'DRAFT',
    },
    queryOptions: {
      enabled: !!modelId && !!data?.modelVersion && !!targetSnapshotId && open,
    },
  });

  // Intent Diff를 플랫 데이터로 변환
  const intentFlatData = useMemo(() => {
    if (!compareResult?.intentDiffs) return [];
    return flattenDiffItems(compareResult.intentDiffs);
  }, [compareResult?.intentDiffs]);

  // Intent 통계
  const intentStats = useMemo(() => getDiffStats(compareResult?.intentDiffs), [compareResult?.intentDiffs]);
  // Entity 통계 (개체/대표값/유사어)
  const entityStats = useMemo(() => getEntityDiffStats(compareResult?.entityDiffs), [compareResult?.entityDiffs]);
  // Keyword 데이터 및 통계
  const keywordFlatData = useMemo(() => flattenDiffItems(compareResult?.keywordDiffs ?? []), [compareResult?.keywordDiffs]);
  const keywordStats = useMemo(() => getKeywordDiffStats(compareResult?.keywordDiffs), [compareResult?.keywordDiffs]);

  // Tree Data 경로 함수
  const getDataPath: GetDataPath<FlatDiffItem> = (data) => data.path;

  // 컬럼 정의
  const columnDefs: ColDef<FlatDiffItem>[] = useMemo(
    () => [
      {
        headerName: '변경상태',
        field: 'changeStatus',
        maxWidth: 90,
        suppressSizeToFit: true,
        cellRenderer: ChangeStatusCellRenderer,
      },
      {
        headerName: '이전값',
        field: 'beforeValue',
        flex: 1,
        minWidth: 150,
        valueFormatter: (params) => params.value ?? '-',
      },
      {
        headerName: '이후값',
        field: 'afterValue',
        flex: 1,
        minWidth: 150,
        valueFormatter: (params) => params.value ?? '-',
      },
    ],
    [],
  );

  // Tree Data용 그리드 옵션
  const treeGridOptions = useMemo(
    () => ({
      ...gridOptions,
      treeData: true,
      getDataPath,
      groupDefaultExpanded: 0,
      pagination: false,
      sideBar: false,
      statusBar: undefined,
      noRowsOverlayComponentParams: {
        message: '비교 결과가 없습니다.',
      },
      autoGroupColumnDef: {
        headerName: '항목',
        minWidth: 150,
        flex: 1.5,
        cellRendererParams: {
          suppressCount: true,
          innerRenderer: (params: ICellRendererParams<FlatDiffItem>) => {
            const type = params.data?.type;
            const label = params.value;

            // 타입별 설정
            const typeConfig: Record<string, { color: string; text: string }> = {
              INTENT: { color: 'blue', text: '의도' },
              SENTENCE: { color: 'purple', text: '문장' },
              ENTITY: { color: 'cyan', text: '개체' },
              ENTITY_VALUE: { color: 'geekblue', text: '대표값' },
              ENTITY_TYPEVALUES: { color: 'volcano', text: '유사어' },
              VALUE: { color: 'geekblue', text: '값' },
              KEYWORD: { color: 'gold', text: '키워드' },
            };

            const config = typeConfig[type ?? ''] || { color: 'default', text: type };
            const isParent = type === 'INTENT' || type === 'ENTITY';

            return (
              <span className="flex items-center gap-2">
                <Tag color={config.color}>{config.text}</Tag>
                <span className={isParent ? 'font-medium' : 'text-gray-600'}>{label}</span>
              </span>
            );
          },
        },
      },
    }),
    [gridOptions],
  );

  useImperativeHandle(ref, () => ({
    open: ({ modelId, data }) => {
      setDrawerState({ open: true, modelId, data });
      setTargetSnapshotId('DRAFT');
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        닫기
      </Button>
    </div>
  );

  const compareOptions = [
    { label: 'DRAFT', value: 'DRAFT' },
    ...(snapshotList
      ?.filter((snapshot) => snapshot.modelVersion !== data?.modelVersion)
      .map((snapshot) => ({
        label: snapshot.modelVersionName,
        value: snapshot.modelVersion,
      })) ?? []),
  ];

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="스냅샷 비교"
      closable={{ placement: 'end' }}
      size={1200}
      footer={footer}
      destroyOnHidden
      classNames={{
        body: '!p-0 !rounded-none',
        footer: '!py-2',
      }}
    >
      <div className="flex flex-col w-full h-full p-6 gap-4">
        {/* 스냅샷 선택 영역 */}
        <div className="flex w-full gap-4">
          <div className="flex flex-col flex-1 gap-2">
            <span className="text-sm font-medium text-gray-700">기준 스냅샷</span>
            <Input value={data?.modelVersionName} readOnly />
          </div>
          <div className="flex flex-col flex-1 gap-2">
            <span className="text-sm font-medium text-gray-700">비교 스냅샷</span>
            <Select className="w-full" placeholder="비교할 스냅샷을 선택하세요." value={targetSnapshotId || 'DRAFT'} onChange={setTargetSnapshotId} options={compareOptions} />
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Intent Diff */}
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('intent')}
            className="flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {openSections.has('intent') ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
              의도 변경사항
            </span>
            <div className="flex items-center text-xs">
              <span className="flex items-center gap-1">
                <span className="text-gray-900">의도:</span>
                <span className="text-green-600">추가 {intentStats.parent.added}</span>
                <span className="text-orange-500">수정 {intentStats.parent.modified}</span>
                <span className="text-red-600">삭제 {intentStats.parent.deleted}</span>
                <span className="text-gray-400">변경없음 {intentStats.parent.unchanged}</span>
              </span>
              <Divider orientation="vertical" className="!h-4" />
              <span className="flex items-center gap-1">
                <span className="text-gray-900">문장:</span>
                <span className="text-green-600">추가 {intentStats.child.added}</span>
                <span className="text-orange-500">수정 {intentStats.child.modified}</span>
                <span className="text-red-600">삭제 {intentStats.child.deleted}</span>
                <span className="text-gray-400">변경없음 {intentStats.child.unchanged}</span>
              </span>
            </div>
          </button>
          {openSections.has('intent') && (
            <div className="h-[280px]">
              <AgGridReact<FlatDiffItem> rowData={intentFlatData} columnDefs={columnDefs} gridOptions={treeGridOptions} loading={isCompareLoading} />
            </div>
          )}
        </div>

        {/* Entity Diff */}
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('entity')}
            className="flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {openSections.has('entity') ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
              개체 변경사항
            </span>
            <div className="flex items-center text-xs">
              <span className="flex items-center gap-1">
                <span className="text-gray-900">개체:</span>
                <span className="text-green-600">추가 {entityStats.entity.added}</span>
                <span className="text-orange-500">수정 {entityStats.entity.modified}</span>
                <span className="text-red-600">삭제 {entityStats.entity.deleted}</span>
                <span className="text-gray-400">변경없음 {entityStats.entity.unchanged}</span>
              </span>
              <Divider orientation="vertical" className="!h-4" />
              <span className="flex items-center gap-1">
                <span className="text-gray-900">대표값:</span>
                <span className="text-green-600">추가 {entityStats.value.added}</span>
                <span className="text-orange-500">수정 {entityStats.value.modified}</span>
                <span className="text-red-600">삭제 {entityStats.value.deleted}</span>
                <span className="text-gray-400">변경없음 {entityStats.value.unchanged}</span>
              </span>
              <Divider orientation="vertical" className="!h-4" />
              <span className="flex items-center gap-1">
                <span className="text-gray-900">유사어:</span>
                <span className="text-green-600">추가 {entityStats.synonym.added}</span>
                <span className="text-orange-500">수정 {entityStats.synonym.modified}</span>
                <span className="text-red-600">삭제 {entityStats.synonym.deleted}</span>
                <span className="text-gray-400">변경없음 {entityStats.synonym.unchanged}</span>
              </span>
            </div>
          </button>
          {openSections.has('entity') && (
            <div className="h-[280px]">
              <AgGridReact<FlatDiffItem>
                rowData={flattenDiffItems(compareResult?.entityDiffs ?? [])}
                columnDefs={columnDefs}
                gridOptions={treeGridOptions}
                loading={isCompareLoading}
              />
            </div>
          )}
        </div>

        {/* Keyword Diff */}
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('keyword')}
            className="flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {openSections.has('keyword') ? <ChevronDown className="size-4 text-gray-400" /> : <ChevronRight className="size-4 text-gray-400" />}
              키워드 변경사항
            </span>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-600">추가 {keywordStats.added}</span>
              <span className="text-orange-500">수정 {keywordStats.modified}</span>
              <span className="text-red-600">삭제 {keywordStats.deleted}</span>
              <span className="text-gray-400">변경없음 {keywordStats.unchanged}</span>
            </div>
          </button>
          {openSections.has('keyword') && (
            <div className="h-[280px]">
              <AgGridReact<FlatDiffItem> rowData={keywordFlatData} columnDefs={columnDefs} gridOptions={treeGridOptions} loading={isCompareLoading} />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
});

export default SnapshotCompareDrawer;
