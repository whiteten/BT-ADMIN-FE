/**
 * 통합 콜트래킹 — 콜 상세 페이지 (route: /ipron/tracking/call/:ucid)
 *
 * prototype-call-detail.html § "본문 3분할" 톤:
 *  - 상단 헤더 카드 (CallSummaryHeader)
 *  - 본문 3분할: 좌 타임라인 / 우상 CallFlow / 우하 IVR/CTI/Agent 탭
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Tabs, message } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import AgentEventTimeline from '../../features/tracking/components/AgentEventTimeline';
import CallFlowDiagram from '../../features/tracking/components/CallFlowDiagram';
import CallSummaryHeader from '../../features/tracking/components/CallSummaryHeader';
import CtiRoutingTimeline from '../../features/tracking/components/CtiRoutingTimeline';
import DialogView from '../../features/tracking/components/DialogView';
import IvrStepTree from '../../features/tracking/components/IvrStepTree';
import RecordingButton from '../../features/tracking/components/RecordingButton';
import { useGetAgentEvents, useGetCtiRouting, useGetDialogs, useGetIvrSteps, useGetTrackingDetail } from '../../features/tracking/hooks/useTrackingQueries';
import type { CallSegment } from '../../features/tracking/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// TODO Phase 2: shared-store에서 권한 헬퍼가 추가되면 교체
function useHasPermission(authKey: string): boolean {
  void authKey;
  return false;
}

const SEGMENT_META: Record<CallSegment['kind'], { emoji: string; label: string; dot: string; ring: string; accent: string }> = {
  INBOUND: { emoji: '📥', label: '인입', dot: 'bg-violet-500', ring: 'ring-violet-300', accent: '#8b5cf6' },
  OUTBOUND: { emoji: '📞', label: '발신', dot: 'bg-cyan-500', ring: 'ring-cyan-300', accent: '#06b6d4' },
  QUEUE_IN: { emoji: '📨', label: '큐 인입', dot: 'bg-sky-500', ring: 'ring-sky-300', accent: '#0ea5e9' },
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

export default function CallDetail() {
  const navigate = useNavigate();
  const { ucid } = useParams<{ ucid: string }>();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'ivr' | 'dialog' | 'cti' | 'agent'>('info');
  const [flowExpanded, setFlowExpanded] = useState(false);

  // 권한
  const canListen = useHasPermission('ipron:tracking:listen-recording');
  const canRequestUnmask = useHasPermission('mask:request:phone');

  // 상세 + 부속 데이터
  const detailQ = useGetTrackingDetail(ucid);
  const ivrQ = useGetIvrSteps(ucid);
  // HOP 노드 선택 시 그 hop 번호를 CTI route 조회 키(START_HOP)로 사용.
  const ctiNexthop = useMemo(() => {
    if (!selectedSegmentId) return null;
    const m = selectedSegmentId.match(/^HOP-(\d+)$/);
    return m ? m[1] : null;
  }, [selectedSegmentId]);
  const ctiQ = useGetCtiRouting(ucid, ctiNexthop);
  const agentQ = useGetAgentEvents(ucid);
  const dialogQ = useGetDialogs(ucid);

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

  // ── HOP 공통축 그룹핑 (사용자 도메인 통찰 기반) ──────────────────────────
  // 모든 CDR(IE/IR/IC)을 HOP 번호로 묶어 hop 단위 노드 1개로 표현.
  // 단계(kind) 판정: 첫 hop=INBOUND, 그 hop에 IC/IR 있으면 실제처리(CTI/IVR) 우선,
  // 없으면 IE.T_TYPE(3·4=IVR / 5·6=CTI / 2=AGENT), IE 없으면(IVR-front) children kind.
  const hopNodes = useMemo<CallSegment[]>(() => {
    if (segments.length === 0) return [];
    const groups = new Map<number, CallSegment[]>();
    for (const s of segments) {
      const h = Number(s.meta?._hop ?? 0);
      if (!groups.has(h)) groups.set(h, []);
      groups.get(h)!.push(s);
    }
    const sorted = [...groups.entries()].sort((a, b) => a[0] - b[0]);
    return sorted.map(([hopNo, segs], idx) => {
      // IE 가 여러 row 면 전환성 T_TYPE(3=IVR/4=IVR큐/5=CTI큐/6=ACD큐) 을 대표로 우선 (없으면 첫 IE)
      const ieRows = segs.filter((s) => s.meta?._segType === 'IE');
      const ie = ieRows.find((s) => [3, 4, 5, 6].includes(Number(s.meta?._tType))) ?? ieRows[0];
      const hasIR = segs.some((s) => String(s.meta?._segType ?? '').startsWith('IR'));
      const hasIC = segs.some((s) => String(s.meta?._segType ?? '').startsWith('IC'));
      const hasAgent = segs.some((s) => s.kind === 'AGENT' || s.meta?._segType === 'IC_AGENT');
      let kind: CallSegment['kind'];
      if (idx === 0) {
        // 첫 hop = 진입. 콜 유형/방향으로 인입/발신/큐인입 판정 (사용자 도메인 통찰)
        if (ie) {
          // PBX-front: IE.CALL_KIND (0=내선/1=인바운드/2=아웃바운드)
          kind = Number(ie.meta?._callKind) === 2 ? 'OUTBOUND' : 'INBOUND';
        } else {
          const ir0 = segs.find((s) => String(s.meta?._segType ?? '').startsWith('IR'));
          if (ir0) {
            // IVR-front: IR.CALL_DIRECTION (1=인바운드/2=아웃바운드/5=데몬콜)
            const cd = Number(ir0.meta?._callKind);
            kind = cd === 2 || cd === 5 ? 'OUTBOUND' : 'INBOUND';
          } else {
            // IE/IR 없이 IC 만 = 디지털(채팅/이메일) 큐 직접 인입
            kind = 'QUEUE_IN';
          }
        }
      } else if (ie) {
        const t = Number(ie.meta?._tType);
        const cc = Number(ie.meta?._ccEnd);
        // 실제 시나리오·라우팅 데이터(IR/IC)가 AGT 통계보다 우선 — 상담사 세션 중 IVR 재전환 hop 오표기 방지
        if (hasIR) kind = 'IVR';
        else if (hasIC) kind = 'CTI';
        else if (t === 3 || t === 4) kind = 'IVR';
        else if (t === 5 || t === 6) kind = 'CTI';
        else if (hasAgent || t === 2) kind = 'AGENT';
        else if (cc === 1) kind = 'DISCONNECT';
        else kind = 'OTHER';
      } else {
        kind = hasIR ? 'IVR' : hasIC ? 'CTI' : hasAgent ? 'AGENT' : (segs[0]?.kind ?? 'OTHER');
      }
      const start =
        segs
          .map((s) => s.startTime)
          .filter(Boolean)
          .sort()[0] ??
        segs[0]?.startTime ??
        '';
      const durSum = segs.reduce((a, s) => a + (s.durationSec ?? 0), 0);
      const queueName = segs.map((s) => s.meta?.queueName).find(Boolean) ?? null;
      const agentName = segs.map((s) => s.meta?.agentName).find(Boolean) ?? null;
      const agentId = segs.map((s) => s.meta?.agentId).find((v) => v != null) ?? null;
      const serviceName = segs.map((s) => s.meta?.serviceName).find(Boolean) ?? null;
      // 그 hop 발신/착신 — IE segment(oName=발신, tName=착신) 우선
      const oName = segs.map((s) => s.meta?.oName).find(Boolean) ?? ie?.meta?.oName ?? null;
      const tName = segs.map((s) => s.meta?.tName).find(Boolean) ?? ie?.meta?.tName ?? null;
      const ani = segs.map((s) => s.meta?.ani).find(Boolean) ?? ie?.meta?.ani ?? null;
      const dnis = segs.map((s) => s.meta?.dnis).find(Boolean) ?? ie?.meta?.dnis ?? null;
      const compo = [...new Set(segs.map((s) => String(s.meta?._segType ?? '')))].filter(Boolean).join(' · ');
      return {
        segmentId: `HOP-${hopNo}`,
        kind,
        startTime: start,
        endTime: null,
        durationSec: durSum || null,
        label: `HOP ${hopNo} · ${compo}`,
        meta: { _hopNo: hopNo, _compo: compo, _hasIR: hasIR ? 1 : 0, _hasIC: hasIC ? 1 : 0, queueName, agentName, agentId, serviceName, oName, tName, ani, dnis },
        isError: segs.some((s) => s.isError),
      } as CallSegment;
    });
  }, [segments]);

  const selectedSegment = useMemo(() => hopNodes.find((s) => s.segmentId === selectedSegmentId) ?? null, [hopNodes, selectedSegmentId]);

  // 진입 시엔 '콜 정보' 탭. 사용자가 CallFlow/HOP 에서 노드를 선택하면 그 종류의 탭으로 전환
  // (IVR/INBOUND→ivr, CTI→cti, AGENT→agent). 자동 segment 선택은 하지 않음.
  useEffect(() => {
    if (!selectedSegment) return;
    if (selectedSegment.kind === 'IVR' || selectedSegment.kind === 'INBOUND') setActiveTab('ivr');
    else if (selectedSegment.kind === 'CTI') setActiveTab('cti');
    else if (selectedSegment.kind === 'AGENT') setActiveTab('agent');
    else setActiveTab('info');
  }, [selectedSegment]);

  // 선택 segment 변경 / 확장 모드 토글 시 — HOP 타임라인 + CallFlow 영역 자동 스크롤
  useEffect(() => {
    if (!selectedSegmentId) return;
    // 다음 paint 후 DOM이 준비된 상태에서 scroll
    const id = requestAnimationFrame(() => {
      document
        .querySelectorAll<HTMLElement>(`[data-segment-id="${selectedSegmentId}"]`)
        .forEach((el) => el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
    });
    return () => cancelAnimationFrame(id);
  }, [selectedSegmentId, flowExpanded]);

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

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* 항상 한 줄 strip — 상세 콜 정보는 하단 '콜 정보' 탭 */}
        <div className="bg-white rounded-md border border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-shrink-0 shadow-[0_1px_2px_0_rgba(56,65,74,0.15)] overflow-x-auto">
          <Button size="small" type="text" icon={<ArrowLeft className="size-3.5" />} onClick={() => navigate('/ipron/tracking')}>
            목록
          </Button>
          <span className="w-px h-4 bg-gray-200" />
          {header.result && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded ring-1 ring-inset ${
                header.result === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : header.result === 'ABANDONED'
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : header.result === 'DISCONNECTED'
                      ? 'bg-red-50 text-red-700 ring-red-200'
                      : header.result === 'IVR_SELF'
                        ? 'bg-blue-50 text-blue-700 ring-blue-200'
                        : header.result === 'TRANSFERRED'
                          ? 'bg-purple-50 text-purple-700 ring-purple-200'
                          : 'bg-gray-100 text-gray-600 ring-gray-200'
              }`}
            >
              {header.result === 'COMPLETED'
                ? '✅ 정상'
                : header.result === 'ABANDONED'
                  ? '🚪 포기'
                  : header.result === 'DISCONNECTED'
                    ? '🔴 호장애'
                    : header.result === 'IVR_SELF'
                      ? '📞 IVR자가'
                      : header.result === 'TRANSFERRED'
                        ? '🔀 호전환'
                        : '🔇 미응답'}
            </span>
          )}
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap">
            <span className="text-gray-400">UCID</span> <span className="font-mono text-gray-800 truncate">{header.ucid}</span>
          </span>
          <span className="w-px h-4 bg-gray-200" />
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap">
            <span className="text-gray-400">ANI</span> <span className="font-mono text-gray-800">{header.ani ?? '-'}</span>
            <span className="text-gray-300 mx-1">→</span>
            <span className="text-gray-400">DNIS</span> <span className="font-mono text-gray-800">{header.dnis ?? '-'}</span>
          </span>
          <span className="w-px h-4 bg-gray-200" />
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap">
            <span className="text-gray-400">시작</span>{' '}
            <span className="font-mono text-gray-800">{header.startTime ? new Date(header.startTime).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}</span>
          </span>
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap">
            <span className="text-gray-400">통화</span>{' '}
            <span className="font-mono text-gray-800">
              {header.durationSec != null ? `${Math.floor(header.durationSec / 60)}:${String(header.durationSec % 60).padStart(2, '0')}` : '-'}
            </span>
          </span>
          <span className="text-[10.5px] text-gray-400 ml-auto whitespace-nowrap pl-2">
            총 <span className="font-semibold text-gray-600 tabular-nums">{hopNodes.length}</span> 홉
          </span>
        </div>

        {/* 본문: 확장 모드면 CallFlow 단독, 일반 모드면 3분할 */}
        {flowExpanded ? (
          <CallFlowDiagram segments={hopNodes} selectedSegmentId={selectedSegmentId} onSelect={setSelectedSegmentId} expanded onToggleExpand={() => setFlowExpanded(false)} />
        ) : (
          <div className="flex-1 flex gap-4 min-h-0">
            {/* 좌: HOP 타임라인 */}
            <div className="w-[280px] bg-white rounded-md border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
              <div className="h-[50px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white to-gray-50/60">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold tracking-tight text-gray-800">HOP 타임라인</span>
                </div>
                <span className="text-[10.5px] text-gray-400 font-mono">
                  <span className="font-semibold text-gray-600 tabular-nums">{hopNodes.length}</span> HOP
                </span>
              </div>
              <div className="flex-1 overflow-y-auto py-1.5">
                {hopNodes.length === 0 ? (
                  <div className="px-4 py-8 text-[12px] text-gray-400 text-center">HOP 없음</div>
                ) : (
                  hopNodes.map((seg) => {
                    const meta = SEGMENT_META[seg.kind];
                    const isActive = selectedSegmentId === seg.segmentId;
                    const isError = !!seg.isError;
                    const dur = fmtSec(seg.durationSec);
                    return (
                      <button
                        key={seg.segmentId}
                        type="button"
                        data-segment-id={seg.segmentId}
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
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 tabular-nums flex-shrink-0">
                            HOP {Number(seg.meta?._hopNo ?? 0)}
                          </span>
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
                        {(seg.meta?.ani || seg.meta?.dnis || seg.meta?.tName) && (
                          <div className="ml-4 mt-0.5 text-[10px] text-gray-500 font-mono truncate">
                            발신 <span className="text-gray-700">{(seg.meta?.ani as string) || '-'}</span>
                            <span className="text-gray-300"> → </span>
                            착신 <span className="text-gray-700">{(seg.meta?.dnis as string) || '-'}</span>
                            {seg.meta?.tName ? <span className="text-gray-400">({seg.meta.tName as string})</span> : null}
                          </div>
                        )}
                        {dur && <div className="ml-4 mt-0.5 text-[10px] text-gray-400 font-mono tabular-nums">{dur}</div>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 우: CallFlow + 탭 (상하 분할) */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-4">
              <CallFlowDiagram segments={hopNodes} selectedSegmentId={selectedSegmentId} onSelect={setSelectedSegmentId} onToggleExpand={() => setFlowExpanded(true)} />
              <div className="bg-white rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
                <div className="h-[50px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white to-gray-50/60">
                  <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k as 'info' | 'ivr' | 'dialog' | 'cti' | 'agent')}
                    size="small"
                    className="-mb-3"
                    items={[
                      { key: 'info', label: 'ℹ️ 콜 정보' },
                      { key: 'ivr', label: '🤖 IVR Steps' },
                      { key: 'dialog', label: '💬 대화' },
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
                  {activeTab === 'info' && (
                    <div className="p-4">
                      <CallSummaryHeader
                        header={header}
                        canRequestUnmask={canRequestUnmask}
                        onRequestUnmask={() => message.info('마스킹 해제 요청은 Phase 2에서 활성화됩니다.')}
                        onExport={() => message.info('엑셀 내보내기는 Phase 2에서 활성화됩니다.')}
                      />
                    </div>
                  )}
                  {activeTab === 'ivr' && (
                    <IvrStepTree
                      groups={ivrQ.data ?? []}
                      loading={ivrQ.isLoading}
                      selectedCdrPkey={selectedSegment?.kind === 'IVR' && selectedSegmentId?.startsWith('IR-') ? selectedSegmentId.split('-').slice(2).join('-') : null}
                    />
                  )}
                  {activeTab === 'dialog' && <DialogView turns={dialogQ.data ?? []} loading={dialogQ.isLoading} />}
                  {activeTab === 'cti' && <CtiRoutingTimeline hops={ctiQ.data ?? []} loading={ctiQ.isLoading} />}
                  {activeTab === 'agent' && <AgentEventTimeline events={agentQ.data ?? []} loading={agentQ.isLoading} />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
