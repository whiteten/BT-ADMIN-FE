/**
 * SkillAssignGrantDrawer — 상담사 N × 스킬셋 M 일괄 부여 Drawer (fallback P/L 확인 경로).
 *
 * 시안 결정사항:
 *  - P/L 입력란 노출 (디폴트 0/0, SWAT 정합)
 *  - priority:1, skillLevel:1 하드코딩 → priority:0, skillLevel:0 교정
 *  - 툴바 "배정" 버튼이 1차 경로 (Drawer 없이 즉시 부여)
 *  - Drawer는 P/L 확인 후 배정하는 fallback 경로로만 유지
 */
import { useEffect, useState } from 'react';
import { Button, Drawer, Empty, InputNumber } from 'antd';
import type { AgentResponse } from '../../agent-master/types';
import type { SkillsetResponse } from '../../skillset-master/types';

export interface GrantMapping {
  agentId: number;
  skillsetId: number;
  priority: number;
  skillLevel: number;
}

interface Props {
  open: boolean;
  agents: AgentResponse[];
  skillsets: SkillsetResponse[];
  onClose: () => void;
  onSubmit: (mappings: GrantMapping[]) => Promise<void>;
  loading: boolean;
  /** 툴바에서 미리 입력한 P/L 기본값. 미전달 시 0/0 */
  defaultPriority?: number;
  defaultSkillLevel?: number;
}

export default function SkillAssignGrantDrawer({ open, agents, skillsets, onClose, onSubmit, loading, defaultPriority, defaultSkillLevel }: Props) {
  const [priority, setPriority] = useState<number>(defaultPriority ?? 0);
  const [skillLevel, setSkillLevel] = useState<number>(defaultSkillLevel ?? 0);

  // Drawer 열릴 때마다 툴바 기본값으로 초기화
  useEffect(() => {
    if (open) {
      setPriority(defaultPriority ?? 0);
      setSkillLevel(defaultSkillLevel ?? 0);
    }
  }, [open, defaultPriority, defaultSkillLevel]);

  const handleSubmit = async () => {
    const mappings: GrantMapping[] = [];
    for (const agent of agents) {
      for (const skillset of skillsets) {
        mappings.push({ agentId: agent.agentId, skillsetId: skillset.skillsetId, priority, skillLevel });
      }
    }
    await onSubmit(mappings);
  };

  return (
    <Drawer
      title={`스킬 일괄 부여 (${agents.length}명 × ${skillsets.length}건)`}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onClose}
      width={480}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            disabled={agents.length === 0 || skillsets.length === 0}
            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
          >
            부여 ({agents.length * skillsets.length}개)
          </Button>
        </div>
      }
    >
      {agents.length === 0 || skillsets.length === 0 ? (
        <Empty description="상담사와 스킬셋을 선택하세요" />
      ) : (
        <div className="flex flex-col gap-4 text-sm text-gray-600">
          <p>
            선택된 상담사 <strong>{agents.length}명</strong>에게 스킬셋 <strong>{skillsets.length}건</strong>을 일괄 부여합니다.
          </p>
          {/* P/L 입력 */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-3">
            <div className="text-xs font-semibold text-gray-600">부여 기본값 설정</div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#405189] font-semibold">우선순위</label>
                <InputNumber min={0} max={9} value={priority} onChange={(v) => setPriority(v ?? 0)} style={{ width: 80 }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#405189] font-semibold">스킬레벨</label>
                <InputNumber min={0} max={99} value={skillLevel} onChange={(v) => setSkillLevel(v ?? 0)} style={{ width: 80 }} />
              </div>
            </div>
          </div>

          {/* 선택 목록 요약 */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              <span className="text-gray-400">상담사: </span>
              {agents
                .slice(0, 5)
                .map((a) => a.agentName ?? a.agentLoginId)
                .join(', ')}
              {agents.length > 5 && ` 외 ${agents.length - 5}명`}
            </div>
            <div>
              <span className="text-gray-400">스킬셋: </span>
              {skillsets
                .slice(0, 5)
                .map((s) => s.skillsetName)
                .join(', ')}
              {skillsets.length > 5 && ` 외 ${skillsets.length - 5}건`}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
