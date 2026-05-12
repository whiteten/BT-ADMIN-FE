/**
 * 콜 상세 페이지 상단 헤더 — UCID/ANI/DNIS/시각/마스킹 해제 버튼.
 *
 * 마스킹 해제 요청 버튼:
 *  - 권한(canRequestUnmask=true) 보유 시 클릭 가능
 *  - 클릭 → manager 앱의 unmask-request 모달 호출 (TODO: Phase 2 — 현재는 placeholder)
 */
import { Button } from 'antd';
import { Download, Lock, Unlock } from 'lucide-react';
import type { CallDetailHeader, CallResult } from '../types/tracking.types';

interface Props {
  header: CallDetailHeader;
  /** 마스킹 해제 요청 권한 보유 여부 */
  canRequestUnmask?: boolean;
  onRequestUnmask?: () => void;
  onExport?: () => void;
}

const RESULT_BADGE: Record<CallResult, { color: string; label: string; emoji: string }> = {
  COMPLETED: { color: 'bg-emerald-50 text-emerald-700', label: '정상', emoji: '✅' },
  ABANDONED: { color: 'bg-amber-50 text-amber-700', label: '포기', emoji: '🚪' },
  DISCONNECTED: { color: 'bg-red-50 text-red-700', label: '호단절', emoji: '🔴' },
  IVR_SELF: { color: 'bg-blue-50 text-blue-700', label: 'IVR 자가해결', emoji: '📞' },
  TRANSFERRED: { color: 'bg-purple-50 text-purple-700', label: '호 전환', emoji: '🔀' },
  NO_ANSWER: { color: 'bg-gray-100 text-gray-600', label: '미응답', emoji: '🔇' },
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

export default function CallSummaryHeader({ header, canRequestUnmask = false, onRequestUnmask, onExport }: Props) {
  const badge = header.result ? RESULT_BADGE[header.result] : null;

  return (
    <div className="bg-white bt-shadow rounded-md border border-gray-200 p-4 flex-shrink-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-gray-400">UCID</span>
            <span className="font-mono text-[12px] text-gray-700 select-all">{header.ucid}</span>
            {header.transferCount > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-50 text-red-700 rounded">재전환 {header.transferCount}회</span>}
            {badge && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${badge.color}`}>
                {badge.emoji} {badge.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">시작</span>
              <span className="text-gray-800 font-mono">{fmtDateTime(header.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">종료</span>
              <span className="text-gray-800 font-mono">{fmtDateTime(header.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">통화시간</span>
              <span className="text-gray-800 font-mono">{fmtDuration(header.durationSec)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">상담사</span>
              <span className="text-gray-800">{header.agentName ? `${header.agentName} (${header.agentId})` : '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">ANI</span>
              <span className="text-gray-800 font-mono inline-flex items-center gap-1">
                {header.ani ?? '-'}
                {header.aniMasked && <Lock className="size-3 text-gray-400" />}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">DNIS</span>
              <span className="text-gray-800 font-mono">{header.dnis ?? '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">큐</span>
              <span className="text-gray-800">{header.queueName ?? '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">노드/테넌트</span>
              <span className="text-gray-800">
                {header.nodeName ?? '-'} / {header.tenantName ?? '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {header.aniMasked && header.unmaskAvailable && canRequestUnmask && (
            <Button size="small" icon={<Unlock className="size-3" />} onClick={onRequestUnmask}>
              마스킹 해제 요청
            </Button>
          )}
          {onExport && (
            <Button size="small" icon={<Download className="size-3" />} onClick={onExport}>
              엑셀
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
