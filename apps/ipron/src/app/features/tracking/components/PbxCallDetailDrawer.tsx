/**
 * PBX 모드 콜 상세 Drawer — 2-pane.
 *
 *  ┌────────────────────────────────── 1000px ──────────────────────────────────┐
 *  │ 콜 서머리 (UCID / 시작·종료 / ANI·DNIS / IVR·CTI·내선 배지)                │
 *  ├──────────────── 280px ─────────────┬─────────── 720px ──────────────────────┤
 *  │ hop 리스트                          │  IE CDR 시각화 (선택 hop)            │
 *  │  · segment 카드들                  │   ── 헤더 (hop / 시각 / 결과)        │
 *  │  · 클릭 → 우측 활성                │   ── 발신 ↔ 착신 카드                │
 *  │                                    │   ── 시간선 (생성/응답/통화/종료)    │
 *  │                                    │   ── 통화 품질 (MOS / Jitter)        │
 *  │                                    │   ── raw 컬럼 (collapsible)          │
 *  └────────────────────────────────────┴────────────────────────────────────────┘
 */
import { useEffect, useMemo, useState } from 'react';
import { Drawer, Empty, Spin, Tag } from 'antd';
import { ChevronDown, ChevronRight, Maximize2, Minimize2, Phone, X } from 'lucide-react';
import { useGetIeCdrDetail, useGetTrackingDetail } from '../hooks/useTrackingQueries';
import type { CallSearchResult, CallSegment } from '../types/tracking.types';

interface Props {
  open: boolean;
  row: CallSearchResult | null;
  onClose: () => void;
}

// ── 라벨 ───────────────────────────────────────────────────────────────
const SEGMENT_KIND_LABEL: Record<CallSegment['kind'], { label: string; color: string }> = {
  INBOUND: { label: '인입', color: 'blue' },
  OUTBOUND: { label: '발신', color: 'cyan' },
  QUEUE_IN: { label: '큐 인입', color: 'geekblue' },
  IVR: { label: 'IVR', color: 'purple' },
  CTI: { label: 'CTI 큐', color: 'cyan' },
  AGENT: { label: '상담사', color: 'green' },
  DISCONNECT: { label: '종료', color: 'red' },
  OTHER: { label: '기타', color: 'default' },
};

const LINE_TYPE = ['None', '국선', '내선(EDN)', '트렁크(TDN)', 'IVR큐', 'CTI큐', 'ACD큐', 'PDN'] as const;
const CC_TYPE = ['정상 종료', '포기', 'FAC', '분배', '전환', '회수', '초과'];
const CC_PART = ['계속진행', '국선종료', '내선종료', '협의종료', '시스템종료'];
const CALL_KIND_LABEL: Record<number, string> = { 0: '내선통화', 1: '국선수신', 2: '국선발신', 5: '데몬콜' };

// ── 유틸 ───────────────────────────────────────────────────────────────
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const fmtTimeOnly = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(-8);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const fmtDuration = (s: number | null | undefined): string => {
  if (s == null) return '-';
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};
// 'YYYYMMDDHHmmssXX' → display string (HH:mm:ss)
const fmtCdrTime = (s: unknown): string => {
  if (!s) return '-';
  const str = String(s);
  if (str.length < 14) return str;
  return `${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}`;
};
const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string => (v == null || v === '' ? '-' : String(v));

// ── 상태 평가 ──────────────────────────────────────────────────────────
function ccTypeColor(ccType: number | null): { color: string; bg: string; label: string } {
  if (ccType == null) return { color: 'text-gray-500', bg: 'bg-gray-100', label: '-' };
  const label = CC_TYPE[ccType] ?? String(ccType);
  if (ccType === 0) return { color: 'text-emerald-700', bg: 'bg-emerald-50', label };
  if (ccType === 1) return { color: 'text-amber-700', bg: 'bg-amber-50', label };
  if (ccType === 4) return { color: 'text-purple-700', bg: 'bg-purple-50', label };
  return { color: 'text-red-700', bg: 'bg-red-50', label };
}
function mosColor(mos: number | null): { color: string; label: string } {
  if (mos == null) return { color: 'bg-gray-300', label: '-' };
  if (mos >= 4) return { color: 'bg-emerald-500', label: '우수' };
  if (mos >= 3.5) return { color: 'bg-blue-500', label: '양호' };
  if (mos >= 3) return { color: 'bg-amber-500', label: '보통' };
  return { color: 'bg-red-500', label: '나쁨' };
}

