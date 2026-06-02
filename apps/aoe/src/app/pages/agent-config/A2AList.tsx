import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import A2ACard from '../../features/a2a/components/A2ACard';
import { a2aQueryKeys, useDeleteA2A, useGetA2AList } from '../../features/a2a/hooks/useA2aQueries';
import type { A2AItem } from '../../features/a2a/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'A2A', path: '/aoe/agent-config/a2a/list' },
];

const FILTER_OPTIONS = [{ label: 'Agent명', value: 'agentName' }];

export default function A2AList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [filterColumn, setFilterColumn] = useState('agentName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: agents = [], isFetching } = useGetA2AList();
  const { mutate: deleteA2A } = useDeleteA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
      },
    },
  });

  const handleDetail = (a2aId: string) => navigate(`../${a2aId}`);
  const handleDelete = (a2a: A2AItem) => {
    modal.confirm.delete({
      onOk: () => deleteA2A({ a2aId: a2a.a2aId }),
    });
  };

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return agents;
    const keyword = searchValue.toLowerCase();
    return agents.filter((a) => {
      const value = a[filterColumn as keyof typeof a];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [agents, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <Button type="primary" onClick={() => navigate('../create')}>
          추가
        </Button>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto pt-2 -mt-2">
          {filteredList.map((agent) => (
            <A2ACard key={agent.a2aId} {...agent} onDetail={handleDetail} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="등록된 A2A 서버가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
