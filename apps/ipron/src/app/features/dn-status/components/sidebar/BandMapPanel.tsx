/**
 * 사이드바 번호 대역 탭 (목업 renderSidebarBandMap) — B안 선언 대역.
 *
 * 선언 대역별 세그먼트 바(연속 구간 segments) + 선언 대역 목록(행 hover 삭제) + 가용 유휴 구간(크기순).
 * BE DnBandStatus.bands[].segments 로 렌더(free 필터·정렬은 FE). [대역 등록] → DnBandModal.
 */
import { useMemo } from 'react';
import { Button, Popconfirm } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import type { BandSegment, BandUsage, DnBandStatus } from '../../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface BandMapPanelProps {
  nodeName: string;
  bandStatus: DnBandStatus | undefined;
  isLoading: boolean;
  onAddBand: () => void;
  onDeleteBand: (bandId: number) => void;
  deletingBandId: number | null;
}

/** 세그먼트 타입 → 색상 (목업 색 계승) */
const SEG_COLOR: Record<BandSegment['segType'], string> = {
  edn: '#405189',
  adn: '#059669',
  tdn: '#d97706',
  gdn: '#7c3aed',
  other: '#6b7280',
  free: '#86efac',
};
const SEG_LABEL: Record<BandSegment['segType'], string> = {
  edn: '내선',
  adn: '상담사 ADN',
  tdn: 'SIP트렁크 채널',
  gdn: 'GDN',
  other: '기타',
  free: '유휴',
};

/** 선언 대역 1개 = 세그먼트 바 (capacity 대비 폭 비례) */
function BandBar({ band }: { band: BandUsage }) {
  const cap = band.capacity || 1;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-mono font-medium text-gray-700">
          {band.startNo}–{band.endNo}
        </span>
        <span className="text-gray-500">
          사용 {band.usedTotal.toLocaleString()} / 유휴 {band.freeCount.toLocaleString()}
        </span>
      </div>
      <div className="flex h-7 overflow-hidden rounded bg-gray-200">
        {band.segments.map((seg, i) => {
          const pct = (seg.count / cap) * 100;
          return (
            <div
              key={i}
              title={`${seg.startNo}–${seg.endNo} ${SEG_LABEL[seg.segType]} ${seg.count.toLocaleString()}개`}
              className="h-full flex-shrink-0 border-r border-white/40 last:border-r-0"
              style={{ width: `${pct}%`, background: SEG_COLOR[seg.segType] }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function BandMapPanel({ nodeName, bandStatus, isLoading, onAddBand, onDeleteBand, deletingBandId }: BandMapPanelProps) {
  const bands = useMemo(() => bandStatus?.bands ?? [], [bandStatus]);

  // 가용 유휴 구간 (전 대역의 free 세그먼트, 크기순)
  const freeSegs = useMemo(() => {
    const all: { startNo: string; endNo: string; count: number }[] = [];
    for (const b of bands) for (const s of b.segments) if (s.segType === 'free') all.push({ startNo: s.startNo, endNo: s.endNo, count: s.count });
    return all.sort((a, b) => b.count - a.count);
  }, [bands]);

  return (
    <div className="flex flex-col">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-gray-700">번호 대역 ({nodeName})</span>
        <Button size="small" icon={<Plus className="size-3" />} onClick={onAddBand}>
          대역 등록
        </Button>
      </div>

      {isLoading ? (
        <FallbackSpinner />
      ) : bands.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center text-[12px] text-gray-400">
          등록된 대역이 없습니다.
          <br />
          <span className="text-[11px] text-gray-400">우측 상단 [대역 등록] 버튼으로 번호 대역을 추가하세요.</span>
        </div>
      ) : (
        <>
          {/* 색상 범례 */}
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
            {(Object.entries(SEG_LABEL) as [keyof typeof SEG_LABEL, string][]).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-sm" style={{ background: SEG_COLOR[k] }} />
                {label}
              </span>
            ))}
          </div>

          {/* 대역별 세그먼트 바 */}
          <div className="mb-4">
            {bands.map((b) => (
              <BandBar key={b.bandId} band={b} />
            ))}
          </div>

          {/* 선언된 대역 목록 */}
          <div className="mb-1.5 text-[11px] font-semibold text-gray-700">선언된 대역 목록</div>
          <div className="mb-4 flex flex-col gap-1">
            {bands.map((b) => (
              <div key={b.bandId} className="group flex items-center gap-2 border-b border-gray-50 py-1 text-[11px]">
                <span className="min-w-[100px] font-mono font-medium text-gray-700">
                  {b.startNo}–{b.endNo}
                </span>
                {b.memo ? <span className="flex-1 truncate text-[10px] text-gray-500">{b.memo}</span> : <span className="flex-1" />}
                <Popconfirm
                  title="대역 삭제"
                  description="이 대역 선언을 삭제하시겠습니까?"
                  okText="삭제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDeleteBand(b.bandId)}
                >
                  <button
                    type="button"
                    disabled={deletingBandId === b.bandId}
                    className="flex-shrink-0 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 disabled:opacity-40"
                    title="삭제"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </Popconfirm>
              </div>
            ))}
          </div>

          {/* 가용 유휴 대역 (크기순) */}
          {freeSegs.length > 0 && (
            <>
              <div className="mb-1.5 text-[11px] font-semibold text-gray-700">가용 유휴 대역 (크기순)</div>
              <div className="flex flex-col gap-1">
                {freeSegs.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="inline-block size-2 flex-shrink-0 rounded-sm" style={{ background: SEG_COLOR.free }} />
                    <span className="font-mono font-medium text-gray-700">
                      {s.startNo}–{s.endNo}
                    </span>
                    <span className="text-gray-500">연속 {s.count.toLocaleString()}개</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
