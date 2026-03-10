import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import ClientStatusBadge from '../../features/client/components/ClientStatusBadge';
import { clientQueryKeys, useDeleteClient, useGetClients } from '../../features/client/hooks/useClientQueries';
import type { Client } from '../../features/client/types/client.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconTrash } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '시스템', path: '/manager/resource/menu' },
  { title: '플랫폼', path: '/manager/resource/client/list' },
  { title: '외부 앱 연동', path: '/manager/resource/client/list' },
];

export default function ClientList() {
  const { gridOptions } = useAggridOptions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [filterColumn, setFilterColumn] = useState('clientName');
  const [searchValue, setSearchValue] = useState('');
  const { data: clientList, isLoading } = useGetClients();
  const { mutate: deleteClient } = useDeleteClient({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: clientQueryKeys.getClients().queryKey });
        toast.success('클라이언트가 삭제되었습니다.');
      },
    },
  });

  // 그리드 컬럼 정의
  const columnDefs: ColDef<Client>[] = [
    { headerName: 'ID', field: 'clientId', maxWidth: 80 },
    { headerName: '클라이언트 키', field: 'clientKey', flex: 1 },
    { headerName: '클라이언트명', field: 'clientName', flex: 1 },
    {
      headerName: '상태',
      field: 'isActive',
      maxWidth: 100,
      cellRenderer: (params: ICellRendererParams<Client>) => {
        const isActive = params.value as boolean;
        if (isActive === undefined || isActive === null) return '-';
        return <ClientStatusBadge isActive={isActive} />;
      },
    },
    {
      headerName: 'Grant Types',
      field: 'grantTypes',
      flex: 1,
      valueFormatter: (params) => {
        const grantTypes = params.value as string[];
        if (!grantTypes || grantTypes.length === 0) return '-';
        return grantTypes.join(', ');
      },
    },
    {
      headerName: '권한 수',
      field: 'scopes',
      maxWidth: 100,
      valueGetter: (params) => {
        const scopes = params.data?.scopes;
        return scopes ? scopes.length : 0;
      },
    },
    {
      headerName: '생성일',
      field: 'createdAt',
      maxWidth: 160,
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<Client>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data.clientId);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!clientList) return [];
    if (!searchValue.trim()) return clientList;

    const keyword = searchValue.toLowerCase();
    return clientList.filter((client) => {
      const value = client[filterColumn as keyof typeof client];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [clientList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleCreate = () => {
    navigate('../create');
  };

  const handleEdit = (clientId: number | undefined) => {
    if (clientId) {
      navigate(`../${clientId}`);
    }
  };

  const handleDelete = (clientId: number) => {
    modal.confirm.delete({
      onOk: () => deleteClient({ clientId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Filter */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '클라이언트명', value: 'clientName' },
              { label: '클라이언트 키', value: 'clientKey' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div>
          <Button type="primary" onClick={handleCreate}>
            추가
          </Button>
        </div>
      </div>

      {/* Body - Grid View */}
      <div className="max-lg:hidden w-full h-full bg-white bt-shadow">
        <AgGridReact<Client>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          onRowDoubleClicked={(e) => handleEdit(e.data?.clientId)}
        />
      </div>

      {/* Body - Mobile View */}
      <div className="lg:hidden w-full h-full overflow-y-auto">
        {isLoading ? (
          <FallbackSpinner />
        ) : filteredList.length > 0 ? (
          <div className="flex flex-col gap-2 p-2">
            {filteredList.map((client) => (
              <div key={client.clientId} className="bg-white p-4 rounded-md shadow hover:shadow-md transition-all cursor-pointer" onClick={() => handleEdit(client.clientId)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{client.clientName}</h3>
                    <p className="text-sm text-gray-500">{client.clientKey}</p>
                  </div>
                  <ClientStatusBadge isActive={client.isActive} />
                </div>
                <div className="text-sm text-gray-600">권한: {client.scopes?.length || 0}개</div>
              </div>
            ))}
          </div>
        ) : (
          <NoData message="조회된 데이터가 없습니다." iconSize={50} />
        )}
      </div>
    </div>
  );
}
