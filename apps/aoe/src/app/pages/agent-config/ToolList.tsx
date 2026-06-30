import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import ToolGroupCard from '../../features/tool/components/ToolGroupCard';
import { toolQueryKeys, useDeleteToolGroup, useGetToolGroups } from '../../features/tool/hooks/useToolQueries';
import type { ToolGroup } from '../../features/tool/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: NonNullable<BreadcrumbProps['items']> = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: '도구', path: '/aoe/agent-config/tool/list' },
];

const FILTER_OPTIONS = [{ label: '그룹명', value: 'groupName' }];

export default function ToolList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.TOOL_WRITE));
  const [filterColumn, setFilterColumn] = useState('groupName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: groups = [], isFetching } = useGetToolGroups();

  const { mutate: deleteToolGroup } = useDeleteToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getToolGroups().queryKey });
      },
      onError: () => {
        toast.error('그룹 삭제에 실패했습니다.');
      },
    },
  });

  const filteredGroups = searchValue.trim()
    ? groups.filter((g) => {
        const value = g[filterColumn as keyof typeof g];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    : groups;

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleOpenGroup = (group: ToolGroup) => {
    navigate(`../${group.groupId}`);
  };

  const handleDeleteGroup = (group: ToolGroup) => {
    modal.confirm.delete({ onOk: () => deleteToolGroup({ groupId: group.groupId }) });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <Button type="primary" onClick={() => navigate('../create')} disabled={!canWrite}>
          추가
        </Button>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredGroups.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto pt-2 -mt-2">
          {filteredGroups.map((group) => (
            <ToolGroupCard key={group.groupId} {...group} canWrite={canWrite} onOpen={handleOpenGroup} onDelete={handleDeleteGroup} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="등록된 도구 그룹이 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
