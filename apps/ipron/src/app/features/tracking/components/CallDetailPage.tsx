/**
 * 통합 콜트래킹 — 콜 상세 페이지 (route: /tracking/call/:ucid)
 *
 * 구조:
 *  - 상단 헤더: UCID/ANI/DNIS/시각/마스킹 해제 버튼
 *  - 시간 재생 슬라이더 (Phase 1: 정적 구조만 — 재생은 Phase 2)
 *  - 좌측 이벤트 타임라인 (segment 클릭 → 우측 패널 전환)
 *  - 우측 탭: IVR Steps / CTI Routing / Agent Events
 *  - 녹취 재생 버튼 (Agent segment 선택 시 활성)
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Slider, Tabs, message } from 'antd';
import { ChevronLeft } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import AgentEventTimeline from './AgentEventTimeline';
import CallSummaryHeader from './CallSummaryHeader';
import CtiRoutingTimeline from './CtiRoutingTimeline';
import IvrStepTree from './IvrStepTree';
import RecordingButton from './RecordingButton';
import { useGetAgentEvents, useGetCtiRouting, useGetIvrSteps, useGetTrackingDetail } from '../hooks/useTrackingQueries';
import type { CallSegment } from '../types/tracking.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// TODO Phase 2: shared-store에서 권한 헬퍼가 추가되면 교체
//   현재는 placeholder — 모든 사용자가 read 가능, listen-recording은 false 가정.
function useHasPermission(authKey: string): boolean {
  // TODO: useAuthStore의 userInfo.authKeys 등을 검사
  void authKey;
  return false;
}

const SEGMENT_LABEL: Record<CallSegment['kind'], { emoji: string; label: string; color: string }> = {
  INBOUND: { emoji: '📥', label: '인입', color: 'bg-purple-400' },
  IVR: { emoji: '🤖', label: 'IVR', color: 'bg-purple-400' },
  CTI: { emoji: '🔀', label: 'CTI 라우팅', color: 'bg-amber-400' },
  AGENT: { emoji: '🎧', label: '상담', color: 'bg-emerald-400' },
  DISCONNECT: { emoji: '📤', label: '종료', color: 'bg-gray-400' },
  OTHER: { emoji: '•', label: '기타', color: 'bg-gray-300' },
};

const fmtTime = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const fmtDeltaSec = (totalStart: string, atIso: string | null): string => {
  if (!atIso) return '-';
  const start = new Date(totalStart).getTime();
  const at = new Date(atIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(at)) return '-';
  const sec = Math.max(0, Math.floor((at - start) / 1000));
  if (sec < 60) return `+${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `+${m}:${String(s).padStart(2, '0')}`;
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
  const ctiQ = useGetCtiRouting(ucid, selectedSegmentId);
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

  // 첫 segment 자동 선택
  useEffect(() => {
    if (segments.length > 0 && !selectedSegmentId) {
      const ivr = segments.find((s) => s.kind === 'IVR');
      setSelectedSegmentId((ivr ?? segments[0]).segmentId);
    }
  }, [segments, selectedSegmentId]);

  // 선택된 segment 변경 시 탭 자동 전환
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
        <div className="bg-white bt-shadow rounded-md border border-gray-200 p-8 text-center">
          <div className="text-[14px] text-red-600 mb-3">콜 상세 정보를 불러올 수 없습니다.</div>
          <Button onClick={() => navigate('/tracking')}>← 검색으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* 뒤로가기 + 헤더 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="small" icon={<ChevronLeft className="size-3.5" />} onClick={() => navigate('/tracking')}>
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
        <div className="bg-white bt-shadow rounded-md border border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-gray-700 whitespace-nowrap">⏱ 시간 재생</span>
            <Button size="small" disabled title="Phase 2에서 활성화">
              ▶ 재생
            </Button>
            <span className="text-[10px] text-gray-400 font-mono w-10 text-right">0:00</span>
            <Slider
              min={0}
              max={Math.max(totalDurationSec, 1)}
              value={playbackSec}
              onChange={setPlaybackSec}
              tooltip={{ formatter: (v) => `+${v}s` }}
              className="flex-1"
              disabled
            />
            <span className="text-[10px] text-gray-400 font-mono w-12">
              {Math.floor(totalDurationSec / 60)}:{String(totalDurationSec % 60).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-gray-400 ml-2">Phase 2에서 IVR/CTI/Agent 동기화 재생</span>
          </div>
        </div>

        {/* 본문 3분할 */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* 좌: 이벤트 타임라인 */}
          <div className="w-[260px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="h-[44px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
              <div className="text-[13px] font-semibold text-gray-700">이벤트 타임라인</div>
              <span className="text-[10px] text-gray-400">{segments.length}개</span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {segments.length === 0 ? (
                <div className="px-4 py-8 text-[12px] text-gray-400 text-center">segment 없음</div>
              ) : (
                segments.map((seg) => {
                  const meta = SEGMENT_LABEL[seg.kind];
                  const isActive = selectedSegmentId === seg.segmentId;
                  return (
                    <button
                      key={seg.segmentId}
                      type="button"
                      onClick={() => setSelectedSegmentId(seg.segmentId)}
                      className={`w-full text-left px-3 py-2 border-l-2 transition-colors ${isActive ? 'bg-blue-50 border-l-blue-600' : 'border-l-transparent hover:bg-gray-50'}`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className={`size-1.5 rounded-full inline-block ${meta.color}`} />
                        <span className="text-[11px] font-semibold text-gray-900">{fmtTime(seg.startTime)}</span>
                        <span className="text-[10px] text-gray-400">{fmtDeltaSec(startIso, seg.startTime)}</span>
                      </div>
                      <div className={`text-[11px] ml-3.5 mt-0.5 truncate ${seg.isError ? 'text-red-700' : 'text-gray-700'}`}>
                        {meta.emoji} {seg.label}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 우: 탭 + 상세 */}
          <div className="flex-1 bg-white bt-shadow rounded-md border border-gray-200 flex flex-col min-w-0 min-h-0 overflow-hidden">
            <div className="h-[44px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
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
                <RecordingButton ucid={header.ucid} userid={selectedSegment.meta?.agentId != null ? String(selectedSegment.meta.agentId) : header.agentId} canListen={canListen} />
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
  );
}
