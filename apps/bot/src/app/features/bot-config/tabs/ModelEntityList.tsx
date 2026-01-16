import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import EntityDrawer, { type EntityDrawerRef } from '../components/EntityDrawer';
import TrainDiffStatusBadge from '../components/TrainDiffStatusBadge';
import TrainStatusBadge from '../components/TrainStatusBadge';
import { modelQueryKeys, useDeleteEntity, useGetEntities } from '../hooks/useModelQueries';
import type { EntityListItem, TrainDiffStatus, TrainStatus } from '../types';
import { IconTag, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface EntityValuesCellRendererParams {
  value: string[];
}

const EntityValuesCellRenderer = ({ value }: EntityValuesCellRendererParams) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const values = value ?? [];

  const TAG_GAP = 4; // gap-1 = 0.25rem = 4px
  const MORE_TAG_WIDTH = 40; // "+N" 태그 예상 너비

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureContainer = measureRef.current;
    if (!container || !measureContainer) return;

    const tagElements = measureContainer.children;
    if (tagElements.length === 0) return;

    const calculateVisibleCount = () => {
      const containerWidth = container.offsetWidth;
      let totalWidth = 0;
      let count = 0;

      for (let i = 0; i < tagElements.length; i++) {
        const tagWidth = (tagElements[i] as HTMLElement).offsetWidth;
        const widthWithGap = i === 0 ? tagWidth : tagWidth + TAG_GAP;
        const remainingTags = tagElements.length - (i + 1);
        const needsMoreTag = remainingTags > 0;
        const reservedWidth = needsMoreTag ? MORE_TAG_WIDTH + TAG_GAP : 0;

        if (totalWidth + widthWithGap + reservedWidth <= containerWidth) {
          totalWidth += widthWithGap;
          count++;
        } else {
          break;
        }
      }

      setVisibleCount(count > 0 ? count : 1);
    };

    const resizeObserver = new ResizeObserver(calculateVisibleCount);
    resizeObserver.observe(container);
    calculateVisibleCount();

    return () => resizeObserver.disconnect();
  }, [value]);

  if (!values.length) return null;

  const hiddenCount = visibleCount !== null ? values.length - visibleCount : 0;

  return (
    <>
      {/* 측정용 숨겨진 컨테이너 */}
      <div ref={measureRef} className="absolute invisible flex gap-1" aria-hidden="true">
        {values.map((v, index) => (
          <Tag key={index} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white">
            {v}
          </Tag>
        ))}
      </div>
      {/* 실제 표시 컨테이너 */}
      <div ref={containerRef} className="flex items-center gap-1 w-full overflow-hidden">
        {values.slice(0, visibleCount ?? values.length).map((v, index) => (
          <Tag key={index} color="default" variant="outlined" icon={<IconTag />} className="!inline-flex items-center !px-2 !py-1 !m-0 !bg-white shrink-0">
            {v}
          </Tag>
        ))}
        {hiddenCount > 0 && (
          <Tag color="default" className="!inline-flex items-center !px-2 !py-1 !m-0 shrink-0 !rounded-[14px] !text-[#888B9A]">
            +{hiddenCount}
          </Tag>
        )}
      </div>
    </>
  );
};

export default function ModelEntityList() {
  const { modelId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<EntityListItem[]>([]);
  const [filterColumn, setFilterColumn] = useState('entityName');
  const [searchValue, setSearchValue] = useState('');
  const drawerRef = useRef<EntityDrawerRef>(null);

  const { data: entityList, isFetching } = useGetEntities({ params: { modelId } });

  const { mutate: deleteEntity } = useDeleteEntity({
    mutationOptions: {
      onSuccess: () => {
        toast.success('완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntities({ modelId }).queryKey });
      },
    },
  });

  const handleDeleteEntity = (entityId: string) => {
    modal.confirm.delete({
      onOk: () => deleteEntity({ modelId, entityId }),
    });
  };

  const columnDefs: ColDef<EntityListItem>[] = [
    { headerName: 'ID', field: 'entityId', hide: true },
    { headerName: '개체이름', field: 'entityName' },
    { headerName: 'Value수', field: 'valueCount', maxWidth: 120 },
    {
      headerName: '대표값',
      field: 'entityValues',
      flex: 3,
      sortable: false,
      valueFormatter: (params: { value: string[] }) => params.value?.join(', ') ?? '',
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: EntityValuesCellRenderer,
    },
    {
      headerName: '학습상태',
      field: 'trainStatus',
      maxWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (params: { value: number; data: EntityListItem }) => <TrainStatusBadge status={params.value as TrainStatus} showAlert={params.data?.changedYn} />,
    },
    {
      headerName: '변경이력',
      headerTooltip: '모델 학습이 완료된 이후,\n변경사항이 있을 경우 표시됩니다.\n다음 모델 학습 완료시,\n이력은 초기화됩니다.',
      field: 'trainDiffStatus',
      maxWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: { value: TrainDiffStatus }) => <TrainDiffStatusBadge status={params.value as TrainDiffStatus} />,
    },
    {
      headerName: '작업일시',
      field: 'workTime',
      maxWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EntityListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEntity(data.entityId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!entityList) return [];
    if (!searchValue.trim()) return entityList;
    const keyword = searchValue.toLowerCase();
    return entityList.filter((entity) => {
      const value = entity[filterColumn as keyof typeof entity];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [entityList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickAddEntity = () => {
    drawerRef.current?.open({ modelId });
  };

  const handleRowDoubleClick = (event: RowDoubleClickedEvent<EntityListItem>) => {
    if (!event.data) return;
    const { entityId } = event.data;
    navigate(`/bot/bot-config/model/${modelId}/entity/${entityId}`);
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="entityName"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '개체이름', value: 'entityName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid">Import</Button>
          <Button variant="solid">Export</Button>
          <Button variant="solid" color="primary" onClick={handleClickAddEntity}>
            추가
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EntityListItem> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isFetching} onRowDoubleClicked={handleRowDoubleClick} />
      </div>
      <EntityDrawer ref={drawerRef} />
    </div>
  );
}
