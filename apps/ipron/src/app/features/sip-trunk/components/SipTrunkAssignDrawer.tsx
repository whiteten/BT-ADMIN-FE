/**
 * 배정 설정 Drawer — 우선순위 / 채널수 N:N 입력 (GrantDrawer 패턴).
 *
 * 그룹DN 1건 × 선택 트렁크 N건 → 각 트렁크별 우선순위/배정 채널수 입력 후 일괄 저장.
 *
 * SWAT chnlValidation() 2단 가드:
 *  1. 배정 채널수 > 트렁크 최대 채널 → 차단 (totError)
 *  2. 기존 점유 + 입력 합 > 최대 → 동의 confirm 후 허용 (optError)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Drawer, InputNumber, Modal } from 'antd';
import { toast } from '@/shared-util';
import { useSaveSipTrunkMembers } from '../hooks/useSipTrunkQueries';
import type { SipTrunkMemberResponse } from '../types';

interface Props {
  open: boolean;
  gdnId: number | null;
  gdnLabel: string;
  /** 배정 대상 트렁크 (그리드에서 선택된 행) */
  trunks: SipTrunkMemberResponse[];
  onClose: () => void;
  onSuccess: () => void;
}

interface RowState {
  sipTrunkId: number;
  priority: number;
  channels: number;
}

function gaugeColor(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0;
  return pct < 60 ? '#16a34a' : pct <= 85 ? '#f59e0b' : '#dc2626';
}

export default function SipTrunkAssignDrawer({ open, gdnId, gdnLabel, trunks, onClose, onSuccess }: Props) {
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [bulkPriority, setBulkPriority] = useState<number | null>(null);
  const [bulkChannels, setBulkChannels] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<number, RowState> = {};
    trunks.forEach((t, idx) => {
      next[t.sipTrunkId] = {
        sipTrunkId: t.sipTrunkId,
        priority: t.memberPriority ?? idx + 1,
        channels: t.channelLimitCount ?? t.chnlCnt ?? 0,
      };
    });
    setRows(next);
    setBulkPriority(null);
    setBulkChannels(null);
  }, [open, trunks]);

  const setRow = useCallback((id: number, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const applyBulk = useCallback(() => {
    setRows((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        const key = Number(id);
        next[key] = {
          ...next[key],
          ...(bulkPriority != null ? { priority: bulkPriority } : {}),
          ...(bulkChannels != null ? { channels: bulkChannels } : {}),
        };
      }
      return next;
    });
  }, [bulkPriority, bulkChannels]);

  const { mutate: saveMembers, isPending } = useSaveSipTrunkMembers({
    mutationOptions: {
      onSuccess: (result) => {
        toast.success(`배정 완료 — 추가 ${result.added} · 수정 ${result.updated}`);
        onSuccess();
        onClose();
      },
      onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '배정 실패'),
    },
  });

  const overflowTrunks = useMemo(
    () =>
      trunks.filter((t) => {
        const r = rows[t.sipTrunkId];
        if (!r) return false;
        const max = t.chnlCnt ?? 0;
        const otherUsed = (t.totChannelCount ?? 0) - (t.channelLimitCount ?? 0);
        return otherUsed + r.channels > max;
      }),
    [trunks, rows],
  );

  const hardError = useMemo(
    () =>
      trunks.some((t) => {
        const r = rows[t.sipTrunkId];
        if (!r) return false;
        return r.channels > (t.chnlCnt ?? 0);
      }),
    [trunks, rows],
  );

  const submit = useCallback(
    (agree: boolean) => {
      if (gdnId == null) return;
      const body = {
        gdnId,
        agreeChannelOverflow: agree,
        rows: trunks.map((t) => {
          const r = rows[t.sipTrunkId];
          return {
            sipTrunkId: t.sipTrunkId,
            assignYn: true,
            memberPriority: r?.priority ?? 0,
            channelLimitCount: r?.channels ?? 0,
          };
        }),
      };
      saveMembers(body);
    },
    [gdnId, trunks, rows, saveMembers],
  );

  const handleSave = useCallback(() => {
    if (hardError) {
      toast.error('SIP 트렁크 최대 채널수를 초과할 수 없습니다.');
      return;
    }
    if (overflowTrunks.length > 0) {
      Modal.confirm({
        title: '채널 점유 초과',
        content: `${overflowTrunks.length}개 트렁크의 기존 점유 + 입력 합이 최대 채널을 초과합니다. 그래도 배정하시겠습니까?`,
        okText: '배정',
        cancelText: '취소',
        onOk: () => submit(true),
      });
      return;
    }
    submit(false);
  }, [hardError, overflowTrunks, submit]);

  return (
    <Drawer
      title={
        <div>
          <div className="text-[15px] font-semibold text-gray-800">배정 설정 — 우선순위 / 채널수</div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            {gdnLabel} × 트렁크 {trunks.length}건 (N:N)
          </div>
        </div>
      }
      closable={{ placement: 'end' }}
      open={open}
      onClose={onClose}
      width={560}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={handleSave} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      {/* 일괄 적용 */}
      <div className="mb-3 flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2 text-[12px]">
        <span className="font-semibold text-gray-600">일괄 적용:</span>
        <label className="flex items-center gap-1 text-gray-600">
          우선순위
          <InputNumber size="small" min={0} value={bulkPriority} onChange={(v) => setBulkPriority(v)} style={{ width: 64 }} />
        </label>
        <label className="flex items-center gap-1 text-gray-600">
          채널수
          <InputNumber size="small" min={0} value={bulkChannels} onChange={(v) => setBulkChannels(v)} style={{ width: 64 }} />
        </label>
        <Button size="small" onClick={applyBulk}>
          모두 적용
        </Button>
      </div>

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-500">SIP 트렁크</th>
            <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-500">채널 현황</th>
            <th className="border-b border-gray-200 px-2 py-2 text-center font-semibold text-gray-500">우선순위</th>
            <th className="border-b border-gray-200 px-2 py-2 text-center font-semibold text-gray-500">배정 채널수</th>
          </tr>
        </thead>
        <tbody>
          {trunks.map((t) => {
            const r = rows[t.sipTrunkId];
            const max = t.chnlCnt ?? 0;
            const used = t.totChannelCount ?? 0;
            const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
            const channelExceeds = (r?.channels ?? 0) > max;
            return (
              <tr key={t.sipTrunkId}>
                <td className="border-b border-gray-100 px-3 py-2">
                  <div className="font-semibold text-gray-800">{t.targetName ?? '-'}</div>
                  <div className="font-mono text-[10px] text-gray-400">
                    {t.targetNo ?? '-'} · 최대채널 {max}
                  </div>
                </td>
                <td className="border-b border-gray-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-[5px] w-[80px] overflow-hidden rounded bg-gray-200">
                      <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: gaugeColor(used, max) }} />
                    </div>
                    <span className="text-[10.5px] font-semibold" style={{ color: gaugeColor(used, max) }}>
                      {used}/{max}
                    </span>
                  </div>
                </td>
                <td className="border-b border-gray-100 px-2 py-2 text-center">
                  <InputNumber size="small" min={0} value={r?.priority ?? 0} onChange={(v) => setRow(t.sipTrunkId, { priority: v ?? 0 })} style={{ width: 56 }} />
                </td>
                <td className="border-b border-gray-100 px-2 py-2 text-center">
                  <InputNumber
                    size="small"
                    min={0}
                    value={r?.channels ?? 0}
                    onChange={(v) => setRow(t.sipTrunkId, { channels: v ?? 0 })}
                    status={channelExceeds ? 'error' : undefined}
                    style={{ width: 60 }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Drawer>
  );
}
