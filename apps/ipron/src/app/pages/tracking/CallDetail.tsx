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
import { ArrowLeft, Copy } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import AgentEventTimeline from '../../features/tracking/components/AgentEventTimeline';
import CallFlowDiagram from '../../features/tracking/components/CallFlowDiagram';
import CallSummaryHeader from '../../features/tracking/components/CallSummaryHeader';
import CtiRoutingTimeline from '../../features/tracking/components/CtiRoutingTimeline';
import DialogView from '../../features/tracking/components/DialogView';
import IvrStepTree from '../../features/tracking/components/IvrStepTree';
import PacketLogModal from '../../features/tracking/components/PacketLogModal';
import { IeCdrPanel } from '../../features/tracking/components/PbxCallDetailDrawer';
import RecordingButton from '../../features/tracking/components/RecordingButton';
import { useGetAgentEvents, useGetCtiRouting, useGetDialogs, useGetIeCdrDetail, useGetIvrSteps, useGetTrackingDetail } from '../../features/tracking/hooks/useTrackingQueries';
import type { CallSegment } from '../../features/tracking/types';
import { fmtTalkTime, fmtTime } from '../../features/tracking/utils/timeFormat';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// TODO Phase 2: shared-store에서 권한 헬퍼가 추가되면 교체
function useHasPermission(authKey: string): boolean {
  void authKey;
  return false;
}

/**
 * hop 별 IE CDR 탭 — PbxCallDetailDrawer 의 IeCdrPanel 재사용.
 * 각 hop 카드의 "⚙ IE CDR" 탭에 그 hop 의 TB_DM_IE_BASICCDR row 전체 시각화.
 * (이전엔 hopNodes baseMeta 의 빈약한 정보만 보여 모든 hop 에서 0 홉처럼 보이는 문제 fix)
 */
