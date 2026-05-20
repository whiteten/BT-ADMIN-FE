/**
 * 콜 상세 페이지 상단 헤더 — UCID 중심 + 메타 grid + 상태 배지.
 *
 * prototype-call-detail.html 톤:
 *  - 상단 라인: UCID(mono) + 결과 배지 + 재전환 카운터
 *  - 메타 grid: 시작/종료/통화시간/상담사 + ANI/DNIS/큐/노드테넌트
 *  - 우측 액션: 마스킹 해제 요청 / 엑셀 다운로드
 *  - ANI 마스킹 시 lock 아이콘 + 권한 시 unlock 버튼
 */
import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { ArrowLeft, Copy, Download, Lock, Unlock } from 'lucide-react';
import type { CallDetailHeader, CallResult } from '../types/tracking.types';

interface Props {
  header: CallDetailHeader;
  canRequestUnmask?: boolean;
  onRequestUnmask?: () => void;
  onExport?: () => void;
  onBackToList?: () => void;
}

const RESULT_BADGE: Record<CallResult, { bg: string; text: string; ring: string; label: string; emoji: string }> = {
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: '정상 종료', emoji: '✅' },
  ABANDONED: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', label: '포기', emoji: '🚪' },
  DISCONNECTED: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', label: '호장애', emoji: '🔴' },
  IVR_SELF: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', label: 'IVR 자가해결', emoji: '📞' },
  TRANSFERRED: { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-200', label: '호 전환', emoji: '🔀' },
  NO_ANSWER: { bg: 'bg-gray-100', text: 'text-gray-600', ring: 'ring-gray-200', label: '미응답', emoji: '🔇' },
};

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const fmtDuration = (sec: number | null): string => {
  if (sec == null) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function MetaCell({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10.5px] uppercase tracking-wider text-gray-400 font-medium flex-shrink-0 w-[68px]">{label}</span>
      <span className={`text-[12.5px] text-gray-800 truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{children}</span>
    </div>
  );
}

export default function CallSummaryHeader({ header, canRequestUnmask = false, onRequestUnmask, onExport, onBackToList }: Props) {
  const badge = header.result ? RESULT_BADGE[header.result] : null;
  const [copied, setCopied] = useState(false);

  const copyUcid = () => {
    navigator.clipboard?.writeText(header.ucid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="bg-white rounded-md border border-gray-200 px-5 py-4 flex-shrink-0 shadow-[0_1px_2px_0_rgba(56,65,74,0.15)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 상단: UCID + 배지 */}
          <div className="flex items-center gap-2.5 flex-wrap mb-3">
            <span className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-semibold">UCID</span>
            <span className="font-mono text-[12.5px] text-gray-700 select-all max-w-[420px] truncate" title={header.ucid}>
              {header.ucid}
            </span>
            <Tooltip title={copied ? '복사됨' : '복사'}>
              <button
                type="button"
                onClick={copyUcid}
                className="size-5 inline-flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Copy className="size-3" />
              </button>
            </Tooltip>

            {badge && (
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                <span aria-hidden>{badge.emoji}</span>
                <span>{badge.label}</span>
              </span>
            )}

            {header.transferCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">재전환 {header.transferCount}회</span>
            )}
          </div>

          {/* grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
            <MetaCell label="시작" mono>
              {fmtDateTime(header.startTime)}
            </MetaCell>
            <MetaCell label="종료" mono>
              {fmtDateTime(header.endTime)}
            </MetaCell>
            <MetaCell label="통화시간" mono>
              {fmtDuration(header.durationSec)}
            </MetaCell>
            <MetaCell label="상담사">
              {header.agentName ? (
                <>
                  <span className="font-medium">{header.agentName}</span>
                  <span className="text-gray-400 ml-1">({header.agentId})</span>
                </>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </MetaCell>

            <MetaCell label="ANI" mono>
              <span className="inline-flex items-center gap-1.5">
                {header.ani ?? <span className="text-gray-300">-</span>}
                {header.aniMasked && (
                  <Tooltip title="개인정보 마스킹 적용됨">
                    <Lock className="size-3 text-gray-400" />
                  </Tooltip>
                )}
              </span>
            </MetaCell>
            <MetaCell label="DNIS" mono>
              {header.dnis ?? <span className="text-gray-300">-</span>}
            </MetaCell>
            <MetaCell label="큐">{header.queueName ?? <span className="text-gray-300">-</span>}</MetaCell>
            <MetaCell label="노드/테넌트">
              <span className="text-gray-700">{header.nodeName ?? <span className="text-gray-300">-</span>}</span>
              <span className="text-gray-300 mx-1">/</span>
              <span className="font-medium">{header.tenantName ?? <span className="text-gray-300">-</span>}</span>
            </MetaCell>
          </div>
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {header.aniMasked && header.unmaskAvailable && canRequestUnmask && (
            <Button size="small" icon={<Unlock className="size-3.5" />} onClick={onRequestUnmask}>
              마스킹 해제
            </Button>
          )}
          {onExport && (
            <Button size="small" type="default" icon={<Download className="size-3.5" />} onClick={onExport}>
              엑셀
            </Button>
          )}
          {onBackToList && (
            <Button size="small" type="default" icon={<ArrowLeft className="size-3.5" />} onClick={onBackToList}>
              목록으로
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
