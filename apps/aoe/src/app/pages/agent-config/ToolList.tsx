import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import ToolGroupCard from '../../features/tool/components/ToolGroupCard';
import ToolGroupDrawer, { type ToolGroupDrawerRef } from '../../features/tool/components/ToolGroupDrawer';
import { toolQueryKeys, useDeleteToolGroup, useGetToolGroups } from '../../features/tool/hooks/useToolQueries';
import type { ToolGroup } from '../../features/tool/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: NonNullable<BreadcrumbProps['items']> = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: '도구', path: '/aoe/agent-config/tool/list' },
];

export default function ToolList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const groupDrawerRef = useRef<ToolGroupDrawerRef>(null);
  const [searchValue, setSearchValue] = useState('');

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

  const filteredGroups = useMemo(() => {
    if (!searchValue.trim()) return groups;
    const keyword = searchValue.toLowerCase();
    return groups.filter((g) => g.groupName.toLowerCase().includes(keyword) || (g.description ?? '').toLowerCase().includes(keyword));
  }, [groups, searchValue]);

  const handleOpenGroup = (group: ToolGroup) => {
    navigate(`../${group.groupId}`);
  };

  const handleDeleteGroup = (group: ToolGroup) => {
    modal.confirm.delete({ onOk: () => deleteToolGroup({ groupId: group.groupId }) });
  };

  return (
    <>
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader breadcrumb={breadcrumb} />

        <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
          <Input
            prefix={<Search className="size-3.5 text-gray-400" />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full max-w-[400px]"
            placeholder="그룹명으로 검색"
            allowClear
          />
          <Button type="primary" onClick={() => groupDrawerRef.current?.open()}>
            추가
          </Button>
        </div>

        {isFetching ? (
          <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
            <FallbackSpinner />
          </div>
        ) : filteredGroups.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
            {filteredGroups.map((group) => (
              <ToolGroupCard key={group.groupId} {...group} onOpen={handleOpenGroup} onDelete={handleDeleteGroup} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
            <NoData message="등록된 도구 그룹이 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
          </div>
        )}
      </div>

      <ToolGroupDrawer ref={groupDrawerRef} />
    </>
  );
}
