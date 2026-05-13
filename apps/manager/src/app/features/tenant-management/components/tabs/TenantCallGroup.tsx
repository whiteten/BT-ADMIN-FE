import { useRef } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Empty, Tag } from 'antd';
import { toast } from '@/shared-util';
import { tenantQueryKeys, useDeleteCallGroup, useGetCallGroups } from '../../hooks/useTenantQueries';
import { CALL_GROUP_GUBUN_LABELS, type CallGroupItem } from '../../types/tenant.types';
import CallGroupDrawer, { type CallGroupDrawerRef } from '../CallGroupDrawer';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button as ShadButton } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function TenantCallGroup() {
  const { tenantId } = useParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const drawerRef = useRef<CallGroupDrawerRef>(null);

  const { data: callGroups, isFetching } = useGetCallGroups({ params: { id: tenantId } });

  const { mutate: deleteCallGroup } = useDeleteCallGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('통화그룹이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.getCallGroups._def });
      },
    },
  });

  const handleAdd = () => {
    drawerRef.current?.open({ tenantId: Number(tenantId) });
  };

  const handleEdit = (record: CallGroupItem) => {
    drawerRef.current?.open({ tenantId: Number(tenantId), callGroupData: record });
  };

  const handleDelete = (record: CallGroupItem) => {
    modal.confirm.delete({
      onOk: () =>
        deleteCallGroup({
          id: Number(tenantId),
          targetTenantId: record.tenantId,
          gubun: record.gubun,
        }),
    });
  };

  if (isFetching) {
    return <FallbackSpinner />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={handleAdd}>
          + 추가
        </Button>
      </div>
      {callGroups && callGroups.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {callGroups.map((cg) => {
            const isOutbound = cg.gubun === 0;
            const isOn = cg.useYn === 1;
            const gubunLabel = CALL_GROUP_GUBUN_LABELS[cg.gubun] ?? '-';

            const title = <span className="text-sm">{cg.tenantName}</span>;

            const extra = (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ShadButton variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
                    <IconMoreVertical />
                    <span className="sr-only">더보기</span>
                  </ShadButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="dark" align="end">
                  <DropdownMenuItem onClick={() => handleEdit(cg)} className="hover:cursor-pointer">
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(cg)} className="hover:cursor-pointer">
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );

            return (
              <Card
                key={`${cg.tenantId}-${cg.gubun}`}
                title={title}
                extra={extra}
                styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '16px', paddingTop: '12px' } }}
                className="hover:!border-[var(--color-bt-primary)]"
              >
                <div className="flex items-center gap-2">
                  <Tag color={isOutbound ? 'blue' : 'gold'} className="!m-0">
                    {isOutbound ? '📤' : '📥'} {gubunLabel}
                  </Tag>
                  <Badge status={isOn ? 'success' : 'default'} text={isOn ? 'ON' : 'OFF'} />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty description="등록된 통화그룹이 없습니다." className="py-10" />
      )}
      <CallGroupDrawer ref={drawerRef} />
    </div>
  );
}
