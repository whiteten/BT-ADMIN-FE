/**
 * 배정 드로어 — 선택 그룹DN ↔ 선택 트렁크들의 우선순위·배정채널수 입력 후 일괄 저장.
 *
 * N:N 배정 (GrantDrawer 패턴). SWAT chnlValidation/ourAgreeConfirm 정합:
 *  - BE 에서 채널 초과 → IllegalStateException(CHANNEL_OVERFLOW) 던짐
 *  - FE 에서 Modal.confirm 으로 사용자에게 동의 확인 (갭8)
 *  - 동의 시 agreeChannelOverflow: true 로 재전송
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, InputNumber, Modal } from 'antd';
import { toast } from '@/shared-util';
import { useSaveCommonTrunkMembers } from '../hooks/useCommonTrunkQueries';
import type { CommonGdnResponse, CommonTrunkMemberResponse, CommonTrunkMemberRow, CommonTrunkMemberSaveRequest } from '../types';

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

/** 갭8: BE 채널 초과 에러 식별 키워드 */
const CHANNEL_OVERFLOW_KEYWORDS = ['CHANNEL_OVERFLOW', '채널', 'channel', 'overflow'];

function isChannelOverflowError(err: unknown): boolean {
  const msg = (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data;
  if (!msg) return false;
  const text = `${msg.code ?? ''} ${msg.message ?? ''}`.toLowerCase();
  return CHANNEL_OVERFLOW_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

export default function CommonTrunkAssignDrawer({ open, gdn, trunks, onClose, onSaved }: CommonTrunkAssignDrawerProps) {
  const [rows, setRows] = useState<AssignRow[]>([]);
  /** 갭8: 이미 agree confirm 을 보여주는 중이면 중복 방지 */
  const confirmingRef = useRef(false);

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
        confirmingRef.current = false;
        toast.success('배정이 저장되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        // 갭8: 채널 초과 에러 → Modal.confirm 으로 동의 확인
        if (isChannelOverflowError(err) && !confirmingRef.current) {
          confirmingRef.current = true;
          Modal.confirm({
            title: '채널 수 초과',
            content: '배정 채널수가 총 채널수를 초과합니다. 채널수 제한 없이 배정하시겠습니까?',
            okText: '동의 후 저장',
            cancelText: '취소',
            onOk: () => {
              confirmingRef.current = false;
              if (!gdn) return;
              const payload: CommonTrunkMemberRow[] = rows.map((r) => ({
                sipTrunkId: r.sipTrunkId,
                assignYn: true,
                memberPriority: r.priority,
                channelLimitCount: r.channelLimit,
              }));
              // agreeChannelOverflow=true 로 재전송
              saveMembers({ gdnId: gdn.gdnId, rows: payload, agreeChannelOverflow: true });
            },
            onCancel: () => {
              confirmingRef.current = false;
            },
          });
          return;
        }
        confirmingRef.current = false;
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '배정 실패';
        toast.error(msg);
      },
    },
  });

  const updateRow = (sipTrunkId: number, patch: Partial<AssignRow>) => {
    setRows((prev) => prev.map((r) => (r.sipTrunkId === sipTrunkId ? { ...r, ...patch } : r)));
  };

  const buildPayload = (): CommonTrunkMemberSaveRequest | null => {
    if (!gdn) {
      toast.error('그룹DN 을 먼저 선택하세요');
      return null;
    }
    if (rows.length === 0) {
      toast.warning('배정할 트렁크가 없습니다');
      return null;
    }
    return {
      gdnId: gdn.gdnId,
      rows: rows.map((r) => ({
        sipTrunkId: r.sipTrunkId,
        assignYn: true,
        memberPriority: r.priority,
        channelLimitCount: r.channelLimit,
      })),
      agreeChannelOverflow: false,
    };
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    if (!payload) return;
    saveMembers(payload);
  };

  return (
    <Drawer
      title="배정 — 우선순위·채널수 입력"
      width={460}
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
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
