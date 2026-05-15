/**
 * 통합 콜트래킹 — 콜 상세 페이지 (route: /ipron/tracking/call/:ucid)
 *
 * prototype-call-detail.html § "본문 3분할" 톤:
 *  - 상단 헤더 카드 (CallSummaryHeader)
 *  - 시간 재생 슬라이더 (Phase 1: 정적, Phase 2 동기화)
 *  - 본문 3분할: 좌 타임라인 / 우상 CallFlow / 우하 IVR/CTI/Agent 탭
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Slider, Tabs, message } from 'antd';
import { ChevronLeft, Pause, Play, SkipBack } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import AgentEventTimeline from './AgentEventTimeline';
import CallFlowDiagram from './CallFlowDiagram';
import CallSummaryHeader from './CallSummaryHeader';
import CtiRoutingTimeline from './CtiRoutingTimeline';
import IvrStepTree from './IvrStepTree';
import RecordingButton from './RecordingButton';
import { useGetAgentEvents, useGetCtiRouting, useGetIvrSteps, useGetTrackingDetail } from '../hooks/useTrackingQueries';
import type { CallSegment } from '../types/tracking.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// TODO Phase 2: shared-store에서 권한 헬퍼가 추가되면 교체
function useHasPermission(authKey: string): boolean {
  void authKey;
  return false;
}

const SEGMENT_META: Record<CallSegment['kind'], { emoji: string; label: string; dot: string; ring: string; accent: string }> = {
  INBOUND: { emoji: '📥', label: '인입', dot: 'bg-violet-500', ring: 'ring-violet-300', accent: '#8b5cf6' },
  IVR: { emoji: '🤖', label: 'IVR', dot: 'bg-violet-600', ring: 'ring-violet-300', accent: '#7c3aed' },
  CTI: { emoji: '🔀', label: 'CTI', dot: 'bg-amber-500', ring: 'ring-amber-300', accent: '#f59e0b' },
  AGENT: { emoji: '🎧', label: '상담', dot: 'bg-emerald-500', ring: 'ring-emerald-300', accent: '#10b981' },
  DISCONNECT: { emoji: '📤', label: '종료', dot: 'bg-slate-400', ring: 'ring-slate-300', accent: '#94a3b8' },
  OTHER: { emoji: '•', label: '기타', dot: 'bg-gray-400', ring: 'ring-gray-300', accent: '#9ca3af' },
};

const fmtTime = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const fmtDeltaSec = (totalStart: string, atIso: string | null): string => {
  if (!atIso) return '+0s';
  const start = new Date(totalStart).getTime();
  const at = new Date(atIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(at)) return '-';
  const sec = Math.max(0, Math.floor((at - start) / 1000));
  if (sec < 60) return `+${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `+${m}:${String(s).padStart(2, '0')}`;
};

const fmtSec = (sec: number | null | undefined): string => {
  if (sec == null || sec === 0) return '';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

const subLabel = (seg: CallSegment): string => {
  const queue = seg.meta?.queueName as string | undefined;
  const agent = seg.meta?.agentName as string | undefined;
  const service = seg.meta?.serviceName as string | undefined;
  if (seg.kind === 'CTI' && queue) return queue;
  if (seg.kind === 'AGENT' && agent) return agent;
  if (seg.kind === 'IVR' && service) return service;
  if (seg.label) {
    const stripped = seg.label.replace(/^.+ · /, '');
    if (stripped !== seg.label && stripped.length > 0) return stripped;
    if (seg.label.length <= 22) return seg.label;
  }
  return 'segment';
};

export default function CallDetailPage() {
  const navigate = useNavigate();
  const { ucid } = useParams<{ ucid: string }>();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ivr' | 'cti' | 'agent'>('ivr');
  const [playbackSec, setPlaybackSec] = useState<number>(0);

  // 권한
  const canListen = useHasPermission('ipron:tracking:listen-recording');
  const canRequestUnmask = useHasPermission('mask:request:phone');

  // 상세 + 부속 데이터
  const detailQ = useGetTrackingDetail(ucid);
  const ivrQ = useGetIvrSteps(ucid);
  const ctiNexthop = useMemo(() => {
    if (!selectedSegmentId) return null;
    const parts = selectedSegmentId.split('-');
    if (parts.length < 2 || parts[0] !== 'IR') return null;
    const hop = Number(parts[1]);
    return Number.isFinite(hop) ? String(hop) : null;
  }, [selectedSegmentId]);
  const ctiQ = useGetCtiRouting(ucid, ctiNexthop);
  const agentQ = useGetAgentEvents(ucid);

  const breadcrumb = useMemo(
    () => [
      { title: 'IPRON', path: '/ipron' },
      { title: '콜 분석', path: '/ipron/tracking' },
      { title: '통합 콜트래킹', path: '/ipron/tracking' },
      { title: ucid ? `UCID ${ucid.slice(0, 8)}...` : '콜 상세', path: '#' },
    ],
    [ucid],
  );

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [breadcrumb, setBreadcrumb, clearBreadcrumb]);

  const segments = detailQ.data?.segments ?? [];
  const header = detailQ.data?.header;

  useEffect(() => {
    if (segments.length > 0 && !selectedSegmentId) {
      const ivr = segments.find((s) => s.kind === 'IVR');
      setSelectedSegmentId((ivr ?? segments[0]).segmentId);
    }
  }, [segments, selectedSegmentId]);

  useEffect(() => {
    const seg = segments.find((s) => s.segmentId === selectedSegmentId);
    if (!seg) return;
    if (seg.kind === 'IVR') setActiveTab('ivr');
    else if (seg.kind === 'CTI') setActiveTab('cti');
    else if (seg.kind === 'AGENT') setActiveTab('agent');
  }, [segments, selectedSegmentId]);

  const selectedSegment = useMemo(() => segments.find((s) => s.segmentId === selectedSegmentId) ?? null, [segments, selectedSegmentId]);

  const totalDurationSec = header?.durationSec ?? 0;
  const startIso = header?.startTime ?? '';

  if (detailQ.isLoading) return <FallbackSpinner />;
  if (detailQ.isError || !header) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <div className="bg-white rounded-md border border-gray-200 p-8 text-center shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
          <div className="text-[14px] text-red-600 mb-3">콜 상세 정보를 불러올 수 없습니다.</div>
          <Button onClick={() => navigate('/ipron/tracking')}>← 검색으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const fmtTotal = `${Math.floor(totalDurationSec / 60)}:${String(totalDurationSec % 60).padStart(2, '0')}`;
  const fmtPlayback = `${Math.floor(playbackSec / 60)}:${String(playbackSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* 뒤로가기 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="small" icon={<ChevronLeft className="size-3.5" />} onClick={() => navigate('/ipron/tracking')}>
            검색으로
          </Button>
        </div>

        <CallSummaryHeader
          header={header}
          canRequestUnmask={canRequestUnmask}
          onRequestUnmask={() => message.info('마스킹 해제 요청은 Phase 2에서 활성화됩니다.')}
          onExport={() => message.info('엑셀 내보내기는 Phase 2에서 활성화됩니다.')}
        />

        {/* 시간 재생 슬라이더 (Phase 1: 정적) */}
        <div className="bg-white rounded-md border border-gray-200 px-5 py-3 flex-shrink-0 shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-tight text-gray-800 whitespace-nowrap inline-flex items-center gap-1.5">
              <span aria-hidden>⏱</span>
              시간 재생
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                disabled
                title="처음으로 (Phase 2)"
                className="size-7 inline-flex items-center justify-center rounded text-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                <SkipBack className="size-3.5" />
              </button>
              <button
                type="button"
                disabled
                title="재생 (Phase 2)"
                className="size-7 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#5466a0] to-[#405189] text-white shadow-sm opacity-60 cursor-not-allowed"
              >
                <Play className="size-3" />
              </button>
            </div>
            <span className="text-[10.5px] text-gray-400 font-mono tabular-nums w-10 text-right">{fmtPlayback}</span>
            <Slider
              min={0}
              max={Math.max(totalDurationSec, 1)}
              value={playbackSec}
              onChange={setPlaybackSec}
              tooltip={{ formatter: (v) => `+${v}s` }}
              className="flex-1"
              disabled
            />
            <span className="text-[10.5px] text-gray-400 font-mono tabular-nums w-10">{fmtTotal}</span>
            <span className="text-[10px] text-gray-400 ml-2 hidden lg:inline">Phase 2 — IVR/CTI/Agent 동기화 재생</span>
          </div>
        </div>

        {/* 본문 3분할 */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* 좌: 이벤트 타임라인 */}
          <div className="w-[280px] bg-white rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
            <div className="h-[50px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white to-gray-50/60">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold tracking-tight text-gray-800">이벤트 타임라인</span>
              </div>
              <span className="text-[10.5px] text-gray-400 font-mono">
                <span className="font-semibold text-gray-600 tabular-nums">{segments.length}</span> 개
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1.5">
              {segments.length === 0 ? (
                <div className="px-4 py-8 text-[12px] text-gray-400 text-center">segment 없음</div>
              ) : (
                segments.map((seg) => {
                  const meta = SEGMENT_META[seg.kind];
                  const isActive = selectedSegmentId === seg.segmentId;
                  const isError = !!seg.isError;
                  const dur = fmtSec(seg.durationSec);
                  return (
                    <button
                      key={seg.segmentId}
                      type="button"
                      onClick={() => setSelectedSegmentId(seg.segmentId)}
                      className={`w-full text-left px-3 py-2.5 border-l-2 transition-all relative group ${
                        isActive ? 'bg-[#EEF2FF] border-l-[#405189]' : 'border-l-transparent hover:bg-[#F5F8FF]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full inline-block flex-shrink-0 ${meta.dot} ${
                            isActive ? `ring-2 ring-offset-1 ${meta.ring}` : ''
                          } ${isError ? '!bg-red-500' : ''}`}
                        />
                        <span className="text-[11.5px] font-mono font-semibold text-gray-900 tabular-nums">{fmtTime(seg.startTime)}</span>
                        <span className="text-[10px] text-gray-400 font-mono ml-auto">{fmtDeltaSec(startIso, seg.startTime)}</span>
                      </div>
                      <div className="ml-4 mt-1 flex items-baseline gap-1.5">
                        <span aria-hidden className="text-[12px] leading-none">
                          {meta.emoji}
                        </span>
                        <span className={`text-[11.5px] font-medium ${isError ? 'text-red-700' : 'text-gray-800'}`}>{meta.label}</span>
                        <span className={`text-[11px] truncate ${isError ? 'text-red-600/80' : 'text-gray-500'}`} title={subLabel(seg)}>
                          {subLabel(seg)}
                        </span>
                      </div>
                      {dur && <div className="ml-4 mt-0.5 text-[10px] text-gray-400 font-mono tabular-nums">{dur}</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 우: CallFlow + 탭 (상하 분할) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-4">
            <CallFlowDiagram segments={segments} selectedSegmentId={selectedSegmentId} onSelect={setSelectedSegmentId} />
            <div className="bg-white rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
              <div className="h-[50px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white to-gray-50/60">
                <Tabs
                  activeKey={activeTab}
                  onChange={(k) => setActiveTab(k as 'ivr' | 'cti' | 'agent')}
                  size="small"
                  className="-mb-3"
                  items={[
                    { key: 'ivr', label: '🤖 IVR Steps' },
                    { key: 'cti', label: '🔀 CTI Routing' },
                    { key: 'agent', label: '🎧 Agent 이벤트' },
                  ]}
                />
                {selectedSegment?.kind === 'AGENT' && (
                  <RecordingButton
                    ucid={header.ucid}
                    userid={selectedSegment.meta?.agentId != null ? String(selectedSegment.meta.agentId) : header.agentId}
                    canListen={canListen}
                  />
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'ivr' && <IvrStepTree groups={ivrQ.data ?? []} loading={ivrQ.isLoading} />}
                {activeTab === 'cti' && <CtiRoutingTimeline hops={ctiQ.data ?? []} loading={ctiQ.isLoading} />}
                {activeTab === 'agent' && <AgentEventTimeline events={agentQ.data ?? []} loading={agentQ.isLoading} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
