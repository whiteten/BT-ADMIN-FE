/**
 * 배정 드로어 — 선택 그룹DN ↔ 선택 트렁크들의 우선순위·배정채널수 입력 후 일괄 저장.
 *
 * N:N 배정 (GrantDrawer 패턴). SWAT chnlValidation 가드는 BE 가 최종 판정하되,
 * agreeChannelOverflow 동의 플래그를 함께 전송한다.
 */
import { useEffect, useState } from 'react';
import { Button, Drawer, InputNumber } from 'antd';
import { toast } from '@/shared-util';
import { useSaveCommonTrunkMembers } from '../hooks/useCommonTrunkQueries';
import type { CommonGdnResponse, CommonTrunkMemberResponse, CommonTrunkMemberRow } from '../types';

interface CommonTrunkAssignDrawerProps {
  open: boolean;
  gdn: CommonGdnResponse | null;
  trunks: CommonTrunkMemberResponse[];
  onClose: () => void;
  onSaved: () => void;
}

interface AssignRow {
  sipTrunkId: number;
  sipTrunkName: string;
  maxChnl: number;
  priority: number;
  channelLimit: number;
}

export default function CommonTrunkAssignDrawer({ open, gdn, trunks, onClose, onSaved }: CommonTrunkAssignDrawerProps) {
  const [rows, setRows] = useState<AssignRow[]>([]);

  useEffect(() => {
    if (open) {
      setRows(
        trunks.map((t) => ({
          sipTrunkId: t.sipTrunkId,
          sipTrunkName: t.targetName ?? String(t.sipTrunkId),
          maxChnl: t.chnlCnt ?? 0,
          priority: t.memberPriority ?? 1,
          channelLimit: t.channelLimitCount ?? 0,
        })),
      );
    }
  }, [open, trunks]);

  const { mutate: saveMembers, isPending } = useSaveCommonTrunkMembers({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배정이 저장되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '배정 실패';
        toast.error(msg);
      },
    },
  });

  const updateRow = (sipTrunkId: number, patch: Partial<AssignRow>) => {
    setRows((prev) => prev.map((r) => (r.sipTrunkId === sipTrunkId ? { ...r, ...patch } : r)));
  };

  const handleSubmit = () => {
    if (!gdn) {
      toast.error('그룹DN 을 먼저 선택하세요');
      return;
    }
    if (rows.length === 0) {
      toast.warning('배정할 트렁크가 없습니다');
      return;
    }
    const payload: CommonTrunkMemberRow[] = rows.map((r) => ({
      sipTrunkId: r.sipTrunkId,
      assignYn: true,
      memberPriority: r.priority,
      channelLimitCount: r.channelLimit,
    }));
    saveMembers({ gdnId: gdn.gdnId, rows: payload, agreeChannelOverflow: false });
  };

  return (
    <Drawer
      title="배정 — 우선순위·채널수 입력"
      width={460}
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            배정 저장
          </Button>
        </div>
      }
    >
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3 text-[12.5px]">
        <span className="font-semibold text-[#405189]">GDN {gdn?.gdnNo ?? '—'}</span>
        <span className="text-gray-400">↔</span>
        <span className="font-semibold text-[#405189]">트렁크 {rows.length}건</span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-[11.5px] font-semibold text-gray-500 border-b border-gray-200" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px' }}>
          <span>트렁크</span>
          <span className="text-center">우선순위</span>
          <span className="text-center">배정채널수</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-3 py-4 text-[12.5px] text-gray-400">선택한 트렁크가 여기에 표시됩니다</div>
        ) : (
          rows.map((r) => (
            <div key={r.sipTrunkId} className="px-3 py-2 items-center border-b border-gray-100 last:border-b-0" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px' }}>
              <span className="text-[12.5px] text-gray-700 truncate" title={r.sipTrunkName}>
                {r.sipTrunkName}
              </span>
              <div className="flex justify-center">
                <InputNumber size="small" min={1} max={99} value={r.priority} onChange={(v) => updateRow(r.sipTrunkId, { priority: v ?? 1 })} style={{ width: 64 }} />
              </div>
              <div className="flex justify-center">
                <InputNumber
                  size="small"
                  min={0}
                  value={r.channelLimit}
                  onChange={(v) => updateRow(r.sipTrunkId, { channelLimit: v ?? 0 })}
                  placeholder="0=무제한"
                  style={{ width: 72 }}
                />
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">우선순위: 낮을수록 먼저 사용. 배정채널수 0 = 최대채널 전체 허용.</p>
    </Drawer>
  );
}
