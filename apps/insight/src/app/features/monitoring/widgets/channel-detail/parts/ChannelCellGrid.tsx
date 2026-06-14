import { useMemo } from 'react';
import { toNum, toStr } from '../helpers';
import { ENTRY_PATH_LABELS, INOUT_KIND_LABELS, MEDIA_TYPE_LABELS, channelStatusMeta, isChannelBusy } from '../statusMap';
import type { ChannelRow } from '../types';

/**
 * 채널상태 격자 — AS-IS `SwatChannelMonitor`(monitoringV4.js)의 TO-BE.
 *
 * 셀 1개 = 채널 1개(CHNL_NO). 점유(isChannelBusy)는 색을 꽉 채워 점유율을 한눈에.
 * 점유 셀은 MEDIA_TYPE 라벨로 치환 + hover 시 진입경로·ANI·DNIS·UCID 팝오버.
 */
export interface ChannelCellGridProps {
  rows: ChannelRow[];
  irType: number | null;
}

interface Cell {
  key: string;
  no: string;
  status: number | null;
  hex: string;
  label: string;
  alert: boolean;
  fill: boolean;
  io: string;
  hasCtx: boolean;
  entry: string;
  media: string;
  ani: string;
  dnis: string;
  ucid: string;
  svc: string;
}

export default function ChannelCellGrid({ rows, irType }: ChannelCellGridProps) {
  const cells = useMemo<Cell[]>(
    () =>
      rows.map((r, i) => {
        const status = toNum(r.CHNL_STATUS);
        const meta = channelStatusMeta(status);
        const busy = isChannelBusy(irType, status);
        const isBusyState = status === 3;
        const mediaLabel = MEDIA_TYPE_LABELS[toNum(r.MEDIA_TYPE) ?? -1];
        const inout = toNum(r.INOUT_KIND);
        const hasCtx = status === 2 || status === 3 || status === 4;
        return {
          key: `${toStr(r.SYSTEM_ID)}_${toStr(r.CHNL_NO) || i}`,
          no: toStr(r.CHNL_NO) || '—',
          status,
          hex: meta.hex,
          label: isBusyState && mediaLabel ? mediaLabel : meta.label,
          alert: !!meta.alert,
          fill: busy,
          io: hasCtx && inout != null ? (INOUT_KIND_LABELS[inout] ?? '') : '',
          hasCtx,
          entry: ENTRY_PATH_LABELS[toNum(r.ENTRY_PATH) ?? -1] ?? '',
          media: mediaLabel ?? '',
          ani: toStr(r.SERVICE_ANI),
          dnis: toStr(r.SERVICE_DNIS),
          ucid: toStr(r.UCID),
          svc: toStr(r.SERVICE_ID),
        };
      }),
    [rows, irType],
  );

  if (cells.length === 0) {
    return <div className="flex h-full items-center justify-center text-[12px] text-gray-400">조회된 채널서비스가 없습니다.</div>;
  }

  return (
    <div className="grid gap-1.5 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))' }}>
      {cells.map((c) => (
        <div
          key={c.key}
          className={`group relative flex h-[46px] flex-col items-center justify-center gap-0.5 rounded-md border ${c.alert ? 'animate-pulse' : ''}`}
          style={c.fill ? { backgroundColor: c.hex, borderColor: c.hex } : { backgroundColor: `${c.hex}14`, borderColor: `${c.hex}55` }}
        >
          {c.io && (
            <span className="absolute right-1 top-0.5 text-[8px] font-extrabold" style={{ color: c.fill ? '#fff' : c.hex, opacity: 0.9 }}>
              {c.io}
            </span>
          )}
          <span className="font-mono text-[11px] font-bold leading-none tabular-nums" style={{ color: c.fill ? '#fff' : '#0a0a0b' }}>
            {c.no}
          </span>
          <span className="text-[10px] font-bold leading-none" style={{ color: c.fill ? '#fff' : c.hex }}>
            {c.label}
          </span>

          {c.hasCtx && (
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 hidden w-[180px] -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-2 text-left text-[11px] leading-relaxed text-white shadow-xl group-hover:block">
              <div className="mb-1 font-semibold">
                CH {c.no} · <span style={{ color: c.hex }}>{channelStatusMeta(c.status).label}</span>
                {c.io ? ` · ${c.io}` : ''}
              </div>
              {c.entry && (
                <div>
                  <span className="text-gray-400">진입</span> {c.entry}
                  {c.status === 3 && c.media ? ` · ${c.media}` : ''}
                </div>
              )}
              {c.ani && (
                <div>
                  <span className="text-gray-400">ANI</span> <span className="font-mono">{c.ani}</span>
                </div>
              )}
              {c.dnis && (
                <div>
                  <span className="text-gray-400">DNIS</span> <span className="font-mono">{c.dnis}</span>
                </div>
              )}
              {c.ucid && (
                <div>
                  <span className="text-gray-400">UCID</span> <span className="font-mono">{c.ucid}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">SVC</span> <span className="font-mono">{c.svc}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
