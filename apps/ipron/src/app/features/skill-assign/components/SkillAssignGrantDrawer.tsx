/**
 * SkillAssignGrantDrawer — 상담사 N × 스킬셋 M 일괄 부여 Drawer (Phase 1 stub).
 * TODO Phase 2: 매트릭스 UI 구현
 */
import { Button, Drawer, Empty } from 'antd';
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
}

export default function SkillAssignGrantDrawer({ open, agents, skillsets, onClose, onSubmit, loading }: Props) {
  const handleSubmit = async () => {
    const mappings: GrantMapping[] = [];
    for (const agent of agents) {
      for (const skillset of skillsets) {
        mappings.push({ agentId: agent.agentId, skillsetId: skillset.skillsetId, priority: 1, skillLevel: 1 });
      }
    }
    await onSubmit(mappings);
  };

  return (
    <Drawer
      title={`스킬 일괄 부여 (${agents.length}명 × ${skillsets.length}건)`}
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
            부여
          </Button>
        </div>
      }
    >
      {agents.length === 0 || skillsets.length === 0 ? (
        <Empty description="상담사와 스킬셋을 선택하세요" />
      ) : (
        <div className="text-sm text-gray-600">
          <p>
            선택된 상담사 {agents.length}명에게 스킬셋 {skillsets.length}건을 일괄 부여합니다.
          </p>
          <p className="mt-2 text-xs text-gray-400">※ 이미 보유한 스킬셋은 건너뜁니다.</p>
        </div>
      )}
    </Drawer>
  );
}
