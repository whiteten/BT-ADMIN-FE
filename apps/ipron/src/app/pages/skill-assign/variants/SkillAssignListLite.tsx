/**
 * 스킬 배정 변형 — 경량 패널 (Lite).
 *
 * 목업: mockup/ipron-skill-assign/ 시안 골조 이식.
 * ag-grid 무거운 기본 화면 대비 경량 리스트 3열로 같은 일괄 배정 흐름 제공.
 * 3열 구조:
 *  - 열1 상담사: 상담그룹 트리 필터 + 검색 + 표시목록 전체선택 + 다중선택 리스트
 *  - 열2 스킬셋: 업무그룹 트리 필터 + 검색 + 다중선택 리스트
 *  - 열3 실행 패널: 상담사×스킬셋 요약 + 선택칩 + 보유율 미리보기 + 새로/기존 배지 + P/L 입력 + 배정·수정·해제
 *
 * 기본 화면(SkillAssignList)과 동일한 라우트 컨텍스트·query key·뮤테이션 훅을 사용하는 정식 variant.
 * ag-grid 대신 경량 리스트로 같은 일괄 배정 흐름을 제공한다.
 */
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useQueryClient } from '@tanstack/react-query';
import { Button, ConfigProvider, Input, InputNumber, Popover, Tag, TreeSelect, type TreeSelectProps } from 'antd';
import { Check, ChevronRight, FolderClosed, Search, Users, Wrench, X } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { agentMasterQueryKeys, useGetAgentGroupTree, useGetAgents } from '../../../features/agent-master/hooks/useAgentMasterQueries';
import {
  useBulkGrant,
  useBulkRevoke,
  useBulkUpdatePl,
  useGetAgentsBySkillset,
  useGetAgentsBySkillsetMany,
  useGetSkillsetCoverage,
  useGetSkillsetsByAgent,
} from '../../../features/skill-assign/hooks/useSkillAssignQueries';
import { skillsetQueryKeys, useGetSkillsetGroups, useGetSkillsets } from '../../../features/skillset-master/hooks/useSkillsetQueries';
import { getMediaTypeName } from '../../../features/skillset-master/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '상담사 관리' }, { title: '스킬 관리' }, { title: '상담사 스킬 배정', path: '/ipron/skill-assign' }];

/** 트리에서 각 노드 → (자신 + 모든 하위) id 집합 맵. 상위 그룹 선택 시 하위 전체 포함 필터용. */
function buildDescendantMap<T extends { children?: T[] | null }>(nodes: T[], getId: (n: T) => number): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  const walk = (node: T): Set<number> => {
    const set = new Set<number>([getId(node)]);
    for (const child of node.children ?? []) {
      for (const id of walk(child)) set.add(id);
    }
    map.set(getId(node), set);
    return set;
  };
  for (const n of nodes) walk(n);
  return map;
}

/** 트리에서 각 노드 id → 루트부터 자신까지 이름 경로 배열 맵. (그룹 전체경로 표기용) */
function buildPathMap<T extends { children?: T[] | null }>(nodes: T[], getId: (n: T) => number, getName: (n: T) => string): Map<number, string[]> {
  const map = new Map<number, string[]>();
  const walk = (node: T, ancestors: string[]) => {
    const path = [...ancestors, getName(node)];
    map.set(getId(node), path);
    for (const child of node.children ?? []) walk(child, path);
  };
  for (const n of nodes) walk(n, []);
  return map;
}

// ── antd TreeSelect 를 add-tree 공통 트리 룩에 근접시키기 위한 노드 title/props ──
interface SelectTreeNode {
  value: number;
  name: string; // 검색 매칭용 (title 이 JSX 라 별도 문자열 필드)
  title: ReactNode; // 폴더 아이콘 + 12.5px 라벨 + 우측 카운트
  children?: SelectTreeNode[];
}

function TreeSelectRow({ name, count }: { name: string; count: number }) {
  // pr-2 로 카운트를 행 우측 끝에서 띄워 세로 스크롤바와 겹치지 않게 함
  return (
    <span className="flex items-center gap-1.5 w-full pr-2">
      <FolderClosed className="size-3.5 flex-shrink-0 text-gray-500" />
      <span className="flex-1 truncate text-[12.5px] text-gray-700">{name}</span>
      <span className="text-[11px] text-gray-400 flex-shrink-0">{count.toLocaleString()}</span>
    </span>
  );
}

/** TreeSelect "전체"(필터 해제) 행 센티넬 값 — 실제 groupId/treeId 는 모두 양수라 충돌 없음 */
const ALL_VALUE = -1;

/** treeData 맨 위에 "전체" 행을 붙여 반환 */
function withAllRow(allLabel: string, allCount: number, nodes: SelectTreeNode[]): SelectTreeNode[] {
  return [{ value: ALL_VALUE, name: allLabel, title: <TreeSelectRow name={allLabel} count={allCount} /> }, ...nodes];
}

