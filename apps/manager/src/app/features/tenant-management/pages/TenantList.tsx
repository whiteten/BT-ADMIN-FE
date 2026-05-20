import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import TenantCard from '../components/TenantCard';
import { tenantQueryKeys, useDeleteTenant, useGetTenants } from '../hooks/useTenantQueries';
import type { TenantListItem } from '../types/tenant.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '시스템' }, { title: '자원관리' }, { title: '테넌트' }];

export default function TenantList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [filterColumn, setFilterColumn] = useState('tenantName');
  const [searchValue, setSearchValue] = useState('');

  const { data: tenantList, isFetching } = useGetTenants();
  const { mutate: deleteTenant } = useDeleteTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트가 비활성화되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.getTenants().queryKey });
      },
    },
  });

  const filteredList = useMemo(() => {
    if (!tenantList) return [];
    if (!searchValue.trim()) return tenantList;
    const keyword = searchValue.toLowerCase();
    return tenantList.filter((tenant) => {
      const value = tenant[filterColumn as keyof TenantListItem];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [tenantList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDetail = (tenantId: number) => {
    navigate(`../${tenantId}`);
  };

  const handleDelete = (tenantId: number) => {
    modal.confirm.execute({
      options: {
        title: '비활성화 확인',
        content: '이 테넌트를 비활성화하시겠습니까?',
      },
      onOk: () => deleteTenant({ id: tenantId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '테넌트명', value: 'tenantName' },
              { label: '별칭', value: 'tenantAlias' },
              { label: '담당자', value: 'managerName' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div>
          <Button type="primary" onClick={() => navigate('../create')}>
            추가
          </Button>
        </div>
      </div>
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((tenant) => (
            <TenantCard key={tenant.tenantId} {...tenant} onDetail={handleDetail} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
