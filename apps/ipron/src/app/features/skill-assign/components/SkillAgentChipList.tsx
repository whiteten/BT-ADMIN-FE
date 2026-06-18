/**
 * 스킬 배정 칩 리스트 — 모드 ① 좌하.
 *
 * 한 상담사의 보유 스킬셋을 칩으로 표시. 각 칩에 P/L 표시 + ×버튼으로 해제.
 *
 * Phase 1: 칩 UI + 기본 CRUD. (매트릭스/diff/라우팅 시각화는 Phase 2.)
 */
import { Empty, Spin } from 'antd';
import { X } from 'lucide-react';
import type { SkillAgentResponse } from '../types';

interface Props {
  rows: SkillAgentResponse[];
  isLoading?: boolean;
  onUnassign: (row: SkillAgentResponse) => void;
  onEdit: (row: SkillAgentResponse) => void;
  agentLabel?: string;
}

export default function SkillAgentChipList({ rows, isLoading, onUnassign, onEdit, agentLabel }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spin />
      </div>
    );
  }

  if (rows.length === 0) {
    return <Empty description={agentLabel ? `${agentLabel} — 보유 스킬셋 없음` : '스킬셋이 없습니다'} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {agentLabel && (
        <div className="text-[11.5px] text-gray-600 flex items-center gap-2">
          <span>배정된 스킬셋</span>
          <span className="font-semibold text-[#405189]">{agentLabel}</span>
          <span className="text-gray-400">·</span>
          <span>{rows.length}건</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <span
            key={`${row.agentId}-${row.skillsetId}`}
            className="inline-flex items-center gap-1 bg-[#eef0f7] text-[#405189] border border-[#c5cbe0] rounded-full pl-2.5 pr-1 h-6 text-[11.5px] font-medium cursor-pointer hover:bg-[#405189] hover:text-white hover:border-[#405189] transition"
            onClick={() => onEdit(row)}
            title="클릭하여 우선순위/스킬레벨 수정"
          >
            <span className="max-w-[180px] truncate">{row.skillsetName}</span>
            <span className="text-[10px] opacity-85 pl-1 pr-1 border-l border-current ml-0.5">
              우선순위{row.priority ?? 0}·스킬레벨{row.skillLevel ?? 0}
            </span>
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-transparent text-inherit border-0 cursor-pointer text-[10px] leading-4 p-0 hover:bg-white/25 flex items-center justify-center"
              title="해제"
              onClick={(e) => {
                e.stopPropagation();
                onUnassign(row);
              }}
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
