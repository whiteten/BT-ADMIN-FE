import { cloneElement, useMemo } from 'react';
import { Tooltip } from 'antd';
import { ListTree, Workflow } from 'lucide-react';
import { toNum, toStr } from '../helpers';
import { ENTRY_PATH_LABELS, INOUT_KIND_LABELS, MEDIA_TYPE_LABELS, channelStatusMeta, isChannelBusy } from '../statusMap';
import type { ChannelRow } from '../types';

/**
 * 채널상태 격자 — AS-IS `SwatChannelMonitor`(monitoringV4.js)의 TO-BE.
 *
 * 셀 1개 = 채널 1개(CHNL_NO). 점유(isChannelBusy)는 색을 꽉 채워 점유율을 한눈에.
 * 카드에 #채널번호·상태와 함께 시나리오명(SERVICE_NAME)·메뉴명(MENU_NAME)을 표기하고,
 * 점유 셀은 hover 시 진입경로·ANI·DNIS·UCID 팝오버로 상세를 보인다.
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
  service: string;
  menu: string;
}

export default function ChannelCellGrid({ rows, irType }: ChannelCellGridProps) {
  const cells = useMemo<Cell[]>(
    () =>
      [...rows]
        .sort((a, b) => (toNum(a.CHNL_NO) ?? 0) - (toNum(b.CHNL_NO) ?? 0))
        .map((r, i) => {
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
            service: toStr(r.SERVICE_NAME),
            menu: toStr(r.MENU_NAME),
          };
        }),
    [rows, irType],
  );

  if (cells.length === 0) {
    return <div className="flex h-full items-center justify-center text-[12px] text-gray-400">조회된 채널서비스가 없습니다.</div>;
  }

  return (
    <div className="grid gap-1.5 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))' }}>
      {cells.map((c) => {
        const fg = c.fill ? '#fff' : '#0a0a0b';
        const cell = (
          <div
            className={`relative flex h-full min-h-[58px] flex-col justify-center gap-1 rounded-md border px-2.5 py-1.5 ${c.alert ? 'animate-pulse' : ''}`}
            style={c.fill ? { backgroundColor: c.hex, borderColor: c.hex } : { backgroundColor: `${c.hex}14`, borderColor: `${c.hex}55` }}
          >
            {/* 헤더 — #채널번호 · 상태 · (I/O) */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[12px] font-bold leading-none tabular-nums" style={{ color: fg }}>
                #{c.no}
              </span>
              <span
                className="rounded px-1 py-0.5 text-[9px] font-bold leading-none"
                style={c.fill ? { background: 'rgba(255,255,255,0.22)', color: '#fff' } : { background: `${c.hex}1f`, color: c.hex }}
              >
                {c.label}
              </span>
              {c.io && (
                <span className="ml-auto text-[9px] font-extrabold leading-none" style={{ color: c.fill ? '#fff' : c.hex, opacity: 0.9 }}>
                  {c.io}
                </span>
              )}
            </div>

            {/* 시나리오명 · 메뉴명 — 항상 2줄을 렌더하고 빈 줄은 invisible 처리(공간은 유지, 표시만 숨김)해
                콜 유무와 무관하게 박스 높이를 픽셀 단위로 고정한다(콜 인입 시 크기로 통일). */}
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className={`flex min-w-0 items-center gap-1 ${c.service ? '' : 'invisible'}`} title={c.service} style={{ color: fg }}>
                <Workflow size={10} strokeWidth={2.2} className="shrink-0 opacity-70" />
                <span className="truncate text-[10.5px] font-semibold">{c.service || ' '}</span>
              </div>
              <div className={`flex min-w-0 items-center gap-1 ${c.menu ? '' : 'invisible'}`} title={c.menu} style={{ color: c.fill ? 'rgba(255,255,255,0.85)' : '#64748b' }}>
                <ListTree size={10} strokeWidth={2.2} className="shrink-0 opacity-70" />
                <span className="truncate text-[10px]">{c.menu || ' '}</span>
              </div>
            </div>
          </div>
        );

        // 점유/활성 셀만 상세 툴팁. body 로 포털되어 스크롤 컨테이너(overflow-auto)에 잘리지 않는다.
        if (!c.hasCtx) return cloneElement(cell, { key: c.key });

        const tip = (
          <div className="text-[11px] leading-relaxed">
            <div className="mb-1 font-semibold">
              CH {c.no} · <span style={{ color: c.hex }}>{channelStatusMeta(c.status).label}</span>
              {c.io ? ` · ${c.io}` : ''}
            </div>
            {c.service && (
              <div>
                <span className="text-gray-400">시나리오</span> {c.service}
              </div>
            )}
            {c.menu && (
              <div>
                <span className="text-gray-400">메뉴</span> {c.menu}
              </div>
            )}
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
        );

        return (
          <Tooltip key={c.key} title={tip} placement="top" mouseEnterDelay={0.05} overlayStyle={{ maxWidth: 220 }}>
            {cell}
          </Tooltip>
        );
      })}
    </div>
  );
}
