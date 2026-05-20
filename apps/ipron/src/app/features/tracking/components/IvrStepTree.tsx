/**
 * IVR Step Tree — TB_DM_IR_TRACKINGDATA 기반 시나리오 진행 트리.
 *
 * SD-CALL-TRACKING.md § 7.3:
 *  - 한 UCID에 여러 시나리오(CDR_PKEY)가 있으면 시나리오 단위로 그룹핑
 *  - NodeType별 아이콘/컬러
 *  - DTMF 입력값/멘트명/종료사유 표시
 *  - "대화 탭"은 hasVoiceRecognition === true인 시나리오에서만 활성
 */
import { useEffect, useRef, useState } from 'react';
import { Empty } from 'antd';
import type { IvrNodeType, IvrScenarioGroup, IvrStep } from '../types/tracking.types';

interface Props {
  groups: IvrScenarioGroup[];
  loading?: boolean;
  /** CallFlow 의 IVR segment 클릭 시 매칭되는 시나리오를 자동 펼침 + 강조 (segmentId='IR-{hop}-{cdrPkey}'). */
  selectedCdrPkey?: number | string | null;
}

// AS-IS getIvrTrackingTypeName 13 타입
const NODE_STYLE: Record<IvrNodeType, { bg: string; fg: string; emoji: string; label: string }> = {
  Menu: { bg: 'bg-violet-100', fg: 'text-violet-700', emoji: '📋', label: '메뉴' },
  GetDigit: { bg: 'bg-blue-100', fg: 'text-blue-700', emoji: '⌨', label: 'DTMF 입력' },
  Play: { bg: 'bg-emerald-100', fg: 'text-emerald-700', emoji: '🔊', label: '멘트 재생' },
  Packet: { bg: 'bg-sky-100', fg: 'text-sky-700', emoji: '📡', label: '전문 패킷' },
  Cti: { bg: 'bg-amber-100', fg: 'text-amber-700', emoji: '🔀', label: 'CTI 호전환' },
  Query: { bg: 'bg-indigo-100', fg: 'text-indigo-700', emoji: '🔍', label: '외부 조회' },
  Tracking: { bg: 'bg-zinc-100', fg: 'text-zinc-600', emoji: '📍', label: '트래킹' },
  UserDef: { bg: 'bg-slate-100', fg: 'text-slate-600', emoji: '📊', label: '메뉴 통계' },
  HA: { bg: 'bg-neutral-100', fg: 'text-neutral-500', emoji: '⏱', label: 'HA' },
  EndInfo: { bg: 'bg-red-100', fg: 'text-red-700', emoji: '🏁', label: '메뉴 종료' },
  PacketJson: { bg: 'bg-cyan-100', fg: 'text-cyan-700', emoji: '🧩', label: 'JSON 패킷' },
  RequestVARS: { bg: 'bg-teal-100', fg: 'text-teal-700', emoji: '📤', label: 'VARS 요청' },
  CollectDigit: { bg: 'bg-blue-100', fg: 'text-blue-700', emoji: '⌨', label: 'Collect Digit' },
  RequestHTTP: { bg: 'bg-sky-100', fg: 'text-sky-700', emoji: '🌐', label: 'HTTP 요청' },
  Pause: { bg: 'bg-neutral-100', fg: 'text-neutral-500', emoji: '⏸', label: '일시정지' },
  Resume: { bg: 'bg-neutral-100', fg: 'text-neutral-600', emoji: '▶️', label: '재개' },
  ShowChat: { bg: 'bg-emerald-100', fg: 'text-emerald-700', emoji: '💬', label: 'Chat 출력' },
  GetChat: { bg: 'bg-blue-100', fg: 'text-blue-700', emoji: '💭', label: 'Chat 입력' },
  OTHER: { bg: 'bg-gray-100', fg: 'text-gray-600', emoji: '•', label: '기타' },
};

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function StepRow({ step, isLast }: { step: IvrStep; isLast: boolean }) {
  const style = NODE_STYLE[step.type] ?? NODE_STYLE.OTHER;
  return (
    <div className="flex items-start gap-3 py-1.5 relative">
      <div className={`size-7 rounded-md flex items-center justify-center flex-shrink-0 z-10 text-[13px] ${style.bg} ${style.fg}`}>{style.emoji}</div>
      {!isLast && <div className="absolute left-3.5 top-9 bottom-0 w-px bg-gray-200" />}
      <div className="flex-1 pb-1.5 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.fg}`}>{style.label}</span>
          {step.menuId && step.menuId !== 'HA' && <span className="text-[12px] font-semibold text-gray-900">{step.menuId}</span>}
          <span className="text-[10px] text-gray-400 font-mono">{fmtTime(step.enterTime)}</span>
          {step.durationSec != null && step.durationSec > 0 && <span className="text-[10px] text-gray-500">· {step.durationSec}s</span>}
        </div>

        {step.dtmfInput && (
          <div className="text-[11px] text-gray-600 mt-0.5">
            고객 입력: <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{step.dtmfInput}</span>
            {step.branchLabel && <span className="text-gray-500"> → {step.branchLabel}</span>}
          </div>
        )}
        {step.sttResult && (
          <div className="text-[11px] text-gray-600 mt-0.5">
            STT: <span className="text-pink-700 italic">"{step.sttResult}"</span>
          </div>
        )}
        {step.queryResult && (
          <div className="text-[11px] text-gray-600 mt-0.5">
            조회 결과: <span className="font-mono">{step.queryResult}</span>
          </div>
        )}
        {step.endReason && <div className="text-[11px] text-red-600 mt-0.5">종료 사유: {step.endReason}</div>}
        {step.branchLabel && !step.dtmfInput && <div className="text-[11px] text-gray-500 mt-0.5">분기: {step.branchLabel}</div>}
        {step.mentName && <div className="mt-1 inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">🔊 {step.mentName}</div>}
      </div>
    </div>
  );
}

