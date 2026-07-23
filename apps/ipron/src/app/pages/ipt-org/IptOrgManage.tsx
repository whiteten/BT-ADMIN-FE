/**
 * IPT 조직도관리 (AS-IS SWAT IPR20S2056).
 *
 * 좌측 조직 트리 + 우측 선택 조직 상세 패널 + 하위 조직 정렬(위/아래 이동 → 일괄 저장).
 * 조직 CRUD 는 트리 hover 액션(하위추가/수정/삭제) + 트리 헤더의 [조직 추가](최상위 등록).
 * 부모 이동(조직 이동)은 레거시와 동일하게 미지원 — 형제 간 순서 변경만 가능.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag } from 'antd';
import { ArrowDown, ArrowUp, FolderPlus, Save, Users } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IptOrgFormDrawer, { type IptOrgFormDrawerRef } from '../../features/ipt-org/components/IptOrgFormDrawer';
import IptOrgTree from '../../features/ipt-org/components/IptOrgTree';
import { useDeleteIptOrg, useGetIptOrg, useGetIptOrgTenants, useGetIptOrgTree, useUpdateIptOrgSortSeq } from '../../features/ipt-org/hooks/useIptOrgQueries';
import type { IptOrgTreeNode } from '../../features/ipt-org/types';
import { groupTreeByTenant } from '../../features/ipt-org/utils/groupTreeByTenant';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: 'IPT 서비스' }, { title: 'IPT 조직도관리', path: '/ipron/ipt-org' }];

/** 트리에서 dnGroupId 노드 탐색 */
function findNode(nodes: IptOrgTreeNode[], id: number): IptOrgTreeNode | null {
  for (const n of nodes) {
    if (n.dnGroupId === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

export default function IptOrgManage() {
  const modal = useModal();
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  /** 하위 조직 정렬 편집 상태 — 선택 조직의 직계 자식 순서 */
  const [sortRows, setSortRows] = useState<IptOrgTreeNode[]>([]);
  const [sortDirty, setSortDirty] = useState(false);

  const drawerRef = useRef<IptOrgFormDrawerRef>(null);

  // ─── 스코프 (agent-master 정합) ─────────────────────────────────────────
  // 일반 콘솔 = JWT 활성 테넌트 / 운영자 모드 = 대행 테넌트(null=전체 view-all, 서버가 토큰으로 판정)
  const ctxTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t ? Number(t) : null;
  });
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const opTenantId = actAsTenantId ? Number(actAsTenantId) : null;
  const viewAll = operatorMode && opTenantId == null;
  // 조회 스코프: 일반=활성테넌트 / 운영자=대행테넌트(null=전체) — agent-master selectedTenantId 정합.
  // 관리자 계정은 BE 가 role 기준으로 전체를 돌려주므로, 일반 콘솔에서는 FE 가 tenantId 로 반드시 좁힌다.
  const selectedTenantId = operatorMode ? opTenantId : ctxTenantId;
  // 운영자 전체 모드에서 합성 테넌트 노드 클릭으로 좁히는 "보기 필터"(대행 상태 불변)
  const [treeTenantId, setTreeTenantId] = useState<number | null>(null);

  const { data: tree = [], isLoading: isTreeLoading } = useGetIptOrgTree({ params: { tenantId: selectedTenantId ?? undefined } });

  // 운영자 모드 ScopeSelect 옵션 — 전용 통계 API (활성 테넌트 전체, 조직 없는 테넌트도 노출)
  const { data: operatorTenants = [] } = useGetIptOrgTenants({ queryOptions: { enabled: operatorMode } });
  const tenantOptions = useMemo(() => operatorTenants.map((t) => ({ id: t.tenantId, name: t.tenantName ?? `테넌트 ${t.tenantId}`, count: t.userCnt })), [operatorTenants]);

  // 트리 표시 — 운영자 전체 모드는 "테넌트 → 조직" 2단 합성 (agent-master displayGroupTree 패턴)
  const visibleTree = useMemo(() => {
    if (viewAll) return groupTreeByTenant(tree);
    return tree;
  }, [tree, viewAll]);

  const selectedNode = useMemo(() => (selectedOrgId == null ? null : findNode(tree, selectedOrgId)), [tree, selectedOrgId]);

  const { data: detail, isLoading: isDetailLoading } = useGetIptOrg(selectedOrgId);

  // 선택 조직 변경/트리 갱신 → 정렬 편집 상태 초기화
  useEffect(() => {
    setSortRows(selectedNode?.children ?? []);
    setSortDirty(false);
  }, [selectedNode]);

  const { mutate: deleteOrg } = useDeleteIptOrg({
    mutationOptions: {
      onSuccess: () => {
        toast.success('조직이 삭제되었습니다.');
        setSelectedOrgId(null);
      },
    },
  });
  const { mutate: saveSortSeq, isPending: isSavingSort } = useUpdateIptOrgSortSeq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('정렬순서가 저장되었습니다.');
        setSortDirty(false);
      },
    },
  });

  const handleDeleteOrg = (org: IptOrgTreeNode) => {
    modal.confirm.delete({
      onOk: () => deleteOrg(org.dnGroupId),
    });
  };

  const handleMoveRow = (index: number, dir: -1 | 1) => {
    setSortRows((prev) => {
      const next = [...prev];
      const to = index + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
    setSortDirty(true);
  };

  const handleSaveSort = () => {
    if (!selectedNode) return;
    saveSortSeq({
      tenantId: selectedNode.tenantId,
      items: sortRows.map((r, i) => ({ dnGroupId: r.dnGroupId, sortSeq: i + 1 })),
    });
  };

  /** 조직 추가(최상위) 대상 테넌트 — 일반=활성, 대행=대행, 전체=보기필터/선택조직 테넌트 (없으면 안내) */
  const resolveCreateTenantId = (): number | null => {
    if (!operatorMode) return ctxTenantId;
    if (opTenantId != null) return opTenantId;
    return treeTenantId ?? selectedNode?.tenantId ?? null;
  };

  const handleAddRoot = () => {
    const tid = resolveCreateTenantId();
    if (!tid) {
      toast.warning('전체 모드에서는 트리에서 테넌트를 먼저 선택하세요.');
      return;
    }
    drawerRef.current?.openCreate(tid, null);
  };

  const totalOrgCount = useMemo(() => {
    const count = (nodes: IptOrgTreeNode[]): number => nodes.reduce((s, n) => s + (n._scopeKind === 'tenant' ? 0 : 1) + count(n.children ?? []), 0);
    return count(visibleTree);
  }, [visibleTree]);
  const totalUserCount = useMemo(() => visibleTree.reduce((s, n) => s + (n.userCount ?? 0), 0), [visibleTree]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ===== 박스 1: 헤더 — (운영자) 대행 테넌트 + 요약 (agent-master 정합, 화면명은 브레드크럼이 표기) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="flex items-center px-4 h-[56px]">
          {operatorMode && (
            <ScopeSelect
              kind="tenant"
              options={tenantOptions}
              value={actAsTenantId}
              onChange={(id) => {
                setActAsTenant(id);
                setTreeTenantId(null);
                setSelectedOrgId(null);
              }}
            />
          )}
          <div className={`flex items-center gap-4 text-[13px] ${operatorMode ? 'ml-3 pl-3 border-l border-gray-200' : ''}`}>
            <span className="text-gray-500">
              총 조직 <b className="text-gray-800 font-semibold">{totalOrgCount.toLocaleString()}</b>
            </span>
            <span className="text-gray-500">
              소속 사용자 <b className="text-gray-800 font-semibold">{totalUserCount.toLocaleString()}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* 좌: 조직 트리 — agent-master 트리 박스 정합 (헤더에 조직 추가) */}
        <div className="bg-white bt-shadow flex flex-col flex-shrink-0 overflow-hidden w-[340px]">
          <div className="flex items-center px-4 h-[44px] border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">조직</span>
            <div className="ml-auto">
              <Button type="primary" icon={<FolderPlus className="size-3.5" />} onClick={handleAddRoot}>
                조직 추가
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {isTreeLoading ? (
              <FallbackSpinner size={36} />
            ) : (
              <IptOrgTree
                tree={visibleTree}
                selectedOrgId={selectedOrgId}
                selectedTenantId={treeTenantId}
                hideAllRow
                onSelectOrg={setSelectedOrgId}
                onSelectTenant={(tid) => {
                  setTreeTenantId((cur) => (cur === tid ? null : tid));
                  setSelectedOrgId(null);
                }}
                onCreateChild={(parent) => {
                  const tid = parent?.tenantId ?? resolveCreateTenantId();
                  if (tid) drawerRef.current?.openCreate(tid, parent);
                  else toast.warning('전체 모드에서는 트리에서 테넌트를 먼저 선택하세요.');
                }}
                onEditOrg={(org) => {
                  setSelectedOrgId(org.dnGroupId);
                  // 상세 로드 후 열기 위해 detail 사용 — 트리 노드에는 멘트 정보가 없음
                  void (async () => {
                    const { iptOrgApi } = await import('../../features/ipt-org/api/iptOrgApi');
                    const full = await iptOrgApi.getDetail(org.dnGroupId);
                    drawerRef.current?.openEdit(full);
                  })();
                }}
                onDeleteOrg={handleDeleteOrg}
              />
            )}
          </div>
        </div>

        {/* 우: 상세 + 하위 조직 정렬 */}
        <div className="bg-white bt-shadow flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {!selectedOrgId && <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-bt-fg-muted)]">좌측 트리에서 조직을 선택하세요.</div>}
          {selectedOrgId && isDetailLoading && <FallbackSpinner size={36} />}
          {selectedOrgId && detail && (
            <div className="flex flex-col flex-1 min-h-0 overflow-auto">
              {/* 상세 헤더 */}
              <div className="flex items-center justify-between px-5 h-[52px] border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[15px] font-semibold text-gray-800 truncate">{detail.dnGrpName}</span>
                  <Tag color={detail.activateYn === 1 ? 'green' : 'default'}>{detail.activateYn === 1 ? '활성' : '비활성'}</Tag>
                  <span className="text-xs text-gray-400 truncate">{detail.orgPath}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => drawerRef.current?.openEdit(detail)}>수정</Button>
                  <Button danger onClick={() => selectedNode && handleDeleteOrg(selectedNode)}>
                    삭제
                  </Button>
                </div>
              </div>

              {/* 속성 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-5 py-4 text-[13px]">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">그룹발신 사용</span>
                  <span className="text-gray-800">{detail.grpAniYn === 1 ? `사용 (${detail.grpAniNo ?? '-'})` : '미사용'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">소속 사용자수</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[var(--color-bt-primary)] hover:underline"
                    onClick={() => navigate(`/ipron/ipt-user?dnGroupId=${detail.dnGroupId}`)}
                    title="IPT 사용자관리로 이동"
                  >
                    <Users className="size-3.5" />
                    {detail.userCount.toLocaleString()}명
                  </button>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">링백멘트</span>
                  <span className="text-gray-800">{detail.rbMentName ?? '미지정'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">보류멘트</span>
                  <span className="text-gray-800">{detail.mohMentName ?? '미지정'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">국선호 링백멘트</span>
                  <span className="text-gray-800">{detail.coRbMentName ?? '미지정'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-500">국선호 보류멘트</span>
                  <span className="text-gray-800">{detail.coMohMentName ?? '미지정'}</span>
                </div>
              </div>

              {/* 하위 조직 정렬 */}
              <div className="flex items-center justify-between px-5 h-[44px] border-t border-b border-gray-100 flex-shrink-0">
                <span className="text-[13px] font-semibold text-gray-700">하위 조직 정렬 ({sortRows.length})</span>
                <Button type="primary" icon={<Save className="size-3.5" />} disabled={!sortDirty} loading={isSavingSort} onClick={handleSaveSort}>
                  정렬 저장
                </Button>
              </div>
              <div className="px-5 py-3">
                {sortRows.length === 0 && <div className="py-6 text-center text-sm text-[var(--color-bt-fg-muted)]">하위 조직이 없습니다.</div>}
                {sortRows.map((row, i) => (
                  <div key={row.dnGroupId} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 hover:bg-gray-50">
                    <span className="w-7 text-center text-[11px] text-gray-400">{i + 1}</span>
                    <span className={`flex-1 text-[13px] truncate ${row.activateYn === 0 ? 'text-gray-400' : 'text-gray-800'}`}>{row.dnGrpName}</span>
                    <span className="text-[11px] text-gray-400">{row.userCount.toLocaleString()}명</span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => handleMoveRow(i, -1)}
                      className="w-6 h-6 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === sortRows.length - 1}
                      onClick={() => handleMoveRow(i, 1)}
                      className="w-6 h-6 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <IptOrgFormDrawer ref={drawerRef} />
    </div>
  );
}
