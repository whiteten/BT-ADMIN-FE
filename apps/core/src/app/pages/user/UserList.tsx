import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { UserInfoCard } from './UserInfoCard';
import TreeSelectTenant from '../../components/TreeSelectTenant';
import { useSearchUsers } from '../../features/user/hooks/useUserQueries';
import type { User, UserSearchParams } from '../../features/user/types/user.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<User>[] = [
  { headerName: '테넌트명', field: 'tenantName' },
  { headerName: '사용자ID/사번', field: 'userSabun' },
  { headerName: '사용자명', field: 'userName' },
  { headerName: '직책', field: 'position' },
  { headerName: '소속노드', field: 'nodeName' },
  { headerName: '권한그룹', field: 'grantName' },
  { headerName: '전화번호', field: 'userTelNo' },
  { headerName: '현재상태', field: 'userStatusName' },
  { headerName: '계정상태', field: 'loginLock', cellRenderer: (params: { value: string }) => (params.value === 'Y' ? '잠김' : '정상') },
  { headerName: '중복로그인', field: 'multiLogin', cellRenderer: (params: { value: string }) => (params.value === 'Y' ? '허용' : '금지') },
  { headerName: '아웃소싱업체', field: 'oscomName' },
  { headerName: '계정등록일', field: 'createdAt' },
  { headerName: '생성유저', field: 'createdByName' },
];

export default function UserList() {
  const { gridOptions } = useAggridOptions();
  const navigate = useNavigate();

  // 검색 조건 상태
  const [searchParams, setSearchParams] = useState<UserSearchParams>({
    page: 0,
    size: 20,
  });
  const [tenantId, setTenantId] = useState<number>();
  const [searchType, setSearchType] = useState<string>('userName');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // API 호출
  const { data, isLoading, refetch } = useSearchUsers({
    params: searchParams as unknown as Record<string, unknown>,
    queryOptions: {
      enabled: false, // 수동으로 검색
    },
  });

  const rowData = data?.items ?? [];

  const handleCreate = () => {
    navigate('../user/create');
  };

  const handleEdit = (userId: number | undefined) => {
    if (userId) {
      navigate(`../user/${userId}`);
    }
  };

  const handleSearch = () => {
    const params: UserSearchParams = {
      tenantId,
      page: 0,
      size: 20,
    };

    // 검색 타입에 따라 파라미터 설정
    if (searchKeyword) {
      if (searchType === 'userName') {
        params.userName = searchKeyword;
      } else if (searchType === 'userSabun') {
        params.userSabun = searchKeyword;
      }
    }

    setSearchParams(params);

    // 검색 실행
    refetch()
      .then(() => {
        toast.success('검색이 완료되었습니다');
      })
      .catch(() => {
        toast.error('검색에 실패했습니다');
      });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Header */}
      <header className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between">
        {/* Header left area */}
        <div className="flex gap-2 w-full">
          <Space.Compact className="w-full">
            <TreeSelectTenant value={tenantId?.toString()} onChange={(value) => setTenantId(value ? Number(value) : undefined)} className="!max-w-[150px]" />
            <Select
              value={searchType}
              onChange={setSearchType}
              options={[
                { label: '사용자명', value: 'userName' },
                { label: '사용자 ID', value: 'userSabun' },
              ]}
              className="!max-w-[150px]"
            />
            <Input
              className="!w-full lg:!w-[300px]"
              placeholder="검색어를 입력하세요."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button type="primary" variant="solid" color="primary" onClick={handleSearch} icon={<Search className="size-4" />}>
              검색
            </Button>
          </Space.Compact>
        </div>
        {/* Header right area */}
        <div className="flex gap-2 justify-end">
          <Button variant="solid" color="green" onClick={handleCreate}>
            추가
          </Button>
        </div>
      </header>
      {/* Body - Grid View */}
      <div className="max-lg:hidden w-full h-full">
        <AgGridReact<User> rowData={rowData} columnDefs={columnDefs} gridOptions={gridOptions} loading={isLoading} onRowDoubleClicked={(e) => handleEdit(e.data?.userId)} />
      </div>

      {/* Body - Card View */}
      <div className="lg:hidden w-full h-full overflow-y-auto">
        {isLoading ? (
          <FallbackSpinner />
        ) : rowData.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 p-2">
            {rowData.map((user, index) => (
              <UserInfoCard key={user.userId ?? index} userInfo={user} className="hover:scale-102 transition-all" onEdit={() => handleEdit(user.userId)} />
            ))}
          </div>
        ) : (
          <NoData />
        )}
      </div>
    </div>
  );
}