function HopIeCdrTab({ ucid, hop }: { ucid: string; hop: number }) {
  const ieCdrQ = useGetIeCdrDetail(ucid, hop);
  if (ieCdrQ.isLoading) return <div className="p-6 text-[12px] text-gray-500">불러오는 중...</div>;
  const ieRow = ieCdrQ.data;
  if (!ieRow) return <div className="p-6 text-[12px] text-gray-400">HOP {hop} 의 IE CDR 데이터가 없습니다.</div>;
  return (
    <div className="p-3">
      <IeCdrPanel ieRow={ieRow} />
    </div>
  );
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
  // 단일 expand + 핀 고정 — 다른 hop 누르면 unpinned 는 자동 닫음, 핀된 것은 유지
  const [openHopIds, setOpenHopIds] = useState<Set<string>>(new Set());
  const [pinnedHopIds, setPinnedHopIds] = useState<Set<string>>(new Set());
  const openHop = (id: string) => {
    setSelectedSegmentId(id);
    // 새 hop 열 때마다 hop 내부 Tabs 는 첫 탭(main)으로 reset
    setHopSubTab('main');
    // pinned 만 남기고 새 id 추가 (unpinned 는 자동 닫힘)
    setOpenHopIds((prev) => {
      const next = new Set<string>();
      prev.forEach((p) => {
        if (pinnedHopIds.has(p)) next.add(p);
      });
      next.add(id);
      return next;
    });
    // 펼친 expand 가 화면에 보이도록 자동 스크롤 (다음 frame 에 expand 가 그려진 후)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const bar = document.querySelector(`[data-segment-id="${id}"]`);
        if (bar) {
          bar.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }
      });
    });
  };
  const closeHop = (id: string) => {
    setOpenHopIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    // 닫을 때 핀도 같이 해제
    setPinnedHopIds((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    if (selectedSegmentId === id) setSelectedSegmentId(null);
  };
  const togglePinHop = (id: string) => {
    setPinnedHopIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  // hop 내부 Tabs — IR: main(IR CDR) / ie(IE CDR) / dialog(대화)
  //                  IC: main(CTI 큐) / ie(IE CDR)
  //                  AGENT: main(상담사) / ie(IE CDR)
  // 다른 hop 으로 이동 시 자동 'main' 으로 reset.
  const [hopSubTab, setHopSubTab] = useState<'main' | 'ie' | 'dialog'>('main');
  // 패킷 전문 모달 — Packet/PacketJson step 클릭 시 열림
  const [packetModalContext, setPacketModalContext] = useState<React.ComponentProps<typeof PacketLogModal>['context']>(null);
  const [flowExpanded, setFlowExpanded] = useState(false);

  // 권한
  const canListen = useHasPermission('ipron:tracking:listen-recording');
  const canRequestUnmask = useHasPermission('mask:request:phone');

  // 상세 + 부속 데이터
  const detailQ = useGetTrackingDetail(ucid);
  const ivrQ = useGetIvrSteps(ucid);
  // CTI 라우팅 — ucid 만으로 1회 호출 (백엔드가 nexthop=null 시 전체 hop 반환).
  // TanStack Query 가 캐시하므로 hop 클릭마다 DB 추가 호출 없음 — FE 가 parentHop 으로 필터.
  const ctiQ = useGetCtiRouting(ucid, null);
  const agentQ = useGetAgentEvents(ucid);
  const dialogQ = useGetDialogs(ucid);

  const breadcrumb = useMemo(
    () => [
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
    return sorted.flatMap(([hopNo, segs], idx) => {
      // IE 가 여러 row 면 전환성 T_TYPE(3=IVR/4=IVR큐/5=CTI큐/6=ACD큐) 을 대표로 우선
      // 동일 T_TYPE 중에서는 startTime 채워진 row 를 우선 (백엔드가 일부 row startTime 누락하는 케이스 보호)
      const ieRows = segs.filter((s) => s.meta?._segType === 'IE');
      const ieTypeMatch = ieRows.filter((s) => [3, 4, 5, 6].includes(Number(s.meta?._tType)));
      const ie = ieTypeMatch.find((s) => !!s.startTime) ?? ieTypeMatch[0] ?? ieRows.find((s) => !!s.startTime) ?? ieRows[0];
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
      // hop 시작 시각 — IE(PBX) > IR(IVR) > 그 외 startTime 채워진 segment 우선
      // (백엔드가 IC_QUEUE.startTime을 콜 전체 시작과 같게 보내는 케이스가 있어 sort[0]는 위험 →
      //  segs.map(...).find(Boolean) 로 startTime 가진 첫 행만 잡음)
      const irSeg = segs.find((s) => String(s.meta?._segType ?? '').startsWith('IR'));
      const start = ie?.startTime || irSeg?.startTime || segs.map((s) => s.startTime).find(Boolean) || '';
      // Packet 전문 조회용 — IR hop 의 BASICCDR 값 (systemId/serviceName/scenarioVersion)
      const irSystemId = irSeg?.meta?.systemId ?? ie?.meta?.systemId ?? segs.map((s) => s.meta?.systemId).find((v) => v != null) ?? null;
      const irNodeId = irSeg?.meta?.nodeId ?? null;
      // duration — hop 통합 길이는 sum 아닌 max (자원 동시 실행이라 가장 긴 것이 hop 점유 시간)
      const durMax = Math.max(0, ...segs.map((s) => s.durationSec ?? 0));
      const queueName = segs.map((s) => s.meta?.queueName).find(Boolean) ?? null;
      const queueId = segs.map((s) => s.meta?.queueId).find((v) => v != null) ?? null;
      const agentName = segs.map((s) => s.meta?.agentName).find(Boolean) ?? null;
      const agentId = segs.map((s) => s.meta?.agentId).find((v) => v != null) ?? null;
      // CTI hop(IC_QUEUE)의 분배 상담사 — 우선순위:
      //   1) 같은 hop 의 IC_AGENT segment agentName (실제 응답한 상담사)
      //   2) 같은 hop 의 IC_QUEUE/IC_ROUTING segment agentName (BE 가 Queue.DIST_AGENT_LOGIN_DN 매핑하여 채움)
      const distAgentName =
        segs.find((s) => s.meta?._segType === 'IC_AGENT')?.meta?.agentName ??
        segs.find((s) => {
          const t = String(s.meta?._segType ?? '');
          return (t === 'IC_QUEUE' || t === 'IC_ROUTING') && Boolean(s.meta?.agentName);
        })?.meta?.agentName ??
        null;
      const serviceName = segs.map((s) => s.meta?.serviceName).find(Boolean) ?? null;
      // 그 hop 발신/착신 — IE segment(oName=발신, tName=착신) 우선
      const oName = segs.map((s) => s.meta?.oName).find(Boolean) ?? ie?.meta?.oName ?? null;
      const tName = segs.map((s) => s.meta?.tName).find(Boolean) ?? ie?.meta?.tName ?? null;
      const ani = segs.map((s) => s.meta?.ani).find(Boolean) ?? ie?.meta?.ani ?? null;
      const dnis = segs.map((s) => s.meta?.dnis).find(Boolean) ?? ie?.meta?.dnis ?? null;
      const compo = [...new Set(segs.map((s) => String(s.meta?._segType ?? '')))].filter(Boolean).join(' · ');

      // 그 hop 에 속한 cdrPkey 모음 — IVR/CTI/AGENT 상세 필터링 키
      const irCdrPkeys = segs
        .filter((s) => String(s.meta?._segType ?? '').startsWith('IR'))
        .map((s) => Number(s.meta?._cdrPkey))
        .filter((n) => Number.isFinite(n));
      const icCdrPkeys = segs
        .filter((s) => String(s.meta?._segType ?? '').startsWith('IC'))
        .map((s) => Number(s.meta?._cdrPkey))
        .filter((n) => Number.isFinite(n));

      // 모든 hop 의 AS-IS SYSTEM_TYPE 분류 (IPR30S1060_SQL.xml:2104-2113 그대로)
      //   T_TYPE 0/1/4/6/7=IE, 2=AGENT, 3=IR(트렁크 TDN → 외부 IVR/ForCus), 5=IC(CTI큐)
      //   IR/IC raw 데이터가 있으면 그것이 우선
      const tt = ie ? Number(ie.meta?._tType) : null;
      const ot = ie ? Number(ie.meta?._oType) : null;
      // IC_AGENT (CTI 콜의 상담사 배정 hop) 는 AGENT 카드. IC_QUEUE/IC_ROUTING 만 IC 카드.
      const hasIcAgent = segs.some((s) => s.meta?._segType === 'IC_AGENT');
      const hasIcQueueOnly = segs.some((s) => {
        const t = String(s.meta?._segType ?? '');
        return t === 'IC_QUEUE' || t === 'IC_ROUTING';
      });
      let hopType: string;
      if (hasIR || tt === 3) hopType = 'IR';
      else if (hasIcAgent)
        hopType = 'AGENT'; // CTI 콜의 상담사 배정 hop
      else if (hasIcQueueOnly || tt === 5) hopType = 'IC';
      else if (tt === 2 || ot === 2)
        hopType = 'AGENT'; // 상담사 착신(T_TYPE=2) 또는 상담사 발신(O_TYPE=2)
      else hopType = 'IE';

      // 첫 hop 전용 — 콜방향(_callDir) + 첫 hop 라벨용 _firstHopType (= hopType 과 동일)
      let firstHopType: string | null = null;
      let callDir: 'INBOUND' | 'OUTBOUND' | 'QUEUE_IN' | null = null;
      if (idx === 0) {
        callDir = kind === 'OUTBOUND' ? 'OUTBOUND' : kind === 'QUEUE_IN' ? 'QUEUE_IN' : 'INBOUND';
        firstHopType = hopType;
      }

      const baseMeta = {
        _hopNo: hopNo,
        _compo: compo,
        _hasIR: hasIR ? 1 : 0,
        _hasIC: hasIC ? 1 : 0,
        _firstHopType: firstHopType,
        _hopType: hopType,
        _callDir: callDir,
        _irCdrPkeys: irCdrPkeys.join(','),
        _icCdrPkeys: icCdrPkeys.join(','),
        queueName,
        queueId,
        agentName,
        agentId,
        distAgentName,
        serviceName,
        oName,
        tName,
        ani,
        dnis,
        // IR hop 의 Packet 전문 조회용 메타
        systemId: irSystemId,
        nodeId: irNodeId,
      };

      // AGENT hop 에 unique AGENT 가 2명 이상 → (hop, agentId) 별로 노드 분리.
      // 좌측에서 'HOP 1 정영훈' / 'HOP 1 1' 따로 클릭 가능 → 우측 이벤트도 그 AGENT 것만 표시.
      if (hopType === 'AGENT') {
        const agentSegs = segs.filter((s) => s.meta?.agentId != null);
        const byAgent = new Map<string, CallSegment[]>();
        for (const as of agentSegs) {
          const aid = String(as.meta!.agentId);
          if (!byAgent.has(aid)) byAgent.set(aid, []);
          byAgent.get(aid)!.push(as);
        }
        if (byAgent.size > 1) {
          return [...byAgent.entries()].map(([aid, ass]) => {
            const aname = ass.map((s) => s.meta?.agentName).find((v): v is string => typeof v === 'string') ?? null;
            const aStart = ass.map((s) => s.startTime).find((v): v is string => typeof v === 'string') ?? start;
            const aDur = Math.max(0, ...ass.map((s) => s.durationSec ?? 0));
            return {
              segmentId: `HOP-${hopNo}-A${aid}`,
              kind,
              startTime: aStart,
              endTime: null,
              durationSec: aDur || null,
              label: `HOP ${hopNo} · ${aname ?? aid} (${compo})`,
              meta: {
                ...baseMeta,
                agentId: Number(aid),
                agentName: aname,
              },
              isError: ass.some((s) => s.isError),
            } as CallSegment;
          });
        }
      }

      return [
        {
          segmentId: `HOP-${hopNo}`,
          kind,
          startTime: start,
          endTime: null,
          durationSec: durMax || null,
          label: `HOP ${hopNo} · ${compo}`,
          meta: baseMeta,
          isError: segs.some((s) => s.isError),
        } as CallSegment,
      ];
    });
  }, [segments]);

  // React Compiler 가 자동 최적화 — useMemo 불필요
  const selectedSegment = hopNodes.find((s) => s.segmentId === selectedSegmentId) ?? null;

  // CallFlow inline expand 의 hop 별 상세 — IVR/CTI/AGENT 모두 그 hop 데이터만 필터링해서 표시.
  // 일반/크게보기 두 모드에서 동일 함수 공유.
  const renderHopDetail = (hop: CallSegment): React.ReactNode => {
    const renderSplit = (
      left: React.ReactNode,
      metricTitle: string,
      rows: Array<{ k: string; v: React.ReactNode }>,
      accentBg: string,
      accentBorder: string,
      accentText: string,
    ) => (
      <div className="flex gap-0 min-h-[200px]">
        <div className="flex-1 min-w-0 overflow-x-auto">{left}</div>
        <aside className="w-[280px] flex-shrink-0 border-l p-4" style={{ borderLeftColor: accentBorder, background: accentBg }}>
          <div className="text-[12px] font-semibold mb-2.5 pb-2 border-b" style={{ color: accentText, borderBottomColor: accentBorder }}>
            {metricTitle}
          </div>
          <dl className="space-y-1.5 text-[12px]">
            {rows.map(({ k, v }, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <dt className="text-gray-500 font-mono text-[11px] flex-shrink-0">{k}</dt>
                <dd className="text-gray-900 font-mono text-right truncate min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    );
    const fmt = fmtTime;
    const hopNo = Number(hop.meta?._hopNo ?? 0);
    const fht = hop.meta?._firstHopType as string | undefined;
    // 모든 hop 의 AS-IS 분류 (첫 hop 외에도) — IR/IC/AGENT/IE 폴백 분기에 사용
    const ht = hop.meta?._hopType as string | undefined;

    // 분기 우선순위 — _hopType(AS-IS SQL N_TYPE → SYSTEM_TYPE 매핑) 기준.
    // hop.kind 는 시각화용 분류라 T_TYPE=4(IVR큐)도 'IVR' 로 잡혀 IR 데이터 없는 IE hop 까지 들어옴 → 제외
    if (ht === 'IR' || fht === 'IR' || fht === 'IVR') {
      const dur = hop.durationSec ?? 0;
      const endIso = hop.startTime && dur > 0 ? new Date(new Date(hop.startTime).getTime() + dur * 1000).toISOString() : null;
      // 이 hop 의 cdrPkey 와 매칭되는 IVR group 만 필터. 키 정보가 없거나 매칭 없으면 전체 fallback (데이터 누락 방지)
      const irKeysStr = (hop.meta?._irCdrPkeys as string | undefined) ?? '';
      const irKeys = irKeysStr
        ? irKeysStr
            .split(',')
            .map(Number)
            .filter((n) => Number.isFinite(n))
        : [];
      const all = ivrQ.data ?? [];
      const hopGroups = irKeys.length > 0 ? all.filter((g) => irKeys.includes(Number(g.cdrPkey))) : [];
      // 그 hop 의 cdrPkey 와 매칭되는 IR group 만 (fallback 제거 — 다른 hop 데이터 섞임 방지)
      const finalGroups = hopGroups;
      const matchedGroup = finalGroups[0];
      const gAny = matchedGroup as { scenarioVersion?: string | null; scenarioId?: number; cdrPkey?: number | string; serviceName?: string } | undefined;
      const serviceName = (hop.meta?.serviceName as string) ?? gAny?.serviceName ?? '-';
      const version = (hop.meta?.version as string) ?? (hop.meta?._version as string) ?? gAny?.scenarioVersion ?? '-';
      const cdrPkey = hop.meta?._cdrPkey != null ? String(hop.meta._cdrPkey) : gAny?.cdrPkey != null ? String(gAny.cdrPkey) : '-';
      const irContent = renderSplit(
        <IvrStepTree
          groups={finalGroups}
          loading={ivrQ.isLoading}
          selectedCdrPkey={null}
          onOpenDialog={() => setHopSubTab('dialog')}
          onPacketClick={(step) => {
            const startIso = detailQ.data?.header?.startTime ?? hop.startTime ?? '';
            const yyyymmdd = startIso ? startIso.slice(0, 10).replace(/-/g, '') : '';
            const systemIdRaw = hop.meta?.systemId ?? hop.meta?._systemId;
            const systemId = systemIdRaw != null ? Number(systemIdRaw) : null;
            // serviceId: matchedGroup.scenarioId(=BE BASICCDR.SERVICE_ID) 우선, fallback 으로 hop.meta
            const serviceIdRaw = (matchedGroup as { scenarioId?: number })?.scenarioId ?? hop.meta?.serviceId ?? hop.meta?._serviceId;
            const serviceId = serviceIdRaw != null && Number(serviceIdRaw) !== 0 ? Number(serviceIdRaw) : null;
            setPacketModalContext({
              systemId,
              serviceId,
              serviceVer: version !== '-' ? version : null,
              packetId: step.val3 ?? step.menuId ?? null,
              trKey: step.val8 ?? null,
              date: yyyymmdd,
              dataType: step.rawType,
              menuName: step.mentName ?? step.menuId,
              typeNm: step.type,
            });
          }}
        />,
        '🤖 IR CDR 정보',
        [
          { k: '서비스', v: serviceName },
          { k: '버전', v: version },
          { k: 'CDR PKEY', v: cdrPkey },
          { k: 'NEXTHOP', v: String(hopNo) },
          { k: '시작', v: fmt(hop.startTime) },
          { k: '종료', v: fmt(endIso) },
          { k: '지속', v: dur > 0 ? `${dur}s` : '-' },
          { k: 'ANI → DNIS', v: `${(hop.meta?.ani as string) ?? '-'} → ${(hop.meta?.dnis as string) ?? '-'}` },
        ],
        'rgba(237,233,254,0.4)',
        '#DDD3FB',
        '#5b21b6',
      );
      // IR hop 은 IR CDR + IE CDR 두 탭 — 같은 hop 의 IE CDR 도 함께 표시.
      // 다른 분기(CTI/AGENT/IE)와 이질감 없게 wrapper 없이 minimal Tabs (tab bar 만 얇게 위에)
      const dialogCount = (dialogQ.data ?? []).length;
      return (
        <Tabs
          activeKey={hopSubTab}
          onChange={(k) => setHopSubTab(k as 'main' | 'ie' | 'dialog')}
          size="small"
          tabPosition="bottom"
          tabBarStyle={{ marginTop: 0, paddingLeft: 12, paddingRight: 12, borderTop: 'none' }}
          items={[
            { key: 'main', label: '🤖 IR CDR', children: irContent },
            { key: 'ie', label: '⚙ IE CDR', children: ucid ? <HopIeCdrTab ucid={ucid} hop={hopNo} /> : null },
            {
              key: 'dialog',
              label: dialogCount > 0 ? `💬 대화 (${dialogCount})` : '💬 대화',
              children: (
                <div className="px-3 pt-2 pb-3">
                  <DialogView turns={dialogQ.data ?? []} loading={dialogQ.isLoading} />
                </div>
              ),
            },
          ]}
        />
      );
    }
    if (ht === 'IC' || fht === 'CTI' || fht === 'IC' || fht === 'QUEUE_IN') {
      const dur = hop.durationSec ?? 0;
      const endIso = hop.startTime && dur > 0 ? new Date(new Date(hop.startTime).getTime() + dur * 1000).toISOString() : null;
      // 백엔드 nexthop=null 호출로 모든 hop 라우팅이 한 응답에 옴 → parentHop(=IE.HOP) 으로 그 hop 만 필터.
      // 매칭 없으면 빈 표시 (다른 hop 데이터 섞임 방지)
      const allCti = ctiQ.data ?? [];
      const hopCti = allCti.filter((c) => Number(c.meta?._parentHop) === hopNo);
      const ctiContent = renderSplit(
        <CtiRoutingTimeline hops={hopCti} loading={ctiQ.isLoading} />,
        '🔀 CTI 큐 정보',
        [
          { k: 'Queue', v: (hop.meta?.queueName as string) ?? '-' },
          { k: 'Queue ID', v: hop.meta?.queueId != null ? String(hop.meta.queueId) : '-' },
          { k: '시나리오', v: (hop.meta?.serviceName as string) ?? '-' },
          { k: '시작', v: fmt(hop.startTime) },
          { k: '종료', v: fmt(endIso) },
          { k: '대기시간', v: dur > 0 ? `${dur}s` : '-' },
          { k: '분배 상담원', v: (hop.meta?.distAgentName as string) ?? (hop.meta?.agentName as string) ?? '— 미분배 —' },
        ],
        'rgba(255,237,213,0.4)',
        '#FDD9B0',
        '#9a3412',
      );
      return (
        <Tabs
          activeKey={hopSubTab === 'dialog' ? 'main' : hopSubTab}
          onChange={(k) => setHopSubTab(k as 'main' | 'ie')}
          size="small"
          tabPosition="bottom"
          tabBarStyle={{ marginTop: 0, paddingLeft: 12, paddingRight: 12, borderTop: 'none' }}
          items={[
            { key: 'main', label: '🔀 CTI 큐', children: ctiContent },
            { key: 'ie', label: '⚙ IE CDR', children: ucid ? <HopIeCdrTab ucid={ucid} hop={hopNo} /> : null },
          ]}
        />
      );
    }
    if (ht === 'AGENT' || fht === 'AGENT' || fht === '내선') {
      const dur = hop.durationSec ?? 0;
      const endIso = hop.startTime && dur > 0 ? new Date(new Date(hop.startTime).getTime() + dur * 1000).toISOString() : null;
      // 이 hop 의 그 AGENT 이벤트만 필터 — (hop, agentId) 둘 다 매칭.
      // 같은 hop 에 여러 상담사가 동시 배정되는 케이스(예: BC830FFE hop=1 DN 2484+2486)에서
      // 좌측 hop AGENT 를 클릭하면 그 상담사의 이벤트만 우측에 표시되어야 함.
      const allAgent = agentQ.data ?? [];
      const hopAgentId = hop.meta?.agentId != null ? Number(hop.meta.agentId) : null;
      const matchedByHopAndAgent = allAgent.filter((e) => {
        const eHop = Number((e as { hop?: number | string | null }).hop);
        if (eHop !== hopNo) return false;
        if (hopAgentId != null) {
          const eAgentId = Number((e as { agentId?: number | string | null }).agentId);
          if (eAgentId !== hopAgentId) return false;
        }
        return true;
      });
      // fallback 1: hop+agentId 매칭 0건 → hop 만으로 (BE hop 매핑 실패 케이스 보호)
      const matchedByHop = matchedByHopAndAgent.length > 0 ? matchedByHopAndAgent : allAgent.filter((e) => Number((e as { hop?: number | string | null }).hop) === hopNo);
      // fallback 2: hop 도 0건 → 전체 (디버깅 가시성)
      const finalAgent = matchedByHop.length > 0 ? matchedByHop : allAgent;
      const agentContent = renderSplit(
        <AgentEventTimeline events={finalAgent} loading={agentQ.isLoading} />,
        '🎧 상담사 정보',
        [
          { k: '상담사', v: (hop.meta?.agentName as string) ?? '-' },
          { k: 'Agent ID', v: hop.meta?.agentId != null ? String(hop.meta.agentId) : '-' },
          { k: '시작', v: fmt(hop.startTime) },
          { k: '종료', v: fmt(endIso) },
          { k: '통화', v: dur > 0 ? `${dur}s` : '-' },
        ],
        'rgba(209,250,229,0.4)',
        '#A7F0CC',
        '#065f46',
      );
      return (
        <Tabs
          activeKey={hopSubTab === 'dialog' ? 'main' : hopSubTab}
          onChange={(k) => setHopSubTab(k as 'main' | 'ie')}
          size="small"
          tabPosition="bottom"
          tabBarStyle={{ marginTop: 0, paddingLeft: 12, paddingRight: 12, borderTop: 'none' }}
          items={[
            { key: 'main', label: '🎧 상담사', children: agentContent },
            { key: 'ie', label: '⚙ IE CDR', children: ucid ? <HopIeCdrTab ucid={ucid} hop={hopNo} /> : null },
          ]}
        />
      );
    }
    // IE CDR 메트릭 빌더 — IE 자원 hop 또는 IR 탭의 두 번째 탭에서 재사용
    function buildIeMetric(): React.ReactNode {
      // IE segments 중 대표 row (T_TYPE 우선)
      const ieSeg =
        segments.filter((s) => Number(s.meta?._hop) === hopNo && s.meta?._segType === 'IE').find((s) => !!s.startTime) ??
        segments.filter((s) => Number(s.meta?._hop) === hopNo && s.meta?._segType === 'IE')[0];
      const sysId = (ieSeg?.meta?.systemId as number | null) ?? (hop.meta?.systemId as number | null) ?? null;
      const sysName = (ieSeg?.meta?.systemName as string | null) ?? (hop.meta?.systemName as string | null) ?? null;
      const nodeName = (ieSeg?.meta?.nodeName as string | null) ?? (hop.meta?.nodeName as string | null) ?? null;
      // CC 코드 → 한국어 라벨 (AS-IS SWAT IPR30S1060_SQL.xml:1308-1309 정확 매핑)
      const CC_END_LABEL: Record<number, string> = { 0: '미종료', 1: '종료' };
      const CC_TYPE_LABEL: Record<number, string> = {
        0: '종료 (통화후 종료)',
        1: '포기 (Drop)',
        2: 'FAC',
        3: '분배',
        4: '전환',
        5: '회수',
        6: '초과',
      };
      const CC_PART_LABEL: Record<number, string> = {
        0: '계속진행',
        1: '국선종료',
        2: '내선종료',
        3: '협의종료',
        4: '시스템종료',
      };
      const cce = Number(ieSeg?.meta?._ccEnd ?? hop.meta?._ccEnd);
      const cct = Number(ieSeg?.meta?._ccType ?? hop.meta?._ccType);
      const ccp = Number(ieSeg?.meta?._ccPart ?? hop.meta?._ccPart);
      const endStatusLabel = Number.isFinite(cce) ? (CC_END_LABEL[cce] ?? String(cce)) : '-';
      const endTypeLabel = Number.isFinite(cct) ? (CC_TYPE_LABEL[cct] ?? String(cct)) : '-';
      const endPartLabel = Number.isFinite(ccp) ? (CC_PART_LABEL[ccp] ?? String(ccp)) : '-';

      // 콜유형 — IE.CALL_KIND (AS-IS SQL DECODE)
      const CALL_KIND_LABEL: Record<number, string> = { 0: '내선통화', 1: '국선수신', 2: '국선발신' };
      const ckRaw = Number(ieSeg?.meta?._callKind ?? hop.meta?._callKind);
      const callKindLabel = Number.isFinite(ckRaw) ? (CALL_KIND_LABEL[ckRaw] ?? String(ckRaw)) : '-';

      // 통화시간 포맷은 fmtTalkTime (공용 헬퍼) 사용
      const fmtTalk = fmtTalkTime;

      // 시스템 — "이름 (ID)" 한 줄 합침. 이름 없으면 ID만
      const sysCombined = sysName && sysId != null ? `${sysName} (${sysId})` : (sysName ?? (sysId != null ? String(sysId) : '-'));

      // ForCus 보조 — IE.T_TYPE=3(트렁크 TDN)이고 같은 hop에 IR CDR 있으면 외부 IVR(ForCus) 연결 hop.
      // AS-IS IPR30S1060_SQL.xml:2033 'ForCus' 별도 segment 행 → TO-BE 는 메트릭 박스 보조 행 1줄
      const ttIe = Number(ieSeg?.meta?._tType);
      const irSegInHop = segments.find((s) => Number(s.meta?._hop) === hopNo && String(s.meta?._segType ?? '').startsWith('IR'));
      const showForCus = ttIe === 3 && !!irSegInHop;
      const forcusLabel = showForCus ? `${(irSegInHop?.meta?.serviceName as string) ?? 'ForCus'} (${irSegInHop?.meta?.systemId ?? '-'})` : null;
      const dur = hop.durationSec ?? 0;
      const endIso = hop.startTime && dur > 0 ? new Date(new Date(hop.startTime).getTime() + dur * 1000).toISOString() : null;
      const sysNameDisplay = sysName ?? (sysId != null ? `(${sysId})` : '-');

      return renderSplit(
        <div className="p-4 text-[12.5px] text-gray-600 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">IE 자원 (PBX 처리)</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            <div>
              <span className="text-gray-400 mr-2">발신번호</span>
              <span className="font-mono">{(hop.meta?.ani as string) ?? '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 mr-2">착신번호</span>
              <span className="font-mono">{(hop.meta?.dnis as string) ?? '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 mr-2">발신측</span>
              <span>{(hop.meta?.oName as string) ?? '-'}</span>
            </div>
            <div>
              <span className="text-gray-400 mr-2">착신측</span>
              <span>{(hop.meta?.tName as string) ?? '-'}</span>
            </div>
          </div>
        </div>,
        '⚙ IE CDR 정보',
        [
          { k: 'HOP', v: String(hopNo) },
          { k: '콜유형', v: callKindLabel },
          { k: '시스템', v: sysCombined },
          ...(forcusLabel ? [{ k: '외부 연결', v: <span className="text-violet-700 font-semibold">ForCus · {forcusLabel}</span> }] : []),
          { k: '노드 ID', v: (ieSeg?.meta?.nodeId as number | null) != null ? String(ieSeg?.meta?.nodeId) : hop.meta?.nodeId != null ? String(hop.meta.nodeId) : '-' },
          { k: '인입시간', v: fmt(hop.startTime) },
          { k: '통화시간', v: fmtTalk(dur) },
          { k: '종료구분', v: endTypeLabel },
          { k: '종료주체', v: endPartLabel },
          { k: '진행상태', v: endStatusLabel },
        ],
        'rgba(220,231,245,0.4)',
        '#B6CCE7',
        '#1d3a6b',
      );
    }

    // IE 자원 hop (IR/IC/AGENT 없음 — 첫 INBOUND/OUTBOUND/QUEUE_IN 또는 순수 PBX hop)
    // IR/IC/AGENT hop 과 동일한 Tabs 구조 — 본 카드(IE 자원 요약) + IE CDR(118 컬럼 패널)
    return (
      <Tabs
        activeKey={hopSubTab === 'dialog' ? 'main' : hopSubTab}
        onChange={(k) => setHopSubTab(k as 'main' | 'ie')}
        size="small"
        tabPosition="bottom"
        tabBarStyle={{ marginTop: 0, paddingLeft: 12, paddingRight: 12, borderTop: 'none' }}
        items={[
          { key: 'main', label: '⚙ IE 자원', children: buildIeMetric() },
          { key: 'ie', label: '📋 IE CDR', children: ucid ? <HopIeCdrTab ucid={ucid} hop={hopNo} /> : null },
        ]}
      />
    );
  };

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
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap inline-flex items-center gap-1">
            <span className="text-gray-400">UCID</span>
            <span className="font-mono text-gray-800 truncate">{header.ucid}</span>
            <button
              type="button"
              onClick={() => {
                if (!header.ucid) return;
                navigator.clipboard.writeText(header.ucid).then(
                  () => message.success('UCID 복사됨'),
                  () => message.error('복사 실패'),
                );
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-0.5 rounded hover:bg-blue-50"
              title="UCID 복사"
            >
              <Copy className="size-3" />
            </button>
          </span>
          {(header.mediaAlias || header.mediaType != null) && (
            <>
              <span className="w-px h-4 bg-gray-200" />
              <span className="text-[11.5px] text-gray-500 whitespace-nowrap inline-flex items-center gap-1">
                <span className="text-gray-400">미디어</span>
                <span className="text-gray-800">{header.mediaAlias ?? `Type ${header.mediaType}`}</span>
              </span>
            </>
          )}
          <span className="w-px h-4 bg-gray-200" />
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap">
            <span className="text-gray-400">ANI</span> <span className="font-mono text-gray-800">{header.ani ?? '-'}</span>
            <span className="text-gray-300 mx-1">→</span>
            <span className="text-gray-400">DNIS</span> <span className="font-mono text-gray-800">{header.dnis ?? '-'}</span>
          </span>
          <span className="w-px h-4 bg-gray-200" />
          <span className="text-[11.5px] text-gray-500 whitespace-nowrap">
            <span className="text-gray-400">시작</span> <span className="font-mono text-gray-800">{fmtTime(header.startTime)}</span>
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
          <CallFlowDiagram
            segments={hopNodes}
            selectedSegmentId={selectedSegmentId}
            onSelect={setSelectedSegmentId}
            openHopIds={openHopIds}
            pinnedHopIds={pinnedHopIds}
            onOpen={openHop}
            onClose={closeHop}
            onPinToggle={togglePinHop}
            expanded
            onToggleExpand={() => setFlowExpanded(false)}
            renderHopDetail={renderHopDetail}
          />
        ) : (
          <div className="flex-1 flex gap-4 min-h-0">
            {/* 좌측 HOP 타임라인 카드 폐기 — 정보는 콜 흐름의 좌측 라벨 컬럼으로 통합됨 */}

            {/* 중앙 — 콜 흐름 (hop bar 클릭 시 그 row 아래로 자원 상세 inline expand) */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <CallFlowDiagram
                segments={hopNodes}
                selectedSegmentId={selectedSegmentId}
                onSelect={setSelectedSegmentId}
                openHopIds={openHopIds}
                pinnedHopIds={pinnedHopIds}
                onOpen={openHop}
                onClose={closeHop}
                onPinToggle={togglePinHop}
                expanded
                onToggleExpand={() => setFlowExpanded(true)}
                renderHopDetail={renderHopDetail}
              />
            </div>

            {/* 우측 — 위: 핵심 메트릭 (콜 전체, 컴팩트) + 아래: 선택 HOP 동적 상세 */}
            <div className="w-[400px] flex-shrink-0 flex flex-col gap-4 min-h-0">
              {/* 위 — 핵심 메트릭 (콜유형 행 추가로 max-h 늘림, 스크롤 안 생기게) */}
              <div className="flex-shrink-0 max-h-[420px] bg-white rounded-md border border-gray-200 flex flex-col overflow-hidden shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
                <div className="h-[44px] px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 bg-gradient-to-b from-white to-gray-50/60">
                  <div className="text-[13px] font-semibold text-gray-800">📊 핵심 메트릭</div>
                  <div className="text-[10px] text-gray-400 font-mono">콜 전체</div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {(() => {
                    // hop 분류
                    const ivrHops = hopNodes.filter((h) => h.kind === 'IVR');
                    const ctiHops = hopNodes.filter((h) => h.kind === 'CTI' || h.kind === 'QUEUE_IN');
                    const agentHops = hopNodes.filter((h) => h.kind === 'AGENT');
                    const ivrSec = ivrHops.reduce((a, h) => a + (h.durationSec ?? 0), 0);
                    const ctiSec = ctiHops.reduce((a, h) => a + (h.durationSec ?? 0), 0);
                    const ivrStepsCount = (ivrQ.data ?? []).reduce((a, g) => a + ((g as { steps?: unknown[] }).steps?.length ?? 0), 0);
                    const isError = ['DISCONNECTED', 'ABANDONED'].includes(header.result ?? '');
                    const resultLabel: Record<string, { text: string; cls: string }> = {
                      COMPLETED: { text: '✅ 정상 종료', cls: 'text-emerald-700' },
                      ABANDONED: { text: '🚪 고객 포기', cls: 'text-amber-700' },
                      DISCONNECTED: { text: '🔴 호장애', cls: 'text-red-700' },
                      IVR_SELF: { text: '📞 IVR 자가해결', cls: 'text-blue-700' },
                      TRANSFERRED: { text: '🔀 호 전환', cls: 'text-purple-700' },
                      NORMAL: { text: '✅ 정상 종료', cls: 'text-emerald-700' },
                    };
                    const r = resultLabel[header.result ?? ''] ?? { text: header.result ?? '-', cls: 'text-gray-700' };
                    const Row = ({ k, v, vCls = 'text-gray-900 font-medium' }: { k: string; v: React.ReactNode; vCls?: string }) => (
                      <div className="flex items-center justify-between text-[12px] py-1">
                        <span className="text-gray-500">{k}</span>
                        <span className={vCls}>{v}</span>
                      </div>
                    );
                    // 콜 유형 — 첫 hop 의 IE.CALL_KIND 우선 (0=내선통화/1=국선수신/2=국선발신).
                    // _callKind 없으면 _callDir 폴백. QUEUE_IN (CTI 디지털) 은 mediaAlias 표시.
                    const firstMeta = hopNodes[0]?.meta ?? {};
                    const ck = Number(firstMeta._callKind);
                    // 디지털/CTI 콜 라벨 — alias > Type N > "큐 인입 (디지털)" 순 fallback
                    const digitalLabel = header.mediaAlias ? `💬 ${header.mediaAlias}` : header.mediaType != null ? `💬 Type ${header.mediaType}` : '💬 큐 인입 (디지털)';
                    const callTypeLabel = Number.isFinite(ck)
                      ? ck === 0
                        ? '📞 내선 통화'
                        : ck === 2
                          ? '📤 발신'
                          : '📥 수신'
                      : firstMeta._callDir === 'OUTBOUND'
                        ? '📤 발신'
                        : firstMeta._callDir === 'QUEUE_IN'
                          ? digitalLabel
                          : '📥 수신';
                    return (
                      <>
                        <div className="space-y-0.5">
                          <Row k="콜 유형" v={<span className="font-semibold">{callTypeLabel}</span>} />
                          <Row
                            k="발신 → 착신"
                            v={
                              <span className="font-mono">
                                {header.ani ?? '-'} → {header.dnis ?? '-'}
                              </span>
                            }
                          />
                          <Row
                            k="시작 시각"
                            v={<span className="font-mono">{header.startTime ? new Date(header.startTime).toLocaleString('ko-KR', { hour12: false }) : '-'}</span>}
                          />
                          {ivrSec > 0 && <Row k="IVR 시간" v={`${fmtSec(ivrSec) || '0s'}${ivrStepsCount > 0 ? ` (${ivrStepsCount} step)` : ''}`} />}
                          {ctiSec > 0 && <Row k="CTI 큐 대기" v={fmtSec(ctiSec) || '0s'} />}
                          {agentHops.map((h, i) => (
                            <Row
                              key={h.segmentId}
                              k={agentHops.length > 1 ? `통화 (${i + 1}차)` : '통화'}
                              v={
                                <span>
                                  {fmtSec(h.durationSec) || '0s'}
                                  {(h.meta?.agentName as string | undefined) && <span className="text-gray-500 ml-1">— {h.meta?.agentName as string}</span>}
                                </span>
                              }
                            />
                          ))}
                          <Row k="총 통화" v={fmtSec(header.durationSec ?? 0) || '0s'} vCls={isError ? 'text-red-600 font-semibold' : 'text-gray-900 font-semibold'} />
                          {agentHops.length > 1 && <Row k="호 재전환" v={`${agentHops.length - 1}회`} vCls="text-amber-700 font-medium" />}
                          <Row k="결과" v={r.text} vCls={`${r.cls} font-medium`} />
                          <Row k="총 HOP" v={`${hopNodes.length}`} />
                          {header.tenantName && <Row k="테넌트" v={header.tenantName} />}
                        </div>
                        {isError && (
                          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded">
                            <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">⚠ 이상 신호</div>
                            <div className="text-[11px] text-amber-900 leading-relaxed">
                              {header.result === 'ABANDONED' && 'CTI 큐 대기 중 고객 포기. 라우팅 정책 / 상담사 풀 점검 권장.'}
                              {header.result === 'DISCONNECTED' && '호 장애로 비정상 종료. 네트워크 / 시스템 로그 확인 필요.'}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 패킷 전문 모달 (시나리오 트리의 Packet step 클릭 시) */}
      <PacketLogModal open={packetModalContext != null} onClose={() => setPacketModalContext(null)} context={packetModalContext} />
    </div>
  );
}