/**
 * AS-IS 규격: menuId 블록은 Menu(rawType=0) 진입 ~ EndInfo(rawType=9) 종료 쌍으로 닫힘.
 * menuId 가 연속되는 구간을 한 블록으로 묶고, 0/9는 블록 경계(헤더/푸터)로 흡수.
 * menuId="S" 는 시나리오 시작 마커.
 */
interface MenuBlock {
  menuId: string;
  enter: IvrStep | null; // Menu(0)
  end: IvrStep | null; // EndInfo(9)
  inner: IvrStep[]; // 0/9 제외 실제 처리 step
  startIso: string;
}

function groupByMenu(steps: IvrStep[]): MenuBlock[] {
  const blocks: MenuBlock[] = [];
  let cur: MenuBlock | null = null;
  for (const s of steps) {
    const mid = s.menuId || 'HA';
    if (!cur || cur.menuId !== mid) {
      cur = { menuId: mid, enter: null, end: null, inner: [], startIso: s.enterTime };
      blocks.push(cur);
    }
    if (s.rawType === 0) cur.enter = s;
    else if (s.rawType === 9) cur.end = s;
    else cur.inner.push(s);
  }
  return blocks;
}

function MenuBlockCard({ block, isLast }: { block: MenuBlock; isLast: boolean }) {
  const isStart = block.menuId === 'S';
  const enterT = block.enter ?? block.inner[0] ?? block.end;
  const dur = block.end?.durationSec ?? block.enter?.durationSec ?? null;
  const endReason = block.end?.endReason ?? null;
  return (
    <div className="relative pl-7 pb-2">
      {/* 블록 마커 */}
      <div
        className={`absolute left-0 top-1 size-6 rounded-md flex items-center justify-center text-[12px] z-10 ${
          isStart ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-violet-100 text-violet-700'
        }`}
      >
        {isStart ? '▶' : '📂'}
      </div>
      {!isLast && <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200" />}

      {/* 블록 헤더: menuId + 진입/종료 시각 + 결과 */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[12px] font-semibold text-gray-900">{isStart ? '시나리오 시작' : block.menuId}</span>
        {enterT && <span className="text-[10px] text-gray-400 font-mono">{fmtTime(enterT.enterTime)}</span>}
        {dur != null && dur > 0 && <span className="text-[10px] text-gray-500">· {dur}s</span>}
        {endReason && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              endReason.includes('포기') || endReason.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {endReason}
          </span>
        )}
      </div>

      {/* 블록 내부 처리 step */}
      {block.inner.length > 0 ? (
        <div className="mt-1.5 ml-1 border-l-2 border-gray-100 pl-3 space-y-0.5">
          {block.inner.map((s) => (
            <StepRow key={s.stepId} step={s} isLast />
          ))}
        </div>
      ) : (
        <div className="mt-1 ml-1 text-[10.5px] text-gray-400">처리 항목 없음 (진입 후 즉시 이동)</div>
      )}
    </div>
  );
}

function ScenarioGroupCard({ group, defaultOpen, highlighted }: { group: IvrScenarioGroup; defaultOpen: boolean; highlighted?: boolean }) {
  const [activeTab, setActiveTab] = useState<'flow' | 'dialog'>('flow');
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const cardRef = useRef<HTMLDivElement>(null);

  // 외부에서 highlight 되면 자동 펼침 + 스크롤
  useEffect(() => {
    if (highlighted) {
      setCollapsed(false);
      requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
  }, [highlighted]);

  return (
    <div
      ref={cardRef}
      className={`border rounded-md mb-3 last:mb-0 overflow-hidden transition-all ${highlighted ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200'}`}
    >
      {/* 그룹 헤더 */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 flex items-center gap-2 text-left"
      >
        <span className="text-[11px] text-gray-400">{collapsed ? '▶' : '▼'}</span>
        <span className="text-[14px]">📂</span>
        <span className="text-[12px] font-semibold text-gray-800">{group.scenarioName}</span>
        <span className="text-[10px] text-gray-400 font-mono">
          v{group.scenarioVersion ?? '?'} · CDR_PKEY {group.cdrPkey}
        </span>
        <span className="ml-auto text-[10px] text-gray-500">
          {group.steps.length} step · {group.durationSec ?? '?'}s
        </span>
        {group.hasVoiceRecognition && <span className="text-[9px] font-medium px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded">STT</span>}
      </button>

      {!collapsed && (
        <>
          {/* 탭 (시나리오 진행 / 대화) */}
          <div className="px-4 border-b border-gray-100 flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === 'flow' ? 'text-blue-700 border-blue-700' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              📋 시나리오 진행 ({group.steps.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dialog')}
              disabled={!group.hasVoiceRecognition}
              title={group.hasVoiceRecognition ? '대화 보기' : 'STT 시나리오에만 활성화됩니다'}
              className={`px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === 'dialog' && group.hasVoiceRecognition ? 'text-blue-700 border-blue-700' : 'text-gray-400 border-transparent disabled:cursor-not-allowed'
              }`}
            >
              💬 대화 {!group.hasVoiceRecognition && <span className="text-[9px] ml-1">(STT 시나리오만)</span>}
            </button>
          </div>

          {/* 본문 */}
          <div className="px-4 py-3">
            {activeTab === 'flow' ? (
              group.steps.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[11px]">step 데이터 없음</span>} />
              ) : (
                (() => {
                  const blocks = groupByMenu(group.steps);
                  return (
                    <div>
                      {blocks.map((b, i) => (
                        <MenuBlockCard key={`${b.menuId}-${i}`} block={b} isLast={i === blocks.length - 1} />
                      ))}
                    </div>
                  );
                })()
              )
            ) : (
              <div className="text-[11px] text-gray-500 py-4 text-center">대화 탭은 Phase 2에서 활성화됩니다.</div>
            )}

            {!group.hasVoiceRecognition && activeTab === 'flow' && (
              <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50 -mx-4 px-4 py-2 text-[10px] text-gray-500">
                💡 이 시나리오에는 음성 인식(VoiceRecogine) 노드가 없으므로 <strong>대화 탭은 비활성</strong>입니다.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function IvrStepTree({ groups, loading, selectedCdrPkey }: Props) {
  if (loading) {
    return <div className="p-4 text-[12px] text-gray-500">불러오는 중...</div>;
  }
  if (!groups || groups.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-[12px]">IVR 시나리오 진입 기록이 없습니다</span>} />
      </div>
    );
  }
  const targetKey = selectedCdrPkey != null ? String(selectedCdrPkey) : null;
  // 매칭되는 cdrPkey 시나리오를 기본 펼침, 없으면 첫 번째 펼침
  const hasMatch = targetKey != null && groups.some((g) => String(g.cdrPkey) === targetKey);
  return (
    <div className="px-3 py-3">
      {groups.map((g, i) => {
        const isHighlighted = targetKey != null && String(g.cdrPkey) === targetKey;
        const defaultOpen = hasMatch ? isHighlighted : i === 0;
        return <ScenarioGroupCard key={g.cdrPkey} group={g} defaultOpen={defaultOpen} highlighted={isHighlighted} />;
      })}
    </div>
  );
}
