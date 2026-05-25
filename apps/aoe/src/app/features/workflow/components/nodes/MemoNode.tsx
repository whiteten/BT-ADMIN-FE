import { memo, useEffect, useRef, useState } from 'react';
import { type NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';

/**
 * post-it 스타일 메모 노드.
 *
 * - 사용자가 캔버스에 자유롭게 메모를 적기 위한 노드. 다른 노드와 연결되지 않으며 (Handle 없음)
 *   BE 그래프에는 저장되지만 deploy JSON 에서는 제외되어야 함 (BE deploy mapper 에서 nodeKind === 'memo' skip 필요).
 * - 인라인 textarea 로 즉시 편집. blur 시 또는 600ms debounce 후 onMemoChange 호출.
 * - 색상 4종 선택 가능 (yellow / pink / blue / green). 선택된 노드일 때만 색상 dot · resize 핸들 노출.
 * - 크기 조절 가능 (NodeResizer). resize 종료 시 width/height 를 data 에 저장 → 새로고침 후 복원.
 */
export interface MemoNodeData {
  text?: string;
  color?: MemoColor;
  width?: number;
  height?: number;
  onMemoChange?: (nodeId: string, patch: { text?: string; color?: MemoColor; width?: number; height?: number }) => void;
}

export type MemoColor = 'yellow' | 'pink' | 'blue' | 'green';

const MEMO_COLORS: Record<MemoColor, { bg: string; border: string; dot: string }> = {
  yellow: { bg: '#FEF3C7', border: '#FBBF24', dot: '#FBBF24' },
  pink: { bg: '#FCE7F3', border: '#EC4899', dot: '#EC4899' },
  blue: { bg: '#DBEAFE', border: '#3B82F6', dot: '#3B82F6' },
  green: { bg: '#D1FAE5', border: '#10B981', dot: '#10B981' },
};

const DEFAULT_COLOR: MemoColor = 'yellow';
export const MEMO_DEFAULT_WIDTH = 200;
export const MEMO_DEFAULT_HEIGHT = 140;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 100;
const SAVE_DEBOUNCE_MS = 600;

const MemoNode = ({ id, data, selected }: NodeProps) => {
  const nodeData = data as MemoNodeData;
  const color: MemoColor = nodeData.color ?? DEFAULT_COLOR;
  const palette = MEMO_COLORS[color];

  const [draft, setDraft] = useState<string>(nodeData.text ?? '');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // 최신 값을 ref 로 추적 — unmount cleanup 에서 stale closure 없이 flush 가능.
  const draftRef = useRef(draft);
  const onMemoChangeRef = useRef(nodeData.onMemoChange);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    onMemoChangeRef.current = nodeData.onMemoChange;
  });

  // 외부에서 text 변경(예: undo/redo, BE refetch) 시 동기화 — 사용자 입력 중이 아닐 때만 반영
  useEffect(() => {
    if (!dirtyRef.current) setDraft(nodeData.text ?? '');
  }, [nodeData.text]);

  const flushSave = (text: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    dirtyRef.current = false;
    nodeData.onMemoChange?.(id, { text });
  };

  const scheduleSave = (text: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => flushSave(text), SAVE_DEBOUNCE_MS);
  };

  // unmount 시 미저장분 즉시 flush — id 는 stable 하므로 cleanup 은 사실상 unmount 시 한 번만 호출됨.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        if (dirtyRef.current) onMemoChangeRef.current?.(id, { text: draftRef.current });
      }
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    dirtyRef.current = true;
    setDraft(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (dirtyRef.current) flushSave(draft);
  };

  const handleColorChange = (next: MemoColor) => {
    if (next === color) return;
    nodeData.onMemoChange?.(id, { color: next });
  };

  // 외곽 div 는 ReactFlow 노드 컨테이너 (style.width/height) 를 100% fill — NodeResizer 가 컨테이너 사이즈 관리.
  // 우리가 div 에 직접 width/height 를 박으면 ResizeObserver 가 dimension mismatch 를 감지해 무한 loop 발생.

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        lineClassName="!border-transparent"
        handleStyle={{ width: 8, height: 8, background: palette.border, borderRadius: 2 }}
        onResizeEnd={(_, params) => {
          nodeData.onMemoChange?.(id, { width: Math.round(params.width), height: Math.round(params.height) });
        }}
      />
      <div
        className="rounded-md shadow-md transition-shadow flex flex-col w-full h-full"
        style={{
          backgroundColor: palette.bg,
          border: `1.5px solid ${selected ? palette.border : 'transparent'}`,
          boxShadow: selected ? `0 0 0 3px ${palette.border}33, 0 4px 12px rgba(15, 23, 42, 0.1)` : '0 2px 8px rgba(15, 23, 42, 0.1)',
        }}
      >
        {/* 헤더 — 색 선택 dot. selected 일 때만 노출. */}
        {selected && (
          <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 shrink-0">
            {(Object.keys(MEMO_COLORS) as MemoColor[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`색상 ${c}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorChange(c);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn('w-3.5 h-3.5 rounded-full transition-transform hover:scale-110', c === color && 'ring-2 ring-offset-1 ring-gray-700')}
                style={{ backgroundColor: MEMO_COLORS[c].dot }}
              />
            ))}
          </div>
        )}

        <textarea
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="메모를 입력하세요."
          className="flex-1 w-full bg-transparent border-0 outline-none resize-none text-sm text-gray-800 placeholder:text-gray-500 px-3 pb-3 pt-1 nodrag nowheel"
        />
      </div>
    </>
  );
};

MemoNode.displayName = 'MemoNode';

export default memo(MemoNode);