// AS-IS IPR30S1060 setQualityIndicator() 임계값 그대로 — R-Factor 가 메인 음성 품질 지표
function rFactorGrade(r: number | null): { bar: string; ring: string; text: string; label: string } {
  if (r == null || r < 0) return { bar: 'bg-gray-300', ring: 'ring-gray-200', text: 'text-gray-500', label: '데이터 없음' };
  if (r >= 90) return { bar: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', label: '탁월' };
  if (r >= 80) return { bar: 'bg-lime-500', ring: 'ring-lime-200', text: 'text-lime-700', label: '좋음' };
  if (r >= 70) return { bar: 'bg-amber-400', ring: 'ring-amber-200', text: 'text-amber-700', label: '보통' };
  if (r >= 60) return { bar: 'bg-orange-500', ring: 'ring-orange-200', text: 'text-orange-700', label: '주의' };
  return { bar: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-700', label: '불량' };
}

export default function PbxCallDetailDrawer({ open, row, onClose }: Props) {
  const detailQ = useGetTrackingDetail(row?.ucid ?? '', { queryOptions: { enabled: open && !!row?.ucid } });
  const segments = useMemo<CallSegment[]>(() => detailQ.data?.segments ?? [], [detailQ.data]);
  const ieSegments = useMemo(() => segments.filter((s) => (s as unknown as { segmentType?: string }).segmentType === 'IE'), [segments]);
  const [selectedHop, setSelectedHop] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Drawer 가 닫힐 때 fullscreen 상태도 초기화
  useEffect(() => {
    if (!open) setFullscreen(false);
  }, [open]);

  // segment 로딩 후 첫 IE hop 자동 선택
  useEffect(() => {
    if (ieSegments.length === 0) {
      setSelectedHop(null);
      return;
    }
    const stillExists = selectedHop != null && ieSegments.some((s) => (s as unknown as { hop?: number }).hop === selectedHop);
    if (!stillExists) {
      const firstHop = (ieSegments[0] as unknown as { hop?: number }).hop;
      setSelectedHop(firstHop ?? null);
    }
  }, [ieSegments, selectedHop]);

  const ieCdrQ = useGetIeCdrDetail(row?.ucid ?? null, selectedHop, {
    queryOptions: { enabled: open && !!row?.ucid && selectedHop != null },
  });
  const ieRow = (ieCdrQ.data ?? {}) as Record<string, unknown>;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="font-medium">교환기 CDR 상세</span>
          {row?.ucid && <span className="font-mono text-[11px] text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded truncate max-w-[480px]">{row.ucid}</span>}
        </div>
      }
      width={fullscreen ? '100vw' : 1000}
      closable={false}
      extra={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors"
            aria-label={fullscreen ? '기본 크기로' : '전체 화면'}
            title={fullscreen ? '기본 크기로' : '전체 화면'}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition-colors" aria-label="닫기" title="닫기">
            <X className="size-4" />
          </button>
        </div>
      }
      styles={{ body: { padding: 0, background: '#fafbfc' } }}
    >
      {!row ? (
        <Empty description="선택된 콜 없음" className="mt-20" />
      ) : (
        <div className="flex flex-col h-full">
          {/* 콜 서머리 헤더 */}
          <CallSummaryHeader row={row} />

          {/* 본문 2-pane */}
          <div className="flex flex-1 min-h-0">
            <HopList segments={ieSegments} selectedHop={selectedHop} onSelect={(h) => setSelectedHop(h)} loading={detailQ.isLoading} />
            <div className="flex-1 min-w-0 overflow-auto">
              {ieCdrQ.isLoading ? (
                <div className="py-20 text-center">
                  <Spin />
                </div>
              ) : Object.keys(ieRow).length === 0 ? (
                <Empty description="hop 정보 없음" className="mt-20" />
              ) : (
                <IeCdrPanel ieRow={ieRow} />
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ════════════════════════════════════════════════════════════════════
//  콜 서머리 헤더
// ════════════════════════════════════════════════════════════════════
function CallSummaryHeader({ row }: { row: CallSearchResult }) {
  const ctiState = !row.ctiAttempt ? 'none' : row.ctiConnected ? (row.ctiPartialFailed ? 'partial' : 'success') : 'failed';
  const agtState = !row.agentAttempt ? 'none' : row.agentConnected ? (row.agentPartialFailed ? 'partial' : 'success') : 'failed';

  return (
    <section className="px-5 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6 text-[12px]">
        <KV label="시작" value={fmtDate(row.startTime)} />
        <KV label="종료" value={fmtDate(row.endTime)} />
        <KV label="발신" value={row.ani ?? '-'} mono />
        <span className="text-gray-300">→</span>
        <KV label="수신" value={row.dnis ?? '-'} mono />
        <div className="ml-auto flex items-center gap-1.5">
          {row.ivrEntered && (
            <Tag color="purple" className="!text-[10px] !mr-0">
              IVR
            </Tag>
          )}
          {ctiState !== 'none' && (
            <Tag color={ctiState === 'success' ? 'blue' : ctiState === 'partial' ? 'orange' : 'default'} className="!text-[10px] !mr-0">
              CTI {ctiState === 'success' ? '성공' : ctiState === 'partial' ? '부분실패' : '실패'}
            </Tag>
          )}
          {agtState !== 'none' && (
            <Tag color={agtState === 'success' ? 'green' : agtState === 'partial' ? 'orange' : 'default'} className="!text-[10px] !mr-0">
              내선 {agtState === 'success' ? '응답' : agtState === 'partial' ? '부분' : '미응답'}
            </Tag>
          )}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
//  좌측 hop 리스트
// ════════════════════════════════════════════════════════════════════
function HopList({ segments, selectedHop, onSelect, loading }: { segments: CallSegment[]; selectedHop: number | null; onSelect: (hop: number) => void; loading: boolean }) {
  return (
    <aside className="w-[280px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
      <div className="px-4 py-2.5 border-b border-gray-100 text-[11px] text-gray-500 font-medium uppercase tracking-wider">교환기 hop</div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="py-10 text-center">
            <Spin size="small" />
          </div>
        ) : segments.length === 0 ? (
          <div className="px-4 py-8 text-[11px] text-gray-400 text-center">hop 없음</div>
        ) : (
          <ul>
            {segments.map((seg) => {
              const meta = SEGMENT_KIND_LABEL[seg.kind] ?? { label: seg.kind, color: 'default' };
              const hop = (seg as unknown as { hop?: number }).hop;
              const isActive = hop === selectedHop;
              return (
                <li key={seg.segmentId}>
                  <button
                    type="button"
                    onClick={() => hop != null && onSelect(hop)}
                    className={`w-full px-4 py-2.5 text-left transition-colors border-l-[3px] ${isActive ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[11px] font-mono ${isActive ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>HOP {hop ?? '-'}</span>
                      <Tag color={meta.color} className="!text-[10px] !mr-0 !leading-[16px]">
                        {meta.label}
                      </Tag>
                    </div>
                    <EndpointLine seg={seg} />
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {fmtTimeOnly(seg.startTime)} · {fmtDuration(seg.durationSec)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

// segment 한 줄 — 발신 → 착신 (IE 일 때만 oName/tName 사용, 외엔 seg.label fallback)
function EndpointLine({ seg }: { seg: CallSegment }) {
  const raw = seg as unknown as {
    oName?: string | null;
    tName?: string | null;
    serviceName?: string | null;
    queueName?: string | null;
    agentName?: string | null;
    segmentType?: string;
  };
  const o = raw.oName ?? '';
  const t = raw.tName ?? '';
  if (o || t) {
    return (
      <div className="text-[11px] text-gray-700 truncate flex items-center gap-1">
        <span className="truncate min-w-0">{o || '-'}</span>
        <span className="text-gray-300 flex-shrink-0">→</span>
        <span className="truncate min-w-0">{t || '-'}</span>
      </div>
    );
  }
  // IR / IC: 의미 있는 이름 fallback
  const fallback = raw.serviceName || raw.queueName || raw.agentName || seg.label || '-';
  return <div className="text-[11px] text-gray-600 truncate">{fallback}</div>;
}

// ════════════════════════════════════════════════════════════════════
//  우측 IE CDR 시각화 패널
// ════════════════════════════════════════════════════════════════════
function IeCdrPanel({ ieRow }: { ieRow: Record<string, unknown> }) {
  const hop = num(ieRow.HOP);
  const ccType = num(ieRow.CC_TYPE);
  const ccTypeMeta = ccTypeColor(ccType);
  const ccPart = num(ieRow.CC_PART);
  const callKind = num(ieRow.CALL_KIND);
  const oMos = num(ieRow.O_MOS);
  const tMos = num(ieRow.T_MOS);
  const oJitterAvg = num(ieRow.O_JITTER_AVG);
  const tJitterAvg = num(ieRow.T_JITTER_AVG);
  const oJitterMax = num(ieRow.O_JITTER_MAX);
  const tJitterMax = num(ieRow.T_JITTER_MAX);
  const talkSec = num(ieRow.TALK_SEC);
  const answerSec = num(ieRow.ANSWER_SEC);

  return (
    <div className="p-5 space-y-4">
      {/* 1. 헤더 카드 — hop / 결과 / 시각 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-5">
        <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-50 text-blue-700 font-mono text-xl font-bold">{hop ?? '-'}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] text-gray-500">HOP</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${ccTypeMeta.bg} ${ccTypeMeta.color}`}>{ccTypeMeta.label}</span>
            {ccPart != null && <span className="text-[10px] text-gray-500">{CC_PART[ccPart] ?? ccPart}</span>}
            {callKind != null && <span className="text-[10px] text-gray-500">· {CALL_KIND_LABEL[callKind] ?? callKind}</span>}
          </div>
          <div className="flex items-center gap-6 text-[11px] text-gray-600">
            <div>
              시작 <span className="font-mono text-gray-800">{fmtCdrTime(ieRow.CREATE_TIME)}</span>
            </div>
            <div>
              응답 <span className="font-mono text-gray-800">{fmtCdrTime(ieRow.ANSWER_TIME)}</span>
            </div>
            <div>
              종료 <span className="font-mono text-gray-800">{fmtCdrTime(ieRow.END_TIME)}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">통화시간</div>
          <div className="text-[20px] font-mono font-semibold text-gray-800">{fmtDuration(talkSec)}</div>
          {answerSec != null && answerSec > 0 && <div className="text-[10px] text-gray-400">응답까지 {answerSec}s</div>}
        </div>
      </div>

      {/* 2. 발신 ↔ 착신 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <EndpointCard
          title="발신"
          accent="rose"
          lineType={num(ieRow.O_TYPE)}
          name={str(ieRow.O_NAME)}
          lrdn={str(ieRow.O_LRDN)}
          rn={str(ieRow.O_RN)}
          ac={str(ieRow.O_AC)}
          route={str(ieRow.O_ROUTE_NAME)}
          holdCnt={num(ieRow.O_HOLDCNT)}
          holdSec={num(ieRow.O_HOLDSEC)}
        />
        <EndpointCard
          title="착신"
          accent="sky"
          lineType={num(ieRow.T_TYPE)}
          name={str(ieRow.T_NAME)}
          lrdn={str(ieRow.T_LRDN)}
          rn={str(ieRow.T_RN)}
          ac={str(ieRow.T_AC)}
          route={str(ieRow.T_ROUTE_NAME)}
          holdCnt={num(ieRow.T_HOLDCNT)}
          holdSec={num(ieRow.T_HOLDSEC)}
        />
      </div>

      {/* 3. 통화 품질 — R-Factor 메인 + MOS/Jitter/Packet Loss/RTT 보조 */}
      <QualitySection
        oRFactor={num(ieRow.O_R_FACTOR)}
        tRFactor={num(ieRow.T_R_FACTOR)}
        oMos={oMos}
        tMos={tMos}
        oJitterAvg={oJitterAvg}
        tJitterAvg={tJitterAvg}
        oJitterMax={oJitterMax}
        tJitterMax={tJitterMax}
        oPacketLoss={num(ieRow.O_RTP_MS_LOST)}
        tPacketLoss={num(ieRow.T_RTP_MS_LOST)}
        oRtt={num(ieRow.O_ICMP_RTT)}
        tRtt={num(ieRow.T_ICMP_RTT)}
        oRemote={str(ieRow.O_REMOTE_ADDR)}
        tRemote={str(ieRow.T_REMOTE_ADDR)}
        oCodec={str(ieRow.O_NEGO_CODEC)}
        tCodec={str(ieRow.T_NEGO_CODEC)}
        oRtpRx={str(ieRow.O_RTP_RX)}
        oRtpTx={str(ieRow.O_RTP_TX)}
        tRtpRx={str(ieRow.T_RTP_RX)}
        tRtpTx={str(ieRow.T_RTP_TX)}
      />

      {/* 4. 식별/시스템 */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-[12px] font-medium text-gray-700 mb-2">식별 정보</div>
        <div className="grid grid-cols-4 gap-3 text-[11px]">
          <Mini label="시스템 ID" v={str(ieRow.SYSTEM_ID)} />
          <Mini label="노드 ID" v={str(ieRow.NODE_ID)} />
          <Mini label="테넌트" v={`${str(ieRow.TENANT_NAME)} (${str(ieRow.TENANT_ID)})`} />
          <Mini label="CSTA ID" v={str(ieRow.CSTA_ID)} />
        </div>
      </div>

      {/* 5. raw 컬럼 — collapsible */}
      <RawAccordion ieRow={ieRow} />
    </div>
  );
}

// ── 발/착신 카드 ────────────────────────────────────────────────────
function EndpointCard({
  title,
  accent,
  lineType,
  name,
  lrdn,
  rn,
  ac,
  route,
  holdCnt,
  holdSec,
}: {
  title: string;
  accent: 'rose' | 'sky';
  lineType: number | null;
  name: string;
  lrdn: string;
  rn: string;
  ac: string;
  route: string;
  holdCnt: number | null;
  holdSec: number | null;
}) {
  const accentMap = {
    rose: 'border-rose-200 bg-rose-50/40',
    sky: 'border-sky-200 bg-sky-50/40',
  } as const;
  const titleColor = accent === 'rose' ? 'text-rose-700' : 'text-sky-700';
  return (
    <div className={`rounded-lg border ${accentMap[accent]} p-3.5`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold ${titleColor} uppercase tracking-wider`}>{title}</span>
        {lineType != null && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">{LINE_TYPE[lineType] ?? lineType}</span>}
      </div>
      <div className="text-[13px] font-medium text-gray-800 mb-1 truncate">{name}</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-gray-600">
        <Mini label="중계번호" v={lrdn} mono />
        <Mini label="실번호" v={rn} mono />
        <Mini label="AC" v={ac} mono />
        <Mini label="라우트" v={route} />
        {holdCnt != null && holdCnt > 0 && <Mini label="홀드" v={`${holdCnt}회 / ${fmtDuration(holdSec)}`} />}
      </div>
    </div>
  );
}

// ── 통화 품질 섹션 — R-Factor 메인 + 보조 지표 ───────────────────────
function QualitySection(p: {
  oRFactor: number | null;
  tRFactor: number | null;
  oMos: number | null;
  tMos: number | null;
  oJitterAvg: number | null;
  tJitterAvg: number | null;
  oJitterMax: number | null;
  tJitterMax: number | null;
  oPacketLoss: number | null;
  tPacketLoss: number | null;
  oRtt: number | null;
  tRtt: number | null;
  oRemote: string;
  tRemote: string;
  oCodec: string;
  tCodec: string;
  oRtpRx: string;
  oRtpTx: string;
  tRtpRx: string;
  tRtpTx: string;
}) {
  // 어떤 지표도 없으면 카드 숨김 (메인+보조 지표 모두 확인)
  const anyData = [p.oRFactor, p.tRFactor, p.oMos, p.tMos, p.oJitterAvg, p.tJitterAvg, p.oPacketLoss, p.tPacketLoss, p.oRtt, p.tRtt].some((v) => v != null);
  if (!anyData) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="size-3.5 text-gray-400" />
        <span className="text-[12px] font-medium text-gray-700">통화 품질</span>
        <span className="text-[10px] text-gray-400">R-Factor 기준 등급</span>
      </div>

      {/* R-Factor 인디케이터 — 발신/착신 좌우 큰 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <RFactorCard side="발신" r={p.oRFactor} />
        <RFactorCard side="착신" r={p.tRFactor} />
      </div>

      {/* 보조 지표 — MOS / Jitter / Packet Loss / RTT */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-gray-100">
        <SubMetric label="MOS" oVal={fmtNum(p.oMos, 2)} tVal={fmtNum(p.tMos, 2)} hint="1-5점" />
        <SubMetric label="Jitter (ms)" oVal={`${fmtNum(p.oJitterAvg)} / ${fmtNum(p.oJitterMax)}`} tVal={`${fmtNum(p.tJitterAvg)} / ${fmtNum(p.tJitterMax)}`} hint="평균/최대" />
        <SubMetric label="Packet Loss" oVal={fmtNum(p.oPacketLoss)} tVal={fmtNum(p.tPacketLoss)} hint="누적 손실 패킷" />
        <SubMetric label="ICMP RTT (ms)" oVal={fmtNum(p.oRtt)} tVal={fmtNum(p.tRtt)} hint="네트워크 지연" />
      </div>

      {/* 회선 메타 */}
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
        <Mini label="발신 Remote" v={p.oRemote} mono />
        <Mini label="착신 Remote" v={p.tRemote} mono />
        <Mini label="발신 Codec" v={p.oCodec} />
        <Mini label="착신 Codec" v={p.tCodec} />
        <Mini label="발신 RTP RX/TX" v={`${p.oRtpRx} / ${p.oRtpTx}`} mono />
        <Mini label="착신 RTP RX/TX" v={`${p.tRtpRx} / ${p.tRtpTx}`} mono />
      </div>
    </div>
  );
}

function RFactorCard({ side, r }: { side: string; r: number | null }) {
  const g = rFactorGrade(r);
  const pct = r == null || r < 0 ? 0 : Math.max(0, Math.min(100, r));
  return (
    <div className={`rounded-md border border-gray-200 p-3 ring-1 ${g.ring}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">{side} 통화품질</span>
        <span className={`text-[11px] font-semibold ${g.text}`}>{g.label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[24px] font-mono font-semibold text-gray-800">{r != null && r >= 0 ? r.toFixed(0) : '-'}</span>
        <span className="text-[10px] text-gray-400">/ 100 (R-Factor)</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${g.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SubMetric({ label, oVal, tVal, hint }: { label: string; oVal: string; tVal: string; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-3 text-[12px]">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-gray-400 mr-1">발</span>
          <span className="font-mono text-gray-800">{oVal}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-gray-400 mr-1">착</span>
          <span className="font-mono text-gray-800">{tVal}</span>
        </div>
      </div>
    </div>
  );
}

function fmtNum(v: number | null, digits = 0): string {
  if (v == null) return '-';
  return digits > 0 ? v.toFixed(digits) : String(v);
}

// ── MOS 게이지 (남겨두지만 현재 사용 안 함) ──────────────────────────
function MosGauge({ label, mos }: { label: string; mos: number | null }) {
  const meta = mosColor(mos);
  const pct = mos == null ? 0 : Math.max(0, Math.min(100, (mos / 5) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="font-mono text-[13px] font-semibold text-gray-800">
          {mos != null ? mos.toFixed(1) : '-'} <span className="text-[10px] text-gray-400 font-normal">/ 5</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${meta.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {mos != null && <div className="text-[10px] text-gray-400 mt-0.5">{meta.label}</div>}
    </div>
  );
}

// ── 지터 bar ─────────────────────────────────────────────────────────
function JitterBar({ label, avg, max }: { label: string; avg: number | null; max: number | null }) {
  // jitter 30ms 이상이면 노출. bar 의 100% = max(max, 50ms)
  const range = Math.max(max ?? 0, avg ?? 0, 50);
  const avgPct = avg == null ? 0 : (avg / range) * 100;
  const maxPct = max == null ? 0 : (max / range) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="font-mono text-[11px] text-gray-700">
          평균 <strong>{avg ?? '-'}</strong> / 최대 <strong>{max ?? '-'}</strong> <span className="text-gray-400">ms</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-blue-300" style={{ width: `${avgPct}%` }} />
        <div className="absolute inset-y-0 w-[2px] bg-rose-500" style={{ left: `${Math.min(maxPct, 100)}%` }} />
      </div>
    </div>
  );
}

// ── 키-값 미니 ───────────────────────────────────────────────────────
function Mini({ label, v, mono = false }: { label: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] text-gray-800 truncate ${mono ? 'font-mono' : ''}`} title={v}>
        {v}
      </span>
    </div>
  );
}

function KV({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-gray-400">{label}</span>
      <span className={`text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

// ── IE_BASICCDR 컬럼 한글 라벨 (AS-IS IPR30S1060 SQL 의 ITEM_TITLE 매핑) ──
const IE_COL_LABEL: Record<string, string> = {
  CDR_SEQ: 'IE 호 고유 ID',
  UCID: 'UCID',
  HOP: 'HOP',
  SYSTEM_ID: '시스템 ID',
  CENTER_ID: '센터 ID',
  NODE_ID: '노드 ID',
  TENANT_ID: '테넌트 ID',
  TENANT_NAME: '테넌트명',
  CSTA_ID: 'CSTA ID',
  ANI: '최초 발신번호',
  DNIS: '최초 수신번호',
  OCN: '원착신번호',
  RDN: '전환발신번호',
  ANI_KIND_ID: 'ANI 유형 ID',
  ANI_KIND_NAME: 'ANI 유형',
  DNIS_KIND_ID: 'DNIS 유형 ID',
  DNIS_KIND_NAME: 'DNIS 유형',
  CALL_KIND: '최초 콜유형',
  CALL_TYPE: '마지막 콜유형',
  FIRST_YN: '최초 CDR',
  DID_YN: 'DID 여부',
  TRANS_YN: '호전달 여부',
  CONSLT_YN: '협의호 여부',
  REROUTE_YN: '재라우팅 여부',
  CONF_YN: '3자통화 여부',
  O_LRDN: '발신 중계번호',
  O_ON: '원발신번호',
  O_RN: '발신 실번호',
  O_AC: '발신 Access Code',
  O_NODE_ID: '발신 노드 ID',
  O_TENANT_ID: '발신 테넌트 ID',
  O_TYPE: '발신 회선유형',
  O_ID: '발신 회선 ID',
  O_NAME: '발신 회선명',
  O_CH: '발신 채널',
  O_ROUTE_ID: '발신 라우트 ID',
  O_ROUTE_NAME: '발신 라우트명',
  O_FIRST: '발신 최초연결',
  T_LRDN: '착신 중계번호',
  T_ON: '원착신번호',
  T_RN: '착신 실번호',
  T_AC: '착신 Access Code',
  T_NODE_ID: '착신 노드 ID',
  T_TENANT_ID: '착신 테넌트 ID',
  T_TYPE: '착신 회선유형',
  T_ID: '착신 회선 ID',
  T_NAME: '착신 회선명',
  T_CH: '착신 채널',
  T_ROUTE_ID: '착신 라우트 ID',
  T_ROUTE_NAME: '착신 라우트명',
  T_FIRST: '착신 최초연결',
  EMG_YN: '긴급호 구분',
  ERR_TRK_YN: '내선 트렁크 장애',
  ERR_CTI_YN: 'CTI 장애',
  CC_END: '통화 종료여부',
  CC_TYPE: '종료 구분',
  CC_PART: '종료 주체',
  CC_ERR_CODE: '종료사유 코드',
  CR_CONN: '통화 성공',
  CR_BUSY: '통화 중',
  CR_NOANS: '무응답',
  CR_NOFOUND: '결번',
  CR_UNREG: '미등록',
  CR_ETC: '기타',
  CREATE_TIME: '생성 시각',
  ANSWER_TIME: '응답 시각',
  END_TIME: '종료 시각',
  ANSWER_SEC: '응답까지 시간(초)',
  TALK_SEC: '통화시간(초)',
  O_HOLDCNT: '발신 홀드 횟수',
  O_HOLDSEC: '발신 홀드 시간(초)',
  T_HOLDCNT: '착신 홀드 횟수',
  T_HOLDSEC: '착신 홀드 시간(초)',
  BILL_NO: '과금 번호',
  O_USRGROUP_ID: '발신 사용자 그룹 ID',
  O_USER_ID: '발신 사용자 ID',
  T_USRGROUP_ID: '착신 사용자 그룹 ID',
  T_USER_ID: '착신 사용자 ID',
  BILL_USRGROUP_ID: '빌링 사용자 그룹 ID',
  BILL_USER_ID: '빌링 사용자 ID',
  LAST_CALL_KIND: '마지막 콜 종류',
  RTP_RELAY_TYPE: 'RTP 중개 타입',
  RTP_RELAY_MS_ID: 'RTP 중개 MS ID',
  O_RTP_MS_DELAY: '발신 MS중개 RTP Delay',
  T_RTP_MS_DELAY: '착신 MS중개 RTP Delay',
  O_RTP_MS_LOST: '발신 패킷 손실',
  T_RTP_MS_LOST: '착신 패킷 손실',
  O_RTP_GAP: '발신 RTP 갭',
  O_RTP_RX: '발신 RTP RX 패킷수',
  O_RTP_TX: '발신 RTP TX 패킷수',
  T_RTP_GAP: '착신 RTP 갭',
  T_RTP_RX: '착신 RTP RX 패킷수',
  T_RTP_TX: '착신 RTP TX 패킷수',
  O_INVALID_PAYLOAD_CNT: '발신 잘못된 페이로드 수',
  T_INVALID_PAYLOAD_CNT: '착신 잘못된 페이로드 수',
  O_ICMP_RTT: '발신 ICMP RTT (ms)',
  T_ICMP_RTT: '착신 ICMP RTT (ms)',
  O_R_FACTOR: '발신 R-Factor',
  T_R_FACTOR: '착신 R-Factor',
  O_MOS: '발신 MOS',
  T_MOS: '착신 MOS',
  O_REMOTE_ADDR: '발신 미디어 주소',
  T_REMOTE_ADDR: '착신 미디어 주소',
  O_NEGO_CODEC: '발신 협상 코덱',
  T_NEGO_CODEC: '착신 협상 코덱',
  O_S2N_RATIO: '발신 신호대 잡음비',
  T_S2N_RATIO: '착신 신호대 잡음비',
  O_SILENCE_RATIO: '발신 묵음 비율',
  T_SILENCE_RATIO: '착신 묵음 비율',
  O_JITTER_AVG: '발신 평균 Jitter',
  T_JITTER_AVG: '착신 평균 Jitter',
  O_JITTER_MAX: '발신 최대 Jitter',
  T_JITTER_MAX: '착신 최대 Jitter',
  // 가상/메타 컬럼
  DB_INSERT_TIME: 'DB 적재 시각',
  ORIGIN_DATETIME: '콜 시작 일시',
  ORIGIN_DATE: '시작 일자',
  ORIGIN_TIME: '시작 시각',
  IS_CALL_END: '콜 종료 여부 (가상)',
};

// ── raw 컬럼 collapsible ────────────────────────────────────────────
const HIDDEN_KEYS = new Set([
  // 시각화에서 이미 사용한 컬럼들 — raw 에서는 숨김
  'HOP',
  'CC_TYPE',
  'CC_PART',
  'CALL_KIND',
  'CREATE_TIME',
  'ANSWER_TIME',
  'END_TIME',
  'TALK_SEC',
  'ANSWER_SEC',
  'O_TYPE',
  'O_NAME',
  'O_LRDN',
  'O_RN',
  'O_AC',
  'O_ROUTE_NAME',
  'O_HOLDCNT',
  'O_HOLDSEC',
  'T_TYPE',
  'T_NAME',
  'T_LRDN',
  'T_RN',
  'T_AC',
  'T_ROUTE_NAME',
  'T_HOLDCNT',
  'T_HOLDSEC',
  'O_MOS',
  'T_MOS',
  'O_JITTER_AVG',
  'T_JITTER_AVG',
  'O_JITTER_MAX',
  'T_JITTER_MAX',
  'O_R_FACTOR',
  'T_R_FACTOR',
  'O_RTP_MS_LOST',
  'T_RTP_MS_LOST',
  'O_ICMP_RTT',
  'T_ICMP_RTT',
  'O_REMOTE_ADDR',
  'T_REMOTE_ADDR',
  'O_NEGO_CODEC',
  'T_NEGO_CODEC',
  'O_RTP_RX',
  'O_RTP_TX',
  'T_RTP_RX',
  'T_RTP_TX',
  'SYSTEM_ID',
  'NODE_ID',
  'TENANT_ID',
  'TENANT_NAME',
  'CSTA_ID',
  'UCID',
]);

function RawAccordion({ ieRow }: { ieRow: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => Object.entries(ieRow).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== ''), [ieRow]);
  if (entries.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <span className="text-[12px] font-medium text-gray-700">전체 raw 컬럼 ({entries.length})</span>
        {open ? <ChevronDown className="size-3.5 text-gray-400" /> : <ChevronRight className="size-3.5 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          <table className="text-[11px] w-full">
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-1 pr-3 align-top w-[220px]">
                    <div className="text-gray-700">{IE_COL_LABEL[k] ?? k}</div>
                    {IE_COL_LABEL[k] && <div className="text-[9px] text-gray-400 font-mono mt-0.5">{k}</div>}
                  </td>
                  <td className="py-1 font-mono break-all">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
