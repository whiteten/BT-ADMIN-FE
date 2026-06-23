import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Input, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { ReactComponent as IconLinkIfe } from '../../../../assets/images/icon/icon-link-ife.svg';
import { ReactComponent as IconLinkNlu } from '../../../../assets/images/icon/icon-link-nlu.svg';
import { botQueryKeys, useDeleteBot, useGetBots, useGetIfeInfo } from '../../../features/bot-config/hooks/useBotQueries';
import type { BotListItem, IfeInfo } from '../../../features/bot-config/types';
import { IconTag, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/fca/bot-config' },
  { title: '봇', path: '/fca/bot-config/bot' },
  { title: '봇 목록', path: '/fca/bot-config/bot/list' },
];

export default function BotListGrid() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { gridOptions } = useAggridOptions();
  const gridRef = useRef<AgGridReact<BotListItem>>(null);
  const [filterColumn, setFilterColumn] = useState('serviceName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: botList, isFetching } = useGetBots();
  const { mutate: deleteBot } = useDeleteBot({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBots().queryKey });
      },
    },
  });

  const { mutate: getIfeInfo } = useGetIfeInfo({
    mutationOptions: {
      onSuccess: (data) => {
        const ifeInfo = data as IfeInfo;
        if (!ifeInfo.redirectUrl) {
          toast.warning('편집기 접속 정보가 없습니다.');
          return;
        }
        window.open(ifeInfo.redirectUrl, '_blank');
      },
    },
  });

  const filteredList = useMemo(() => {
    if (!botList) return [];
    if (!searchValue.trim()) return botList;
    const keyword = searchValue.toLowerCase();
    return botList.filter((bot) => {
      const value = bot[filterColumn as keyof typeof bot];
      if (value == null) return false;
      if (Array.isArray(value)) {
        return value.some((v) => String(v).toLowerCase().includes(keyword));
      }
      return String(value).toLowerCase().includes(keyword);
    });
  }, [botList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  const handleDetail = (serviceId: string) => {
    navigate(`../${serviceId}`);
  };

  const handleDelete = (serviceId: string) => {
    modal.confirm.delete({
      onOk: () => deleteBot({ serviceId }),
    });
  };

  const handleDetailModel = (modelId: string) => {
    navigate(`../../model/${modelId}`);
  };

  const handleEditVersion = (serviceId: string, serviceVer: string) => {
    modal.confirm.execute({
      options: {
        title: '대화편집 확인',
        content: `선택한 버전(${serviceVer})을 편집하시겠습니까?`,
      },
      onOk: () => getIfeInfo({ params: { serviceId, serviceVer }, data: {} }),
    });
  };

  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<BotListItem>) => {
    if (!e.data) return;
    handleDetail(e.data.serviceId);
  };

  const columnDefs: ColDef<BotListItem>[] = [
    {
      headerName: '봇 이름',
      field: 'serviceName',
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<BotListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => handleDetail(data.serviceId)}>
            {data.serviceName}
          </span>
        );
      },
    },
    {
      headerName: '버전',
      field: 'serviceVer',
      cellRenderer: (params: ICellRendererParams<BotListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <span className="flex items-center gap-2">
            {data.serviceVer ?? '-'}
            {data.serviceVer && <IconLinkIfe className="hover:cursor-pointer" onClick={() => handleEditVersion(data.serviceId, data.serviceVer as string)} />}
          </span>
        );
      },
    },
    {
      headerName: 'NLU 모델',
      field: 'modelName',
      cellRenderer: (params: ICellRendererParams<BotListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <span className="flex items-center gap-2">
            {data.modelName ?? '-'}
            {data.modelId && <IconLinkNlu className="hover:cursor-pointer" onClick={() => handleDetailModel(data.modelId as string)} />}
          </span>
        );
      },
    },
    { headerName: '등록 대화수', field: 'conversationCount', maxWidth: 130 },
    {
      headerName: '서비스 개시일',
      field: 'updateTime',
      maxWidth: 200,
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '태그',
      field: 'tags',
      flex: 1.5,
      sortable: false,
      cellRenderer: (params: ICellRendererParams<BotListItem>) => {
        const tags = params.data?.tags;
        if (!tags || tags.length === 0) return '-';
        return (
          <span className="flex items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag} variant="filled" icon={<IconTag className="mr-0.5" />} className="!inline-flex items-center !px-2 !py-0.5 !m-0">
                <span className="max-w-[80px] truncate">{tag}</span>
              </Tag>
            ))}
          </span>
        );
      },
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<BotListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data.serviceId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
          <div className="flex items-center w-full gap-3">
            <Select
              value={filterColumn}
              onChange={handleColumnChange}
              options={[
                { label: '봇 이름', value: 'serviceName' },
                { label: '버전', value: 'serviceVer' },
                { label: 'NLU 모델', value: 'modelName' },
                { label: '태그', value: 'tags' },
              ]}
              className="!max-w-[150px] !min-w-[120px]"
              popupMatchSelectWidth={false}
            />
            <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
          </div>
          <Button type="primary" onClick={handleClickCreateBtn}>
            추가
          </Button>
        </header>
        <div className="w-full h-full">
          <AgGridReact<BotListItem>
            ref={gridRef}
            rowData={filteredList}
            loading={isFetching}
            columnDefs={columnDefs}
            onRowDoubleClicked={handleRowDoubleClicked}
            gridOptions={gridOptions}
          />
        </div>
      </div>
    </div>
  );
}
