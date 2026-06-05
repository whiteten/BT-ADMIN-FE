import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isMenuActive } from './PanelMenuPrimitives';
import { FavoriteButton } from '../components/FavoriteButton';
import { NewWindowButton } from '../components/NewWindowButton';
import type { MenuItem } from '@/libs/shared-store/src/types/menu.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

/** 좌측 리스트의 한 leaf 항목 (평탄화 결과) */
interface FlatLeaf {
  menuKey: string;
  label: string;
  desc?: string;
  path: string;
  /** 부모 폴더 라벨 체인(' › ' 연결). 2뎁스 leaf는 ''. */
  crumb: string;
}

/** 좌측 리스트 렌더 엔트리 — 그룹 헤더 또는 leaf 행 */
type ListEntry = { type: 'group'; label: string } | { type: 'leaf'; leaf: FlatLeaf };

/** 폴더 노드 아래의 모든 visible leaf를 순서대로 수집. crumb = chain 라벨들을 ' › '로 연결. */
function collectLeaves(node: MenuItem, chain: string[]): FlatLeaf[] {
  const out: FlatLeaf[] = [];
  for (const c of node.children ?? []) {
    if (c.hide) continue;
    if (c.children?.length) {
      out.push(...collectLeaves(c, [...chain, c.label]));
    } else if (c.path) {
      out.push({ menuKey: c.menuKey, label: c.label, desc: c.desc, path: c.path, crumb: chain.join(' › ') });
    }
    // path도 children도 없는 항목은 비활성 → 좌측 리스트에서 제외
  }
  return out;
}

/** 활성 1뎁스의 children을 좌측 리스트 엔트리 + 전체 leaf 목록(순서 보존)으로 평탄화 */
function buildEntries(menu: MenuItem): { entries: ListEntry[]; leaves: FlatLeaf[] } {
  const entries: ListEntry[] = [];
  const leaves: FlatLeaf[] = [];
  for (const c of menu.children ?? []) {
    if (c.hide) continue;
    if (c.children?.length) {
      // 2뎁스 폴더 → 그룹 헤더 + 하위 leaf 행들 (crumb은 폴더 라벨부터 시작)
      const groupLeaves = collectLeaves(c, [c.label]);
      if (!groupLeaves.length) continue;
      entries.push({ type: 'group', label: c.label });
      for (const leaf of groupLeaves) {
        entries.push({ type: 'leaf', leaf });
        leaves.push(leaf);
      }
    } else if (c.path) {
      // 2뎁스 leaf → 단독 행
      const leaf: FlatLeaf = { menuKey: c.menuKey, label: c.label, desc: c.desc, path: c.path, crumb: '' };
      entries.push({ type: 'leaf', leaf });
      leaves.push(leaf);
    }
  }
  return { entries, leaves };
}

interface PanelDetailSplitProps {
  menu: MenuItem;
  appId: string;
  onNavigate: (path: string) => void;
}

/**
 * 작게보기 폴더 detail의 「스플릿 프리뷰」 본문.
 * - 좌측: 활성 1뎁스 하위를 1줄 컴팩트 리스트로 (2뎁스 폴더는 그룹 라벨 + 3뎁스 행, 2뎁스 leaf는 단독 행)
 * - 우측: hover 중인 leaf의 경로/제목/전체 설명/큰 액션 버튼
 * - 행 hover로 우측 미리보기 갱신, 행 클릭으로 해당 페이지 이동
 */
const PanelDetailSplit = ({ menu, appId, onNavigate }: PanelDetailSplitProps) => {
  const location = useLocation();
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const { entries, leaves } = buildEntries(menu);

  // 기본 선택: 현재 URL과 매치되는 leaf, 없으면 첫 leaf.
  // previewKey(=hover로 선택)가 현재 메뉴에 존재하면 그것을 우선. 메뉴가 바뀌면 옛 key는 사라져 자동으로 default로 회귀.
  const defaultKey = (leaves.find((l) => isMenuActive(l.path, location, appId)) ?? leaves[0])?.menuKey ?? null;
  const activeKey = previewKey && leaves.some((l) => l.menuKey === previewKey) ? previewKey : defaultKey;
  const current = leaves.find((l) => l.menuKey === activeKey) ?? null;

  return (
    <div className="flex-1 min-h-0 flex">
      {/* 좌측 컴팩트 리스트 */}
      <div className="w-[300px] shrink-0 overflow-y-auto border-r border-[#e9ecef] p-3">
        {entries.map((entry, i) =>
          entry.type === 'group' ? (
            <p key={`g-${i}`} className="mt-3 mb-1.5 px-1.5 text-xs font-bold text-[#868e96] first:mt-0">
              {entry.label}
            </p>
          ) : (
            (() => {
              const { leaf } = entry;
              const isOn = leaf.menuKey === activeKey;
              const isUrlActive = isMenuActive(leaf.path, location, appId);
              return (
                <button
                  key={leaf.menuKey}
                  type="button"
                  onMouseEnter={() => setPreviewKey(leaf.menuKey)}
                  onClick={() => onNavigate(`/${appId}/${leaf.path}`)}
                  className={cn(
                    'group/row relative flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-left transition-colors cursor-pointer',
                    isOn ? 'bg-[var(--color-bt-primary)]/[0.08]' : 'hover:bg-[#f1f3f5]',
                    isUrlActive && 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-[var(--color-bt-primary)]',
                  )}
                >
                  <span className={cn('size-1.5 shrink-0 rounded-full', isOn ? 'bg-[var(--color-bt-primary)]' : 'bg-[#c0c7cf]')} />
                  <span className={cn('flex-1 min-w-0 truncate text-[13.5px]', isOn ? 'font-semibold text-[var(--color-bt-primary)]' : 'text-[#495057]')}>{leaf.label}</span>
                </button>
              );
            })()
          ),
        )}
      </div>

      {/* 우측 대형 프리뷰 */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-[#fcfdfe] px-7 py-6">
        {current ? (
          <>
            <p className="mb-2 text-xs text-[#868e96]">
              {current.crumb ? `${current.crumb} › ` : ''}
              {current.label}
            </p>
            <h2 className="mb-3 text-xl font-bold text-[#212529]">{current.label}</h2>
            <p className="max-w-[460px] whitespace-pre-wrap text-sm leading-7 text-[#495057]">{current.desc?.trim() ? current.desc : '(설명 없음)'}</p>
            <div className="my-5 border-t border-[#e9ecef]" />
            <div className="flex flex-wrap gap-2.5">
              <NewWindowButton path={current.path} appId={appId} labeled />
              <FavoriteButton menuKey={current.menuKey} label={current.label} path={current.path} appId={appId} labeled />
            </div>
          </>
        ) : (
          <p className="text-xs text-[#868e96]">메뉴를 선택하세요</p>
        )}
      </div>
    </div>
  );
};

export default PanelDetailSplit;
