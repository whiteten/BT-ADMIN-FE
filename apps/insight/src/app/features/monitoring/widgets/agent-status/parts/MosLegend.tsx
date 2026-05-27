import { Popover } from 'antd';
import { Info } from 'lucide-react';
import type { MosLevel } from '../helpers';

/**
 * MoS 품질 안내 — 레거시 `ieExtDnStatus.jsp` 의 `.mos-info-tooltip` 6단계 설명과 동일.
 *
 * 위젯 영역에 1회만 표시하는 인포 버튼 (카드 마다 반복 X).
 * 클릭/호버 시 Popover 에 6단계 색상·라벨·설명을 표시한다.
 */
export interface MosLevelMeta {
  level: MosLevel;
  label: string;
  range: string;
  /** Tailwind bg-* class */
  dotBg: string;
  /** Tailwind text-* class */
  text: string;
  /** raw hex (외부 컴포넌트에서 사용 시) */
  hex: string;
  desc: string;
}

/** MoS 6단계 메타. 카드 인디케이터와 동일 색을 공유한다. */
export const MOS_META: Record<MosLevel, MosLevelMeta> = {
  good: {
    level: 'good',
    label: '좋음',
    range: '4.0 이상',
    dotBg: 'bg-emerald-500',
    text: 'text-emerald-600',
    hex: '#10b981',
    desc: '통화 품질이 매우 좋으며, 사용자들이 높은 만족도를 보입니다. 텔레포니 환경에서 기대되는 최고 수준의 품질입니다.',
  },
  normal: {
    level: 'normal',
    label: '보통',
    range: '3.5 ~ 3.9',
    dotBg: 'bg-lime-500',
    text: 'text-lime-600',
    hex: '#84cc16',
    desc: '통화 품질이 수용 가능한 수준이며, 약간의 품질 저하는 인지되지만 통화하는 데 큰 불편함은 없습니다. 일반적인 VoIP 서비스의 최소 목표치입니다.',
  },
  bad: {
    level: 'bad',
    label: '나쁨',
    range: '3.0 ~ 3.4',
    dotBg: 'bg-amber-500',
    text: 'text-amber-600',
    hex: '#f59e0b',
    desc: '품질 저하가 명확하게 인지되며, 통화 중 이해하기 어려운 부분이 발생할 수 있습니다. 사용자 만족도가 낮아지기 시작하는 경계선입니다.',
  },
  verybad: {
    level: 'verybad',
    label: '매우나쁨',
    range: '2.0 ~ 2.9',
    dotBg: 'bg-red-500',
    text: 'text-red-600',
    hex: '#ef4444',
    desc: '통화 품질이 매우 낮아 의사소통에 심각한 장애를 초래하며, 서비스 사용을 중단할 가능성이 높습니다.',
  },
  unaccept: {
    level: 'unaccept',
    label: '허용불가',
    range: '1.0 ~ 1.9',
    dotBg: 'bg-red-900',
    text: 'text-red-900',
    hex: '#991b1b',
    desc: '통화가 거의 불가능하거나, 품질이 너무 낮아 사용자가 즉시 전화를 끊을 수준입니다.',
  },
  unavail: {
    level: 'unavail',
    label: '미사용',
    range: '1.0 미만',
    dotBg: 'bg-gray-400',
    text: 'text-gray-500',
    hex: '#9ca3af',
    desc: '음성 중계가 없거나 미디어 미사용 채널측 표기입니다.',
  },
};

const ORDER: MosLevel[] = ['good', 'normal', 'bad', 'verybad', 'unaccept', 'unavail'];

export default function MosLegend() {
  const content = (
    <div className="w-[320px] space-y-2 py-1">
      <div className="text-sm font-semibold text-gray-900">MoS 품질 안내</div>
      <div className="space-y-2">
        {ORDER.map((k) => {
          const m = MOS_META[k];
          return (
            <div key={k} className="flex gap-2">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${m.dotBg}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 text-xs">
                  <span className={`font-semibold ${m.text}`}>{m.label}</span>
                  <span className="font-mono text-gray-400 tabular-nums">{m.range}</span>
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-gray-500">{m.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover content={content} title={null} placement="bottomRight" trigger={['hover', 'click']}>
      <button
        type="button"
        aria-label="MoS 품질 등급 안내"
        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
      >
        <Info className="w-3.5 h-3.5" />
        <span>MoS 안내</span>
      </button>
    </Popover>
  );
}
