import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Space } from 'antd';
import { Search } from 'lucide-react';
import { UserInfoCard } from './UserInfoCard';
import TreeSelectTenant from '../../components/TreeSelectTenant';
import type { User } from '../../features/user/types/user.types';
import { rowData as dummyRowData } from '../../features/user/user-dummy';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';
import NoData from '@/libs/shared-ui/src/components/custom/NoData';
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
  { headerName: '계정상태', field: 'loginLock' },
  { headerName: '중복로그인', field: 'multiLogin' },
  { headerName: '아웃소싱업체', field: 'oscomName' },
  { headerName: '계정등록일', field: 'createTime' },
  { headerName: '생성유저', field: 'createUserSabun' },
];

export default function UserList() {
  const { gridOptions } = useAggridOptions();
  const [tenantId, setTenantId] = useState<string>();
  const [rowData, setRowData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleCreate = () => {
    navigate('../user/create');
  };
  const handleEdit = (userId: number | undefined) => {
    navigate(`../user/${userId}`);
  };
  const handleSearch = () => {
    setRowData([]);
    setLoading(true);
    setTimeout(() => {
      setRowData(dummyRowData);
      setLoading(false);
    }, 1000);
  };
  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Header */}
      <header className="w-full flex flex-col gap-2 lg:flex-row lg:justify-between">
        {/* Header left area */}
        <div className="flex gap-2 w-full">
          <Space.Compact className="w-full">
            <TreeSelectTenant value={tenantId} onChange={setTenantId} className="!max-w-[150px]" />
            <Select
              defaultValue="userName"
              options={[
                { label: '사용자명', value: 'userName' },
                { label: '사용자 ID', value: 'userSabun' },
                { label: '직책', value: 'position' },
                { label: '권한그룹', value: 'grantName' },
              ]}
              className="!max-w-[150px]"
            />
            <Input className="!w-full lg:!w-[300px]" placeholder="검색어를 입력하세요." />
            <Button type="primary" variant="solid" color="primary" onClick={() => handleSearch()} icon={<Search className="size-4" />}>
              검색
            </Button>
          </Space.Compact>
        </div>
        {/* Header right area */}
        <div className="flex gap-2 justify-end">
          <Button variant="solid" color="green" onClick={() => handleCreate()}>
            추가
          </Button>
        </div>
      </header>
      {/* Body -Grid View */}
      <div className="max-lg:hidden w-full h-full">
        <AgGridReact<User> {...{ rowData, columnDefs, gridOptions, loading }} onRowDoubleClicked={(e) => handleEdit(e.data?.userId)} />
      </div>

      {/* Body - Card View */}
      <div className="lg:hidden w-full h-full overflow-y-auto">
        {loading ? (
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
