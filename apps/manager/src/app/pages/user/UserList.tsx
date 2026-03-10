import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { UserInfoCard } from './UserInfoCard';
import AccountStatusBadge from '../../features/user/components/AccountStatusBadge';
import { useDeleteUser, useGetUsers, useUnlockUser, userQueryKeys } from '../../features/user/hooks/useUserQueries';
import type { AccountStatus, User } from '../../features/user/types/user.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconTrash } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '사용자', path: '/manager/resource/user/list' },
  { title: '사용자 계정', path: '/manager/resource/user/list' },
];

export default function UserList() {
  const { gridOptions } = useAggridOptions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();

  const [filterColumn, setFilterColumn] = useState('username');
  const [searchValue, setSearchValue] = useState('');

  const { data: userList, isLoading } = useGetUsers();
  const { mutate: deleteUser } = useDeleteUser({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.getUsers().queryKey });
        toast.success('사용자가 삭제되었습니다.');
      },
    },
  });

  const { mutate: unlockUser } = useUnlockUser({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userQueryKeys.getUsers().queryKey });
        toast.success('로그인 잠금이 해제되었습니다.');
      },
    },
  });

  // 그리드 컬럼 정의 (베스트 프랙티스 순서: ID → 식별정보 → 권한 → 상태 → 소속 → 날짜 → 액션)
  const columnDefs: ColDef<User>[] = [
    { headerName: 'ID', field: 'id', maxWidth: 80 },
    { headerName: '사용자명', field: 'username', flex: 1 },
    { headerName: '계정', field: 'userAccount', flex: 1 },
    { headerName: '권한', field: 'roleName', flex: 1 },
    {
      headerName: '상태',
      field: 'accountStatus',
      maxWidth: 100,
      cellRenderer: (params: ICellRendererParams<User>) => {
        const status = params.value as AccountStatus;
        if (!status) return '-';
        return <AccountStatusBadge status={status} />;
      },
    },
    {
      headerName: '잠금',
      field: 'loginLocked',
      maxWidth: 100,
      cellRenderer: (params: ICellRendererParams<User>) => {
        const { data } = params;
        if (!data?.loginLocked) return '-';
        return (
          <button
            type="button"
            className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-0.5 hover:bg-orange-100"
            onClick={(e) => {
              e.stopPropagation();
              handleUnlock(data.id);
            }}
          >
            잠금해제
          </button>
        );
      },
    },
    { headerName: '테넌트', field: 'tenantName', flex: 1 },
    {
      headerName: '생성일',
      field: 'createdAt',
      maxWidth: 160,
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      headerName: '최근 로그인',
      field: 'lastLoginAt',
      maxWidth: 160,
      valueFormatter: (params) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      headerName: '최근 로그인 실패',
      field: 'lastFailedLoginAt',
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
      cellRenderer: (params: ICellRendererParams<User>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data.id);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!userList) return [];
    if (!searchValue.trim()) return userList;

    const keyword = searchValue.toLowerCase();
    return userList.filter((user) => {
      const value = user[filterColumn as keyof User];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [userList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleCreate = () => {
    navigate('../create');
  };

  const handleEdit = (userId: number | undefined) => {
    if (userId) {
      navigate(`../${userId}`);
    }
  };

  const handleUnlock = (userId: number) => {
    modal.confirm.execute({
      onOk: () => unlockUser({ params: { userId } }),
      options: {
        title: '로그인 잠금 해제',
        content: '해당 사용자의 로그인 잠금을 해제하시겠습니까?',
      },
    });
  };

  const handleDelete = (userId: number) => {
    modal.confirm.delete({
      onOk: () => deleteUser({ userId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Filter - Bot UI 스타일 */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '사용자명', value: 'username' },
              { label: '계정', value: 'userAccount' },
              { label: '권한', value: 'roleName' },
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

      {/* Body - Grid View (ag-Grid with sideBar for details) */}
      <div className="max-lg:hidden w-full h-full bg-white bt-shadow">
        <AgGridReact<User> rowData={filteredList} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoading} onRowDoubleClicked={(e) => handleEdit(e.data?.id)} />
      </div>

      {/* Body - Card View (Mobile) */}
      <div className="lg:hidden w-full h-full overflow-y-auto">
        {isLoading ? (
          <FallbackSpinner />
        ) : filteredList.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 p-2">
            {filteredList.map((user) => (
              <UserInfoCard key={user.id} userInfo={user} className="hover:scale-102 transition-all" onEdit={() => handleEdit(user.id)} onDelete={() => handleDelete(user.id)} />
            ))}
          </div>
        ) : (
          <NoData message="조회된 데이터가 없습니다." iconSize={50} />
        )}
      </div>
    </div>
  );
}
