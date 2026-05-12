/**
 * IVR Step Tree — TB_DM_IR_TRACKINGDATA 기반 시나리오 진행 트리.
 *
 * SD-CALL-TRACKING.md § 7.3:
 *  - 한 UCID에 여러 시나리오(CDR_PKEY)가 있으면 시나리오 단위로 그룹핑
 *  - NodeType별 아이콘/컬러
 *  - DTMF 입력값/멘트명/종료사유 표시
 *  - "대화 탭"은 hasVoiceRecognition === true인 시나리오에서만 활성
 */
import { useState } from 'react';
import { Empty } from 'antd';
import type { IvrNodeType, IvrScenarioGroup, IvrStep } from '../types/tracking.types';

interface Props {
  groups: IvrScenarioGroup[];
  loading?: boolean;
}

const NODE_STYLE: Record<IvrNodeType, { bg: string; fg: string; emoji: string; label: string }> = {
  START: { bg: 'bg-green-100', fg: 'text-green-700 border border-green-300', emoji: '▶', label: '시작' },
  MENU: { bg: 'bg-violet-100', fg: 'text-violet-700', emoji: '📋', label: '메뉴' },
  GETDIGIT: { bg: 'bg-blue-100', fg: 'text-blue-700', emoji: '⌨', label: 'DTMF 입력' },
  MENT: { bg: 'bg-emerald-100', fg: 'text-emerald-700', emoji: '🔊', label: '멘트' },
  CTI: { bg: 'bg-amber-100', fg: 'text-amber-700', emoji: '🔀', label: 'CTI 호전환' },
  QUERY: { bg: 'bg-indigo-100', fg: 'text-indigo-700', emoji: '🔍', label: '외부 조회' },
  VOICE_RECOGNINE: { bg: 'bg-pink-100', fg: 'text-pink-700', emoji: '💬', label: '음성 인식 (STT)' },
  DISCONNECT: { bg: 'bg-red-100', fg: 'text-red-700', emoji: '🚪', label: '종료' },
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
          <span className="text-[12px] font-semibold text-gray-900">{step.menuId || style.label}</span>
          <span className="text-[10px] text-gray-400 font-mono">{fmtTime(step.enterTime)}</span>
          {step.durationSec != null && step.durationSec > 0 && <span className="text-[10px] text-gray-400">· {step.durationSec}s 머무름</span>}
          <span className="text-[10px] text-gray-400">TYPE={step.rawType}</span>
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

function ScenarioGroupCard({ group, defaultOpen }: { group: IvrScenarioGroup; defaultOpen: boolean }) {
  const [activeTab, setActiveTab] = useState<'flow' | 'dialog'>('flow');
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  return (
    <div className="border border-gray-200 rounded-md mb-3 last:mb-0 overflow-hidden">
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
                <div>
                  {group.steps.map((s, i) => (
                    <StepRow key={s.stepId} step={s} isLast={i === group.steps.length - 1} />
                  ))}
                </div>
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

export default function IvrStepTree({ groups, loading }: Props) {
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
  return (
    <div className="px-3 py-3">
      {groups.map((g, i) => (
        <ScenarioGroupCard key={g.cdrPkey} group={g} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