function buildSelectTree<T>(
  nodes: T[],
  getId: (n: T) => number,
  getChildren: (n: T) => T[] | null | undefined,
  getName: (n: T) => string,
  getCount: (n: T) => number,
): SelectTreeNode[] {
  return nodes.map((n) => {
    const kids = getChildren(n);
    return {
      value: getId(n),
      name: getName(n),
      title: <TreeSelectRow name={getName(n)} count={getCount(n)} />,
      children: kids?.length ? buildSelectTree(kids, getId, getChildren, getName, getCount) : undefined,
    };
  });
}

/** 두 그룹 필터 공통 — add-tree 룩(caret·폴더·필터) TreeSelect props */
const treeSelectLook: Partial<TreeSelectProps> = {
  size: 'small',
  allowClear: false,
  showSearch: true,
  treeDefaultExpandAll: true,
  filterTreeNode: (input, node) =>
    String((node as { name?: string }).name ?? '')
      .toLowerCase()
      .includes(input.toLowerCase()),
  switcherIcon: ({ expanded, isLeaf }: { expanded?: boolean; isLeaf?: boolean }) =>
    isLeaf ? null : <ChevronRight className={cn('size-3.5 text-gray-400 transition-transform', expanded && 'rotate-90')} />,
};

export default function SkillAssignListLite() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const modal = useModal();

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ─── 선택/필터 상태 ────────────────────────────────────────────────────────
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [selectedSkillsetIds, setSelectedSkillsetIds] = useState<number[]>([]);

  const [agentKw, setAgentKw] = useState('');
  const [skillKw, setSkillKw] = useState('');
  const [agentGroupFilter, setAgentGroupFilter] = useState<number | null>(null);
  const [skillTreeFilter, setSkillTreeFilter] = useState<number | null>(null);

  const [priority, setPriority] = useState(0);
  const [skillLevel, setSkillLevel] = useState(0);

  // ─── 테넌트 스코프 ──────────────────────────────────────────────────────────
  // ⚠️ 현재는 "로그인 테넌트"로 모든 조회를 고정한다 (일반 사용자·관리자 무관, 교차테넌트 방지).
  //    TODO(전체 테넌트 모드): 추후 "전체 테넌트 모드"가 별도 도입되면 —
  //      (1) 이 tenantId 주입부를 모드에 따라 분기(전체면 tenantId 미전달)하고,
  //      (2) 화면 UI 전반(테넌트 선택/표시, 상담사·스킬셋 행의 테넌트 컬럼, 교차테넌트 배정 방지 등)을
  //          함께 재설계해야 한다. 지금 구조(단일 테넌트 가정)는 그 시점에 손봐야 함.
  const currentTenantId = useAuthStore((s) => s.userInfo?.tenant);
  const tenantParams = currentTenantId ? { tenantId: Number(currentTenantId) } : undefined;

  // ─── Queries (로그인 테넌트 기준) ────────────────────────────────────────────
  const { data: agents = [], isLoading: agentsLoading } = useGetAgents({ params: tenantParams });
  const { data: skillsets = [], isLoading: skillsetsLoading } = useGetSkillsets({ params: tenantParams });
  const { data: agentGroupTree = [] } = useGetAgentGroupTree({ params: tenantParams });
  const { data: skillGroupTree = [] } = useGetSkillsetGroups({ params: tenantParams });

  // 선택 N명 기준 스킬셋별 보유 인원 (양 모드 미리보기 공용)
  const { data: coverage = [] } = useGetSkillsetCoverage(selectedAgentIds, {
    queryOptions: { enabled: selectedAgentIds.length > 0 },
  });
  const coverageMap = useMemo(() => new Map(coverage.map((c) => [c.skillsetId, c.holdingCount])), [coverage]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const qc = useQueryClient();
  const resetSelection = () => {
    setSelectedAgentIds([]);
    setSelectedSkillsetIds([]);
  };
  // 신규 화면 전용: 배정/수정/해제 후 목록 필드(상담사 skillCount·스킬셋 agentCount) 즉시 갱신.
  // 공통 훅 invalidateAgentSkill 은 목록 캐시를 안 지우므로(기존 화면은 coverage 로만 표기해 불필요했음)
  // 이 화면에서만 두 목록 쿼리를 국소 무효화한다.
  const invalidateCountLists = () => {
    qc.invalidateQueries({ queryKey: agentMasterQueryKeys.getList._def });
    qc.invalidateQueries({ queryKey: skillsetQueryKeys.getList._def });
  };
  const { mutate: bulkGrant, isPending: granting } = useBulkGrant({
    mutationOptions: {
      onSuccess: (r) => {
        toast.success(`${r.added}건 새로 배정 (이미 배정 ${r.skipped}건 건너뜀)`);
        invalidateCountLists();
        resetSelection();
      },
      onError: () => toast.error('배정 실패'),
    },
  });
  const { mutate: bulkRevoke, isPending: revoking } = useBulkRevoke({
    mutationOptions: {
      onSuccess: (r) => {
        toast.success(`${r.removed}건 배정 해제`);
        invalidateCountLists();
        resetSelection();
      },
      onError: () => toast.error('해제 실패'),
    },
  });
  const { mutate: bulkUpdatePl, isPending: updatingPl } = useBulkUpdatePl({
    mutationOptions: {
      onSuccess: (n) => {
        toast.success(`${n}건 우선순위·스킬레벨 수정`);
        resetSelection();
      },
      onError: () => toast.error('수정 실패'),
    },
  });
  // ─── 파생: 필터된 목록 ─────────────────────────────────────────────────────
  const agentDescMap = useMemo(() => buildDescendantMap(agentGroupTree, (n) => n.groupId), [agentGroupTree]);
  const skillDescMap = useMemo(() => buildDescendantMap(skillGroupTree, (n) => n.treeId), [skillGroupTree]);
  const agentPathMap = useMemo(
    () =>
      buildPathMap(
        agentGroupTree,
        (n) => n.groupId,
        (n) => n.groupName,
      ),
    [agentGroupTree],
  );
  const skillPathMap = useMemo(
    () =>
      buildPathMap(
        skillGroupTree,
        (n) => n.treeId,
        (n) => n.treeName,
      ),
    [skillGroupTree],
  );

  const filteredAgents = useMemo(() => {
    const kw = agentKw.trim().toLowerCase();
    const allowed = agentGroupFilter != null ? agentDescMap.get(agentGroupFilter) : null;
    return agents.filter((a) => {
      if (allowed && (a.groupId == null || !allowed.has(a.groupId))) return false;
      if (!kw) return true;
      return [a.agentName, a.agentLoginId, a.agentAlias, a.groupName].some((f) => f != null && String(f).toLowerCase().includes(kw));
    });
  }, [agents, agentKw, agentGroupFilter, agentDescMap]);

  const filteredSkillsets = useMemo(() => {
    const kw = skillKw.trim().toLowerCase();
    const allowed = skillTreeFilter != null ? skillDescMap.get(skillTreeFilter) : null;
    return skillsets.filter((s) => {
      if (allowed && (s.treeId == null || !allowed.has(s.treeId))) return false;
      if (!kw) return true;
      return s.skillsetName.toLowerCase().includes(kw);
    });
  }, [skillsets, skillKw, skillTreeFilter, skillDescMap]);

  // 필터 변경으로 화면에서 사라진 선택 항목은 선택에서 자동 제외 (가시 항목 기준 선택 유지)
  useEffect(() => {
    const visible = new Set(filteredAgents.map((a) => a.agentId));
    setSelectedAgentIds((prev) => {
      const next = prev.filter((id) => visible.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredAgents]);

  useEffect(() => {
    const visible = new Set(filteredSkillsets.map((s) => s.skillsetId));
    setSelectedSkillsetIds((prev) => {
      const next = prev.filter((id) => visible.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredSkillsets]);

  // ─── 파생: 실행 패널 수치 ──────────────────────────────────────────────────
  const N = selectedAgentIds.length;
  const M = selectedSkillsetIds.length;
  const selectedAgents = useMemo(() => agents.filter((a) => selectedAgentIds.includes(a.agentId)), [agents, selectedAgentIds]);
  const selectedSkillsets = useMemo(() => skillsets.filter((s) => selectedSkillsetIds.includes(s.skillsetId)), [skillsets, selectedSkillsetIds]);

  const totalPairs = N * M;
  const existPairs = selectedSkillsets.reduce((sum, s) => sum + (coverageMap.get(s.skillsetId) ?? 0), 0);
  const newPairs = totalPairs - existPairs;

  // ─── 선택 토글 헬퍼 ────────────────────────────────────────────────────────
  const toggleAgent = (id: number) => setSelectedAgentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSkillset = (id: number) => setSelectedSkillsetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const agentAllSelected = filteredAgents.length > 0 && filteredAgents.every((a) => selectedAgentIds.includes(a.agentId));
  const skillAllSelected = filteredSkillsets.length > 0 && filteredSkillsets.every((s) => selectedSkillsetIds.includes(s.skillsetId));

  const toggleAllAgents = () => {
    if (agentAllSelected) {
      const shown = new Set(filteredAgents.map((a) => a.agentId));
      setSelectedAgentIds((prev) => prev.filter((id) => !shown.has(id)));
    } else {
      setSelectedAgentIds((prev) => Array.from(new Set([...prev, ...filteredAgents.map((a) => a.agentId)])));
    }
  };
  const toggleAllSkillsets = () => {
    if (skillAllSelected) {
      const shown = new Set(filteredSkillsets.map((s) => s.skillsetId));
      setSelectedSkillsetIds((prev) => prev.filter((id) => !shown.has(id)));
    } else {
      setSelectedSkillsetIds((prev) => Array.from(new Set([...prev, ...filteredSkillsets.map((s) => s.skillsetId)])));
    }
  };

  // ─── 실행 액션 ─────────────────────────────────────────────────────────────
  const handleGrant = () => {
    if (!N || !M) return;
    const mappings = selectedAgentIds.flatMap((agentId) => selectedSkillsetIds.map((skillsetId) => ({ agentId, skillsetId, priority, skillLevel })));
    modal.confirm.execute({
      options: {
        title: '스킬 배정',
        content: (
          <>
            새로 배정될 {newPairs}건을 배정합니다.
            {existPairs > 0 && (
              <>
                <br />
                이미 배정된 {existPairs}건은 변경되지 않습니다.
              </>
            )}
          </>
        ),
        okText: '배정',
      },
      onOk: () => bulkGrant({ mappings }),
    });
  };
  const handleUpdatePl = () => {
    if (!N || !M) return;
    modal.confirm.execute({
      options: {
        title: '우선순위·스킬레벨 수정',
        content: `배정된 ${existPairs}건의 우선순위를 ${priority}, 스킬레벨을 ${skillLevel} 로 일괄 수정합니다.`,
        okText: '수정',
      },
      onOk: () => bulkUpdatePl({ agentIds: selectedAgentIds, skillsetIds: selectedSkillsetIds, priority, skillLevel }),
    });
  };
  const handleRevoke = () => {
    if (!N || !M) return;
    modal.confirm.delete({
      options: { title: '배정 해제', content: `배정된 ${existPairs}건을 해제합니다.`, okText: '해제' },
      onOk: () => bulkRevoke({ agentIds: selectedAgentIds, skillsetIds: selectedSkillsetIds }),
    });
  };
  const busy = granting || revoking || updatingPl;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <ConfigProvider theme={{ components: { Tree: { indentSize: 12 }, TreeSelect: { indentSize: 12 } } }}>
      <div className="flex flex-col gap-4 w-full h-full">
        {/* 본문: 3열 */}
        <PanelGroup direction="horizontal" className="flex w-full flex-1 min-h-0">
          {/* ── 열1: 상담사 ── */}
          <Panel order={1} defaultSize={32} minSize={16} className="min-h-0">
            <section className="bg-white bt-shadow overflow-hidden flex flex-col min-w-0 h-full min-h-0">
              <ColHeader title="상담사" icon={<Users className="size-5 text-[var(--color-bt-primary)]" />} />
              <div className="px-3 pb-2 flex-shrink-0">
                <TreeSelect
                  {...treeSelectLook}
                  className="w-full [&_.ant-select-suffix]:pointer-events-none"
                  placeholder="전체 상담그룹"
                  value={agentGroupFilter ?? ALL_VALUE}
                  onChange={(v) => setAgentGroupFilter(v == null || v === ALL_VALUE ? null : v)}
                  treeData={withAllRow(
                    '전체',
                    agents.length,
                    buildSelectTree(
                      agentGroupTree,
                      (n) => n.groupId,
                      (n) => n.children,
                      (n) => n.groupName,
                      (n) => n.agentCount,
                    ),
                  )}
                />
              </div>
              <SearchBox value={agentKw} onChange={setAgentKw} placeholder="이름·사번 검색" />
              <SelectAllBar
                total={filteredAgents.length}
                selectedCount={selectedAgentIds.length}
                checked={agentAllSelected}
                indeterminate={!agentAllSelected && filteredAgents.some((a) => selectedAgentIds.includes(a.agentId))}
                onToggle={toggleAllAgents}
                onClear={() => setSelectedAgentIds([])}
              />
              <div className="flex-1 overflow-y-auto">
                {agentsLoading ? (
                  <FallbackSpinner size={36} />
                ) : filteredAgents.length === 0 ? (
                  <EmptyRow text="조건에 맞는 상담사가 없습니다" />
                ) : (
                  filteredAgents.map((a) => {
                    const on = selectedAgentIds.includes(a.agentId);
                    return (
                      <ListRow key={a.agentId} on={on} onClick={() => toggleAgent(a.agentId)}>
                        <SelectBox checked={on} shape="square" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold truncate">
                            {a.agentName}
                            <span className="text-[11px] font-normal text-gray-400">{a.agentLoginId}</span>
                          </div>
                          <PathTrail path={a.groupId != null ? agentPathMap.get(a.groupId) : undefined} />
                        </div>
                        {(a.skillCount ?? 0) === 0 ? (
                          <span className={cn(CHIP, on ? 'bg-white text-gray-400' : 'bg-gray-100 text-gray-400')}>보유 스킬 없음</span>
                        ) : (
                          <HoverPop content={<AgentSkillsContent agentId={a.agentId} agentName={a.agentName} />}>
                            <span
                              className={cn(
                                CHIP,
                                'cursor-default',
                                on ? 'bg-[var(--color-bt-primary)] text-white' : 'bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]',
                              )}
                            >
                              보유 스킬 {a.skillCount}
                            </span>
                          </HoverPop>
                        )}
                      </ListRow>
                    );
                  })
                )}
              </div>
            </section>
          </Panel>

          <ColResizeHandle />

          {/* ── 열2: 스킬셋 ── */}
          <Panel order={2} defaultSize={32} minSize={16} className="min-h-0">
            <section className="bg-white bt-shadow overflow-hidden flex flex-col min-w-0 h-full min-h-0">
              <ColHeader title="스킬셋" icon={<Wrench className="size-5 text-[var(--color-bt-primary)]" />} />
              <div className="px-3 pb-2 flex-shrink-0">
                <TreeSelect
                  {...treeSelectLook}
                  className="w-full [&_.ant-select-suffix]:pointer-events-none"
                  placeholder="전체 업무그룹"
                  value={skillTreeFilter ?? ALL_VALUE}
                  onChange={(v) => setSkillTreeFilter(v == null || v === ALL_VALUE ? null : v)}
                  treeData={withAllRow(
                    '전체',
                    skillsets.length,
                    buildSelectTree(
                      skillGroupTree,
                      (n) => n.treeId,
                      (n) => n.children,
                      (n) => n.treeName,
                      (n) => n.skillsetCount,
                    ),
                  )}
                />
              </div>

              <SearchBox value={skillKw} onChange={setSkillKw} placeholder="스킬셋명 검색" />

              <SelectAllBar
                total={filteredSkillsets.length}
                selectedCount={selectedSkillsetIds.length}
                checked={skillAllSelected}
                indeterminate={!skillAllSelected && filteredSkillsets.some((s) => selectedSkillsetIds.includes(s.skillsetId))}
                onToggle={toggleAllSkillsets}
                onClear={() => setSelectedSkillsetIds([])}
              />
              <div className="flex-1 overflow-y-auto">
                {skillsetsLoading ? (
                  <FallbackSpinner size={36} />
                ) : filteredSkillsets.length === 0 ? (
                  <EmptyRow text="조건에 맞는 스킬셋이 없습니다" />
                ) : (
                  filteredSkillsets.map((s) => {
                    const on = selectedSkillsetIds.includes(s.skillsetId);
                    return (
                      <ListRow key={s.skillsetId} on={on} onClick={() => toggleSkillset(s.skillsetId)}>
                        <SelectBox checked={on} shape="square" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold truncate">
                            {s.skillsetName}
                            <Tag className="!m-0 !text-[10px] !leading-4 !px-1">{getMediaTypeName(s.mediaType)}</Tag>
                          </div>
                          <PathTrail path={s.treeId != null ? skillPathMap.get(s.treeId) : undefined} />
                        </div>
                        {s.agentCount === 0 ? (
                          <span className={cn(CHIP, on ? 'bg-white text-gray-400' : 'bg-gray-100 text-gray-400')}>보유 인원 없음</span>
                        ) : (
                          <HoverPop content={<SkillsetHoldersContent skillsetId={s.skillsetId} skillsetName={s.skillsetName} />}>
                            <span
                              className={cn(
                                CHIP,
                                'cursor-default',
                                on ? 'bg-[var(--color-bt-primary)] text-white' : 'bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]',
                              )}
                            >
                              보유 인원 {s.agentCount}명
                            </span>
                          </HoverPop>
                        )}
                      </ListRow>
                    );
                  })
                )}
              </div>
            </section>
          </Panel>

          <ColResizeHandle />

          {/* ── 열3: 실행 패널 ── */}
          <Panel order={3} defaultSize={36} minSize={22} className="min-h-0">
            <aside className="bt-shadow overflow-hidden flex flex-col h-full min-h-0 bg-[#fbfcfe]">{renderSkillsetRunner()}</aside>
          </Panel>
        </PanelGroup>
      </div>
    </ConfigProvider>
  );

  // ─── 실행 패널 — 스킬셋 모드 ────────────────────────────────────────────────
  function renderSkillsetRunner() {
    if (N === 0 || M === 0) {
      return (
        <EmptyRunner
          steps={[
            { done: N > 0, text: '스킬을 배정할 상담사를 선택하세요' },
            { done: M > 0, text: '상담사에게 배정할 스킬셋을 선택하세요' },
          ]}
          note="여기서 한 번에 배정·해제합니다"
        />
      );
    }
    return (
      <>
        <RunHead n={N} m={M} unit="건" eqLabel="배정 대상" eqValue={totalPairs} />
        <div className="flex-1 min-h-0 overflow-hidden px-4 py-3 flex flex-col gap-3">
          <ChipGroup label="상담사" items={selectedAgents.map((a) => ({ id: a.agentId, name: a.agentName }))} onRemove={toggleAgent} />
          <ChipGroup label="스킬셋" items={selectedSkillsets.map((s) => ({ id: s.skillsetId, name: s.skillsetName }))} onRemove={toggleSkillset} />

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="text-[12px] font-bold text-gray-400 tracking-wide mb-1.5 flex-shrink-0">스킬셋별 보유 인원 (선택 {N}명 기준)</div>
            <div className="border border-gray-200 rounded-lg overflow-y-auto flex-1 min-h-0">
              {selectedSkillsets.map((s) => {
                const have = coverageMap.get(s.skillsetId) ?? 0;
                return <CoverageRow key={s.skillsetId} name={s.skillsetName} have={have} total={N} />;
              })}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {newPairs > 0 ? (
              <HoverPop placement="left" content={<ImpactContent kind="new" agents={selectedAgents} skillsets={selectedSkillsets} />}>
                <div className="flex-1">
                  <ImpactCard tone="new" value={newPairs} label="새로 배정 가능" />
                </div>
              </HoverPop>
            ) : (
              <div className="flex-1">
                <ImpactCard tone="new" value={newPairs} label="새로 배정 가능" />
              </div>
            )}
            {existPairs > 0 ? (
              <HoverPop placement="left" content={<ImpactContent kind="exist" agents={selectedAgents} skillsets={selectedSkillsets} />}>
                <div className="flex-1">
                  <ImpactCard tone="exist" value={existPairs} label="이미 배정됨" />
                </div>
              </HoverPop>
            ) : (
              <div className="flex-1">
                <ImpactCard tone="exist" value={existPairs} label="이미 배정됨" />
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <PlInputs priority={priority} skillLevel={skillLevel} onPriority={setPriority} onSkillLevel={setSkillLevel} />
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button type="primary" block disabled={newPairs === 0 || busy} loading={granting} onClick={handleGrant}>
              새로 배정하기 · {newPairs}건
            </Button>
            <Button
              block
              type="primary"
              disabled={existPairs === 0 || busy}
              loading={updatingPl}
              onClick={handleUpdatePl}
              className={existPairs === 0 || busy ? undefined : '!bg-[#188a4c] !border-[#188a4c] hover:!bg-[#147a42] hover:!border-[#147a42]'}
            >
              우선순위·스킬레벨 수정 · {existPairs}건
            </Button>
            <Button block danger disabled={existPairs === 0 || busy} loading={revoking} onClick={handleRevoke}>
              배정 해제 · {existPairs}건
            </Button>
          </div>
        </div>
      </>
    );
  }
}

// ─── 프리젠테이션 하위 컴포넌트 ──────────────────────────────────────────────

/** 열 사이 드래그 리사이즈 핸들 (react-resizable-panels) */
function ColResizeHandle() {
  return (
    <PanelResizeHandle className="group relative flex w-3 items-center justify-center cursor-col-resize">
      <span className="w-[3px] h-10 rounded-full bg-gray-200 transition-colors group-hover:bg-[#405189] group-data-[resize-handle-state=drag]:bg-[#405189]" />
    </PanelResizeHandle>
  );
}

// 칩셋 공통 클래스 (원본 목업 skill-chip 톤)
// 고정 폭(최대 4자리 "보유 인원 9999명" 수용) + 중앙정렬 — 상태 무관 동일 크기
const CHIP = 'inline-flex items-center justify-center h-5 w-[92px] rounded-full text-[10.5px] font-semibold flex-shrink-0 whitespace-nowrap';

/** 리스트 행 칩 hover 팝오버 (지연 mount — 열릴 때만 content 마운트되어 쿼리 발화) */
function HoverPop({ content, children, placement = 'right' }: { content: ReactNode; children: ReactNode; placement?: 'right' | 'left' | 'top' | 'bottom' }) {
  return (
    <Popover trigger="hover" mouseEnterDelay={0.3} mouseLeaveDelay={0.1} placement={placement} arrow={false} content={content}>
      {children}
    </Popover>
  );
}

function TipShell({ title, count, unit, children }: { title: string; count: number; unit: string; children: ReactNode }) {
  return (
    <div className="min-w-[240px] max-w-[380px]">
      <div className="flex items-baseline gap-2 border-b border-gray-100 pb-1.5 mb-1.5">
        <span className="text-[12px] font-bold truncate">{title}</span>
        <span className="ml-auto flex-shrink-0 text-[10.5px] text-gray-400">
          {count}
          {unit}
        </span>
      </div>
      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">{children}</div>
    </div>
  );
}

function TipRow({ name, sub, priority, skillLevel }: { name: string; sub?: string | null; priority: number; skillLevel: number }) {
  return (
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-[11.5px] odd:bg-gray-50">
      <span className="min-w-0 flex-1 truncate font-semibold">
        {name}
        {sub && <span className="ml-1 font-normal text-gray-400">{sub}</span>}
      </span>
      <span className="flex-shrink-0 text-[10px] text-gray-400">
        우선 <b className="text-[11px] text-[#405189]">{priority}</b>
      </span>
      <span className="flex-shrink-0 text-[10px] text-gray-400">
        레벨 <b className="text-[11px] text-[#405189]">{skillLevel}</b>
      </span>
    </div>
  );
}

function TipState({ text }: { text: string }) {
  return <div className="min-w-[200px] px-2 py-3 text-center text-[11.5px] text-gray-400">{text}</div>;
}

/** 상담사 → 보유 스킬셋(P/L) */
function AgentSkillsContent({ agentId, agentName }: { agentId: number; agentName: string }) {
  const { data = [], isFetching } = useGetSkillsetsByAgent(agentId);
  if (isFetching && data.length === 0)
    return (
      <div className="min-w-[200px] py-3">
        <FallbackSpinner size={28} />
      </div>
    );
  if (data.length === 0) return <TipState text="보유 스킬셋 없음" />;
  const rows = [...data].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return (
    <TipShell title={agentName} count={data.length} unit="건 보유">
      {rows.map((r) => (
        <TipRow key={r.skillsetId} name={r.skillsetName} priority={r.priority ?? 0} skillLevel={r.skillLevel ?? 0} />
      ))}
    </TipShell>
  );
}

/** 스킬셋 → 보유 상담사(P/L) */
function SkillsetHoldersContent({ skillsetId, skillsetName }: { skillsetId: number; skillsetName: string }) {
  const { data = [], isFetching } = useGetAgentsBySkillset(skillsetId);
  if (isFetching && data.length === 0)
    return (
      <div className="min-w-[200px] py-3">
        <FallbackSpinner size={28} />
      </div>
    );
  if (data.length === 0) return <TipState text="보유 상담사 없음" />;
  const rows = [...data].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return (
    <TipShell title={skillsetName} count={data.length} unit="명 보유">
      {rows.map((r) => (
        <TipRow key={r.agentId} name={r.agentName ?? '-'} sub={r.agentLoginId} priority={r.priority ?? 0} skillLevel={r.skillLevel ?? 0} />
      ))}
    </TipShell>
  );
}

/**
 * 임팩트 카드(새로 배정 가능 / 이미 배정됨) hover 내용 — 상담사×스킬셋 조합 평면 나열.
 * 선택 스킬셋마다 배정 상담사 목록을 병렬 조회(캐시 공유)해, 선택 상담사와 대조하여 조합을 계산한다.
 */
function ImpactContent({
  kind,
  agents,
  skillsets,
}: {
  kind: 'new' | 'exist';
  agents: { agentId: number; agentName: string }[];
  skillsets: { skillsetId: number; skillsetName: string }[];
}) {
  const results = useGetAgentsBySkillsetMany(skillsets.map((s) => s.skillsetId));
  const loading = results.some((r) => r.isLoading);

  const combos: { key: string; label: string; priority?: number; skillLevel?: number }[] = [];
  skillsets.forEach((s, i) => {
    const holders = results[i]?.data ?? [];
    const holderMap = new Map(holders.map((h) => [h.agentId, h]));
    agents.forEach((a) => {
      const rec = holderMap.get(a.agentId);
      const base = { key: `${a.agentId}-${s.skillsetId}`, label: `${a.agentName} · ${s.skillsetName}` };
      if (kind === 'new' && !rec) combos.push(base);
      if (kind === 'exist' && rec) combos.push({ ...base, priority: rec.priority ?? 0, skillLevel: rec.skillLevel ?? 0 });
    });
  });

  if (loading && combos.length === 0)
    return (
      <div className="min-w-[200px] py-3">
        <FallbackSpinner size={28} />
      </div>
    );
  if (combos.length === 0) return <TipState text={kind === 'new' ? '새로 배정할 조합이 없습니다' : '이미 배정된 조합이 없습니다'} />;

  return (
    <TipShell title={kind === 'new' ? '새로 배정 가능' : '이미 배정됨'} count={combos.length} unit="건">
      {combos.map((c) => (
        <div key={c.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-[11.5px] odd:bg-gray-50">
          <span className="min-w-0 flex-1 truncate">{c.label}</span>
          {c.priority != null && (
            <>
              <span className="flex-shrink-0 text-[10px] text-gray-400">
                우선 <b className="text-[11px] text-[#405189]">{c.priority}</b>
              </span>
              <span className="flex-shrink-0 text-[10px] text-gray-400">
                레벨 <b className="text-[11px] text-[#405189]">{c.skillLevel}</b>
              </span>
            </>
          )}
        </div>
      ))}
    </TipShell>
  );
}

/** 그룹 전체경로 표기 — 루트 › … › 리프 */
function PathTrail({ path }: { path?: string[] }) {
  if (!path || path.length === 0) return <div className="text-[11px] italic text-gray-300 truncate">그룹 미지정</div>;
  return (
    <div className="flex items-center gap-1 text-[11px] text-gray-400 overflow-hidden">
      {path.map((seg, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && <span className="flex-shrink-0 text-gray-300">›</span>}
          <span className="truncate">{seg}</span>
        </span>
      ))}
    </div>
  );
}

function ColHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-2 flex-shrink-0">
      {icon}
      <span className="text-[15px] font-bold">{title}</span>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="px-3 pb-2 flex-shrink-0">
      <Input size="small" allowClear value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} prefix={<Search className="size-3.5 text-gray-400" />} />
    </div>
  );
}

function SelectAllBar({
  total,
  selectedCount,
  checked,
  indeterminate,
  onToggle,
  onClear,
}: {
  total: number;
  selectedCount: number;
  checked: boolean;
  indeterminate: boolean;
  onToggle: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2 border-b border-gray-200 text-[11px] text-gray-500 sticky top-0 bg-white z-[1] w-full text-left">
      {/* 전체 토글은 체크박스 정확 클릭 시에만 — 라벨 클릭으로는 동작 안 함 */}
      <button type="button" onClick={onToggle} aria-label="표시된 목록 전체 선택" className="flex-shrink-0 inline-flex">
        <SelectBox checked={checked} indeterminate={indeterminate} shape="square" />
      </button>
      <span className="flex-1">
        총 <b className="text-gray-700">{total}</b> / 선택 <b className="text-[var(--color-bt-primary)]">{selectedCount}</b>
      </span>
      {selectedCount > 0 && (
        <button type="button" onClick={onClear} className="flex-shrink-0 text-[11px] text-gray-400 hover:text-red-500">
          선택 해제
        </button>
      )}
    </div>
  );
}

function SelectBox({ checked, indeterminate, shape }: { checked: boolean; indeterminate?: boolean; shape: 'square' | 'circle' }) {
  const active = checked || indeterminate;
  return (
    <span
      className={[
        'size-[15px] flex-shrink-0 flex items-center justify-center border-[1.5px] transition-colors',
        shape === 'square' ? 'rounded' : 'rounded-full',
        active ? 'bg-[var(--color-bt-primary)] border-[var(--color-bt-primary)] text-white' : 'border-gray-300 text-transparent',
      ].join(' ')}
    >
      {checked && !indeterminate && <Check className="size-2.5" strokeWidth={3.5} />}
      {indeterminate && <span className="w-1.5 h-[2px] bg-white rounded" />}
      {shape === 'circle' && checked && <span className="size-[7px] rounded-full bg-white" />}
    </span>
  );
}

function ListRow({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 w-full px-4 py-2 text-left border-l-2 transition-colors',
        on ? 'bg-[var(--color-bt-primary-soft)] border-l-[var(--color-bt-primary)]' : 'border-l-transparent hover:bg-gray-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="py-8 text-center text-[12px] text-gray-400">{text}</div>;
}

function RunHead({ n, m, unit, eqLabel, eqValue }: { n: number; m: number; unit: string; eqLabel: string; eqValue: number }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 flex items-center gap-1.5 text-[13px] text-gray-500">
      <span className="flex items-center gap-1.5">
        <Users className="size-4 text-[var(--color-bt-primary)]" />
        <span className="text-2xl font-bold text-gray-800">{n}</span>명
      </span>
      <span className="text-gray-300 mx-1">×</span>
      <span className="flex items-center gap-1.5">
        <Wrench className="size-4 text-[var(--color-bt-primary)]" />
        <span className="text-2xl font-bold text-gray-800">{m}</span>
        {unit === '개' ? '개' : '건'}
      </span>
      <span className="ml-auto text-[12px]">
        {eqLabel} <b className="text-[#405189] text-[15px]">{eqValue}</b>건
      </span>
    </div>
  );
}

function EmptyRunner({ steps, note }: { steps: { done: boolean; text: string }[]; note: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
      {steps.map((s, i) => (
        <div key={i} className={`flex items-center justify-center gap-3 text-[15px] ${s.done ? 'text-gray-400' : 'text-gray-600'}`}>
          <span
            className={`size-7 flex-shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold ${
              s.done ? 'bg-[#188a4c] text-white' : 'bg-[#eef1fb] text-[#405189]'
            }`}
          >
            {s.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
          </span>
          <span>{s.text}</span>
        </div>
      ))}
      <div className="max-w-[280px] text-center text-[17px] font-semibold text-[#405189] mt-8">{note}</div>
    </div>
  );
}

function ChipGroup({ label, items, onRemove, max = 8 }: { label: string; items: { id: number; name: string }[]; onRemove: (id: number) => void; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <div>
      <div className="text-[12px] font-bold text-gray-400 tracking-wide mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((it) => (
          <span key={it.id} className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-full text-[12px] font-semibold bg-white border border-gray-200">
            {it.name}
            <button type="button" onClick={() => onRemove(it.id)} className="size-4 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50">
              <X className="size-2.5" strokeWidth={3} />
            </button>
          </span>
        ))}
        {items.length > max && <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[12px] text-gray-400">+{items.length - max}</span>}
      </div>
    </div>
  );
}

function CoverageRow({ name, have, total, bare }: { name: string; have: number; total: number; bare?: boolean }) {
  const full = have === total && total > 0;
  const pct = total > 0 ? (have / total) * 100 : 0;
  return (
    <div className={bare ? 'flex items-center gap-2' : 'flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 text-[12px]'}>
      <span className="flex-1 min-w-0 font-semibold truncate text-[12px]">{name}</span>
      <span className="w-[54px] h-1 bg-gray-200 rounded overflow-hidden flex-shrink-0">
        <span className={`block h-full rounded ${full ? 'bg-[#188a4c]' : 'bg-[#d97706]'}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`text-[12px] font-semibold w-[34px] text-right flex-shrink-0 ${full ? 'text-[#188a4c]' : 'text-gray-500'}`}>
        {have}/{total}
      </span>
    </div>
  );
}

function ImpactCard({ tone, value, label }: { tone: 'new' | 'exist'; value: number; label: string }) {
  const cls = tone === 'new' ? 'bg-[#eef1fb] text-[#405189]' : 'bg-[#eef8f1] text-[#188a4c]';
  return (
    <div className={`w-full rounded-lg px-3 py-2.5 text-center cursor-default ${cls}`}>
      <div className="text-lg font-bold">{value}건</div>
      <div className="text-[12px] opacity-80 mt-0.5">{label}</div>
    </div>
  );
}

function PlInputs({
  priority,
  skillLevel,
  onPriority,
  onSkillLevel,
}: {
  priority: number;
  skillLevel: number;
  onPriority: (v: number) => void;
  onSkillLevel: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex gap-2.5">
        <label className="flex-1">
          <div className="text-[12px] font-semibold text-gray-500 mb-1">우선순위 (0–9)</div>
          <InputNumber min={0} max={9} value={priority} onChange={(v) => onPriority(v ?? 0)} className="!w-full" />
        </label>
        <label className="flex-1">
          <div className="text-[12px] font-semibold text-gray-500 mb-1">스킬레벨 (0–99)</div>
          <InputNumber min={0} max={99} value={skillLevel} onChange={(v) => onSkillLevel(v ?? 0)} className="!w-full" />
        </label>
      </div>
      <div className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">위 값은 [새로 배정하기]·[우선순위·스킬레벨 수정] 실행 시 적용됩니다.</div>
    </div>
  );
}
