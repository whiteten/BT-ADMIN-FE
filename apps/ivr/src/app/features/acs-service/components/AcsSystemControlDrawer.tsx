/**
 * ACS 시스템 제어 Drawer (AS-IS IPR35S5010P_AcsSystem 팝업).
 *
 * <p>DNIS(수신번호) 단위 발신 활성화/비활성화(blockState). 행별 라디오로 변경하고
 * 저장 시 변경된 행만 다건 전송한다 (AS-IS multi 동일).</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Radio, Table } from 'antd';
import { Save } from 'lucide-react';
import { toast } from '@/shared-util';
import { acsServiceQueryKeys, useGetSystemControls, useUpdateBlockState } from '../hooks/useAcsServiceQueries';
import type { AcsSystemControl } from '../types/acsService.types';

export interface AcsSystemControlDrawerRef {
  open: (acsId?: number) => void;
}

/** 행 키 (serviceId + systemId 복합) */
const rowKeyOf = (row: { serviceId: number; systemId: number }) => `${row.serviceId}_${row.systemId}`;

const AcsSystemControlDrawer = forwardRef<AcsSystemControlDrawerRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [acsId, setAcsId] = useState<number | undefined>(undefined);
  const [edited, setEdited] = useState<Record<string, number>>({});

  useImperativeHandle(ref, () => ({
    open: (targetAcsId) => {
      setAcsId(targetAcsId);
      setEdited({});
      setVisible(true);
    },
  }));

  // 편집 상태 초기화는 open()·저장 성공 시점에 수행한다.
  // ⚠️ [rows] 의존 useEffect로 초기화하지 말 것 — 쿼리 비활성(data undefined) 동안 `rows = []` 기본값이
  // 매 렌더 새 배열이라 setState 무한 루프가 되고, 이 상시 루프가 keepalive의 startTransition 커밋을
  // 굶겨 탭 전환 시 본문이 안 바뀌는 장애로 이어진다.
  const { data: rows = [], isFetching } = useGetSystemControls({
    params: acsId ? { acsId } : {},
    queryOptions: { enabled: visible },
  });

  const { mutate: updateMutate, isPending } = useUpdateBlockState({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        setEdited({});
        queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getSystemControls._def });
      },
      onError: (err) => toast.error(`저장 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const changedItems = rows
    .filter((row) => {
      const value = edited[rowKeyOf(row)];
      return value !== undefined && value !== row.blockState;
    })
    .map((row) => ({ serviceId: row.serviceId, systemId: row.systemId, blockState: edited[rowKeyOf(row)] }));

  const handleSave = () => {
    if (changedItems.length === 0) {
      toast.warning('변경된 항목이 없습니다.');
      return;
    }
    updateMutate(changedItems);
  };

  return (
    <Drawer
      title="시스템 제어"
      placement="right"
      styles={{ wrapper: { width: 880 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>닫기</Button>
          <Button type="primary" icon={<Save className="size-3.5" />} loading={isPending} onClick={handleSave} disabled={changedItems.length === 0}>
            저장 {changedItems.length > 0 ? `(${changedItems.length}건)` : ''}
          </Button>
        </div>
      }
    >
      <Table<AcsSystemControl>
        rowKey={rowKeyOf}
        size="small"
        loading={isFetching}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: '시스템명', dataIndex: 'systemName' },
          { title: 'IP 주소', dataIndex: 'ipAddress', width: 130 },
          { title: '노드 ID', dataIndex: 'nodeId', width: 80 },
          { title: 'ACS ID', dataIndex: 'acsId', width: 90 },
          { title: 'ACS 서비스명', dataIndex: 'acsServiceName' },
          {
            title: '활성화여부',
            dataIndex: 'blockState',
            width: 190,
            render: (_value: number, row) => (
              <Radio.Group
                value={edited[rowKeyOf(row)] ?? row.blockState}
                onChange={(e) => setEdited((prev) => ({ ...prev, [rowKeyOf(row)]: e.target.value }))}
                options={[
                  { value: 1, label: '활성화' },
                  { value: 0, label: '비활성화' },
                ]}
              />
            ),
          },
        ]}
      />
    </Drawer>
  );
});

AcsSystemControlDrawer.displayName = 'AcsSystemControlDrawer';
export default AcsSystemControlDrawer;
