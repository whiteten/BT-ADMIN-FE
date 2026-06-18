import { type ReactNode } from 'react';
import { Library, Plug, Wrench } from 'lucide-react';
import { useGetToolGroups } from '../../tool/hooks/useToolQueries';
import { useGetWorkflowGraph } from '../../workflow/hooks/useWorkflowQueries';
import { extractAgentResourcesFromGraph } from '../utils/extractAgentResourcesFromGraph';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface AgentUsageSummaryProps {
  agentId?: string;
}

type Tint = 'blue' | 'indigo' | 'cyan';

const TILE_CLASS: Record<Tint, string> = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  cyan: 'bg-cyan-50 text-cyan-600',
};

const PILL_CLASS: Record<Tint, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
};

const Pill = ({ tint, children }: { tint: Tint; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL_CLASS[tint]}`}>{children}</span>
);

interface ResourceRowProps {
  icon: ReactNode;
  tint: Tint;
  label: string;
  count: number;
  children: ReactNode;
}

function ResourceRow({ icon, tint, label, count, children }: ResourceRowProps) {
  return (
    <div className="flex gap-3.5 px-5 py-3.5">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TILE_CLASS[tint]}`}>{icon}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          {count > 0 && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-gray-500">{count}</span>}
        </div>
        {count === 0 ? <span className="text-xs text-gray-400">미사용</span> : children}
      </div>
    </div>
  );
}

// 그룹/서버 소제목 + 하위 펄 한 줄
const GroupedPills = ({ groupLabel, items, tint }: { groupLabel: string; items: string[]; tint: Tint }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
    <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{groupLabel}</span>
    {items.map((name) => (
      <Pill key={name} tint={tint}>
        {name}
      </Pill>
    ))}
  </div>
);

/**
 * 에이전트가 실제로 사용 중인 리소스(RAG/Tool/MCP)를 워크플로우 그래프에서 집계해 읽기 전용으로 표시.
 * 아이콘 타일 → 라벨·개수 → 항목 펄의 정보 위계. 수정 UI 없음.
 */
export default function AgentUsageSummary({ agentId }: AgentUsageSummaryProps) {
  const { data: graph, isFetching } = useGetWorkflowGraph({ params: { agentId: agentId ?? '' } });
  const { data: toolGroups = [] } = useGetToolGroups();

  const { knowledge, tools, mcp } = extractAgentResourcesFromGraph(graph?.nodes ?? []);

  // groupId -> groupName 매핑 (없으면 groupId 그대로 표기)
  const groupNameById = new Map(toolGroups.map((g) => [g.groupId, g.groupName]));

  // 도구를 그룹 단위로 묶어 표시 (그룹명 + 하위 도구 펄)
  const toolsByGroup = new Map<string, string[]>();
  for (const { toolName, groupId } of tools) {
    const bucket = toolsByGroup.get(groupId) ?? [];
    bucket.push(toolName);
    toolsByGroup.set(groupId, bucket);
  }

  const mcpToolCount = mcp.reduce((sum, s) => sum + s.toolNames.length, 0);
  const usedTypes = [knowledge.length > 0, tools.length > 0, mcp.length > 0].filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-[var(--color-bt-primary)]" />
          <span className="text-sm font-semibold text-gray-800">사용 리소스</span>
        </div>
        <span className="text-xs text-gray-400">{usedTypes === 0 ? '사용 리소스 없음' : `${usedTypes}개 유형 사용 중`}</span>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center py-10">
          <FallbackSpinner />
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          <ResourceRow icon={<Library className="size-[18px]" />} tint="blue" label="지식 (RAG)" count={knowledge.length}>
            <div className="flex flex-wrap gap-1.5">
              {knowledge.map((k) => (
                <Pill key={k.documentId} tint="blue">
                  {k.documentName}
                </Pill>
              ))}
            </div>
          </ResourceRow>

          <ResourceRow icon={<Wrench className="size-[18px]" />} tint="indigo" label="도구 (Tool)" count={tools.length}>
            <div className="flex flex-col gap-2">
              {Array.from(toolsByGroup.entries()).map(([groupId, toolNames]) => (
                <GroupedPills key={groupId} groupLabel={groupNameById.get(groupId) ?? groupId} items={toolNames} tint="indigo" />
              ))}
            </div>
          </ResourceRow>

          <ResourceRow icon={<Plug className="size-[18px]" />} tint="cyan" label="MCP" count={mcpToolCount}>
            <div className="flex flex-col gap-2">
              {mcp.map(({ serverName, toolNames }) => (
                <GroupedPills key={serverName} groupLabel={serverName} items={toolNames} tint="cyan" />
              ))}
            </div>
          </ResourceRow>
        </div>
      )}
    </div>
  );
}
