/**
 * 카드 프리셋 — table 위젯의 viewMode='cards'에서 각 행(해시 엔트리)을 카드로 렌더할 때 쓰는 "안전한" 템플릿.
 *
 * <p>사용자가 원시 HTML을 넣는 게 아니라, 개발자가 만든 React 컴포넌트(프리셋)를 "고르고" 슬롯에 컬럼만
 * 매핑한다. 데이터 값은 전부 JSX 텍스트로 들어가 React가 자동 escape하므로 XSS가 원천적으로 불가능하다
 * (innerHTML/ dangerouslySetInnerHTML 미사용). 폐쇄망·AI 미사용 환경 요건 충족.</p>
 */
import type { JSX } from 'react';

export type CardSlotKind = 'text' | 'number' | 'badge' | 'image';

export interface CardSlot {
  /** 프리셋 내부 슬롯 키(cardConfig.slotMap의 키). */
  key: string;
  /** 에디터에 표시할 라벨. */
  label: string;
  /** 슬롯 성격(에디터 힌트/렌더 처리용). */
  kind?: CardSlotKind;
}

export interface CardPresetRenderProps {
  /** slotKey → 값(문자열). 매핑 안 된 슬롯은 ''. */
  data: Record<string, string>;
  /** 강조 색상. */
  accent: string;
}

export interface CardPreset {
  id: string;
  name: string;
  /** 채워야 할 슬롯 목록(에디터가 이 순서로 컬럼 매핑 UI를 그린다). */
  slots: CardSlot[];
  /** 색상 미지정 시 기본 강조색. */
  defaultAccent: string;
  /** 카드 1개 렌더(전체 박스 포함). */
  Render: (p: CardPresetRenderProps) => JSX.Element;
}

/** 값이 비면 대체 텍스트. */
const v = (s: string | undefined, fallback = '-') => (s?.trim() ? s : fallback);

// ─── 1. 통계 카드: 제목 + 큰 값 + 뱃지 ──────────────────────────────────────
const statCard: CardPreset = {
  id: 'stat',
  name: '통계 카드',
  defaultAccent: '#0f5b9e',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'value', label: '큰 값', kind: 'number' },
    { key: 'badge', label: '뱃지(선택)', kind: 'badge' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${accent}33`,
        background: '#ffffff',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
        {data.badge?.trim() && <span style={{ fontSize: '0.65em', fontWeight: 700, color: '#fff', background: accent, borderRadius: 999, padding: '1px 7px' }}>{data.badge}</span>}
      </div>
      <span style={{ fontSize: '1.7em', fontWeight: 800, color: accent, lineHeight: 1.1 }}>{v(data.value, '0')}</span>
    </div>
  ),
};

// ─── 2. 상담원 프로필: 아바타 + 이름 + 상태 + 보조 ──────────────────────────
const agentCard: CardPreset = {
  id: 'agent',
  name: '상담원 프로필',
  defaultAccent: '#059669',
  slots: [
    { key: 'photo', label: '사진 URL(선택)', kind: 'image' },
    { key: 'name', label: '이름', kind: 'text' },
    { key: 'status', label: '상태', kind: 'badge' },
    { key: 'sub', label: '보조(통화수 등)', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: 10,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {data.photo?.trim() ? (
        <img src={data.photo} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${accent}` }} />
      ) : (
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            flexShrink: 0,
            background: `${accent}22`,
            color: accent,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.95em',
          }}
        >
          {v(data.name, '?').slice(0, 1)}
        </span>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.name)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {data.status?.trim() && (
            <span style={{ fontSize: '0.62em', fontWeight: 700, color: accent, background: `${accent}18`, borderRadius: 999, padding: '1px 6px' }}>{data.status}</span>
          )}
          {data.sub?.trim() && <span style={{ fontSize: '0.72em', color: '#94a3b8' }}>{data.sub}</span>}
        </span>
      </div>
    </div>
  ),
};

// ─── 3. 진행바 카드: 라벨 + 값 + 바 ─────────────────────────────────────────
const progressCard: CardPreset = {
  id: 'progress',
  name: '진행바 카드',
  defaultAccent: '#7c3aed',
  slots: [
    { key: 'title', label: '라벨', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
    { key: 'max', label: '최대값(선택, 기본100)', kind: 'number' },
  ],
  Render: ({ data, accent }) => {
    const val = Number(data.value) || 0;
    const max = Number(data.max) || 100;
    const pct = Math.max(0, Math.min(100, max > 0 ? (val / max) * 100 : 0));
    return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          padding: '10px 12px',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: '0.8em', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
          <span style={{ fontSize: '0.95em', fontWeight: 800, color: accent }}>{v(data.value, '0')}</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: '#eef2f7', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: accent }} />
        </div>
      </div>
    );
  },
};

// ─── 4. 키-값 리스트 카드: 제목 + 3줄(라벨:값) ──────────────────────────────
const kvCard: CardPreset = {
  id: 'kv',
  name: '키-값 리스트',
  defaultAccent: '#0ea5e9',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'l1', label: '항목1 라벨', kind: 'text' },
    { key: 'v1', label: '항목1 값', kind: 'text' },
    { key: 'l2', label: '항목2 라벨', kind: 'text' },
    { key: 'v2', label: '항목2 값', kind: 'text' },
    { key: 'l3', label: '항목3 라벨', kind: 'text' },
    { key: 'v3', label: '항목3 값', kind: 'text' },
  ],
  Render: ({ data, accent }) => {
    const rows = [
      [data.l1, data.v1],
      [data.l2, data.v2],
      [data.l3, data.v3],
    ].filter(([l, val]) => (l && l.trim()) || (val && val.trim()));
    return (
      <div
        style={{
          borderRadius: 10,
          border: `1px solid ${accent}33`,
          background: '#fff',
          padding: '9px 12px',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span style={{ fontSize: '0.82em', fontWeight: 700, color: accent, borderBottom: `1px solid ${accent}22`, paddingBottom: 3, marginBottom: 2 }}>{v(data.title)}</span>
        {rows.map(([l, val], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.78em' }}>
            <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(l)}</span>
            <span style={{ color: '#334155', fontWeight: 600, flexShrink: 0 }}>{v(val)}</span>
          </div>
        ))}
      </div>
    );
  },
};

// ─── 5. 큰 숫자 카드: accent 배경 + 초대형 숫자 + 캡션 ───────────────────────
const bigNumberCard: CardPreset = {
  id: 'bigNumber',
  name: '큰 숫자',
  defaultAccent: '#e11d48',
  slots: [
    { key: 'value', label: '숫자', kind: 'number' },
    { key: 'caption', label: '캡션', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 12,
        background: accent,
        color: '#fff',
        padding: '12px 14px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <span style={{ fontSize: '2.1em', fontWeight: 900, lineHeight: 1 }}>{v(data.value, '0')}</span>
      <span style={{ fontSize: '0.78em', opacity: 0.9, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {v(data.caption)}
      </span>
    </div>
  ),
};

// ─── 6. 신호등 상태 카드: 좌측 컬러 점 + 이름 + 상태 텍스트 ─────────────────
const statusLightCard: CardPreset = {
  id: 'statusLight',
  name: '신호등 상태',
  defaultAccent: '#16a34a',
  slots: [
    { key: 'name', label: '이름', kind: 'text' },
    { key: 'status', label: '상태', kind: 'badge' },
    { key: 'sub', label: '보조 값(선택)', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ position: 'relative', width: 12, height: 12, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: `0 0 0 3px ${accent}22` }} />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.name)}</span>
        {data.status?.trim() && <span style={{ fontSize: '0.72em', color: accent, fontWeight: 600 }}>{data.status}</span>}
      </div>
      {data.sub?.trim() && <span style={{ fontSize: '0.95em', fontWeight: 800, color: '#334155', flexShrink: 0 }}>{data.sub}</span>}
    </div>
  ),
};

// ─── 7. 증감 트렌드 카드: 제목 + 값 + 증감(▲/▼) ────────────────────────────
const trendCard: CardPreset = {
  id: 'trend',
  name: '증감 트렌드',
  defaultAccent: '#2563eb',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
    { key: 'delta', label: '증감(선택, 음수 가능)', kind: 'number' },
  ],
  Render: ({ data, accent }) => {
    const delta = Number(data.delta);
    const hasDelta = data.delta?.trim() !== '' && !Number.isNaN(delta);
    const up = delta >= 0;
    const deltaColor = up ? '#dc2626' : '#2563eb';
    return (
      <div
        style={{
          borderRadius: 10,
          border: `1px solid ${accent}33`,
          background: '#fff',
          padding: '10px 12px',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '0.78em', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: '1.6em', fontWeight: 800, color: accent, lineHeight: 1 }}>{v(data.value, '0')}</span>
          {hasDelta && (
            <span style={{ fontSize: '0.8em', fontWeight: 700, color: deltaColor }}>
              {up ? '▲' : '▼'} {Math.abs(delta)}
            </span>
          )}
        </div>
      </div>
    );
  },
};

// ─── 8. 도넛 비율 카드: conic-gradient 원 + 중앙 % ──────────────────────────
const donutCard: CardPreset = {
  id: 'donut',
  name: '도넛 비율',
  defaultAccent: '#0d9488',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
    { key: 'max', label: '최대값(선택, 기본100)', kind: 'number' },
  ],
  Render: ({ data, accent }) => {
    const val = Number(data.value) || 0;
    const max = Number(data.max) || 100;
    const pct = Math.max(0, Math.min(100, max > 0 ? (val / max) * 100 : 0));
    return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          padding: 10,
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            borderRadius: '50%',
            flexShrink: 0,
            background: `conic-gradient(${accent} ${pct * 3.6}deg, #eef2f7 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.72em', fontWeight: 800, color: accent }}>{Math.round(pct)}%</span>
          </div>
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: '0.8em', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
          <span style={{ fontSize: '1.1em', fontWeight: 800, color: '#334155' }}>{v(data.value, '0')}</span>
        </div>
      </div>
    );
  },
};

// ─── 9. 랭킹 카드: 순위 배지 + 이름 + 값 ────────────────────────────────────
const rankingCard: CardPreset = {
  id: 'ranking',
  name: '랭킹',
  defaultAccent: '#d97706',
  slots: [
    { key: 'rank', label: '순위', kind: 'text' },
    { key: 'name', label: '이름', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: '9px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          background: accent,
          color: '#fff',
          fontWeight: 900,
          fontSize: '0.85em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {v(data.rank, '-')}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.85em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {v(data.name)}
      </span>
      <span style={{ fontSize: '1em', fontWeight: 800, color: accent, flexShrink: 0 }}>{v(data.value, '0')}</span>
    </div>
  ),
};

// ─── 10. 좌우 비교 카드: 두 값 나란히 ───────────────────────────────────────
const compareCard: CardPreset = {
  id: 'compare',
  name: '좌우 비교',
  defaultAccent: '#0f5b9e',
  slots: [
    { key: 'leftLabel', label: '왼쪽 라벨', kind: 'text' },
    { key: 'leftValue', label: '왼쪽 값', kind: 'number' },
    { key: 'rightLabel', label: '오른쪽 라벨', kind: 'text' },
    { key: 'rightValue', label: '오른쪽 값', kind: 'number' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
        <span style={{ fontSize: '0.72em', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.leftLabel)}</span>
        <span style={{ fontSize: '1.3em', fontWeight: 800, color: accent }}>{v(data.leftValue, '0')}</span>
      </div>
      <span style={{ fontSize: '0.7em', color: '#cbd5e1', fontWeight: 700, flexShrink: 0 }}>VS</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
        <span style={{ fontSize: '0.72em', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.rightLabel)}</span>
        <span style={{ fontSize: '1.3em', fontWeight: 800, color: '#334155' }}>{v(data.rightValue, '0')}</span>
      </div>
    </div>
  ),
};

// ─── 11. 미니 막대 카드: 제목 + 5개 값 막대 ─────────────────────────────────
const sparkBarsCard: CardPreset = {
  id: 'sparkBars',
  name: '미니 막대',
  defaultAccent: '#7c3aed',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'b1', label: '값1', kind: 'number' },
    { key: 'b2', label: '값2', kind: 'number' },
    { key: 'b3', label: '값3', kind: 'number' },
    { key: 'b4', label: '값4', kind: 'number' },
    { key: 'b5', label: '값5', kind: 'number' },
  ],
  Render: ({ data, accent }) => {
    const bars = [
      { key: 'b1', n: Number(data.b1) || 0 },
      { key: 'b2', n: Number(data.b2) || 0 },
      { key: 'b3', n: Number(data.b3) || 0 },
      { key: 'b4', n: Number(data.b4) || 0 },
      { key: 'b5', n: Number(data.b5) || 0 },
    ];
    const peak = Math.max(1, ...bars.map((b) => b.n));
    return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          padding: '9px 12px',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <span style={{ fontSize: '0.78em', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 30 }}>
          {bars.map((b) => (
            <span key={b.key} style={{ flex: 1, height: `${Math.max(8, (b.n / peak) * 100)}%`, background: accent, borderRadius: 3, opacity: 0.85 }} />
          ))}
        </div>
      </div>
    );
  },
};

// ─── 12. 경고 배너 카드: 좌측 accent 바 + 제목 + 메시지 ──────────────────────
const alertCard: CardPreset = {
  id: 'alert',
  name: '경고 배너',
  defaultAccent: '#dc2626',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'message', label: '메시지', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div style={{ borderRadius: 10, background: `${accent}0f`, border: `1px solid ${accent}33`, height: '100%', boxSizing: 'border-box', display: 'flex', overflow: 'hidden' }}>
      <span style={{ width: 5, flexShrink: 0, background: accent }} />
      <div style={{ padding: '9px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
        <span style={{ fontSize: '0.82em', fontWeight: 800, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
        <span style={{ fontSize: '0.76em', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.message)}</span>
      </div>
    </div>
  ),
};

// ─── 13. 시간 카드: 큰 시간 + 캡션 ──────────────────────────────────────────
const clockCard: CardPreset = {
  id: 'clock',
  name: '시간',
  defaultAccent: '#334155',
  slots: [
    { key: 'time', label: '시간/값', kind: 'text' },
    { key: 'caption', label: '캡션', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <span style={{ fontSize: '1.7em', fontWeight: 800, color: accent, letterSpacing: 1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v(data.time, '--:--')}</span>
      <span style={{ fontSize: '0.74em', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
        {v(data.caption)}
      </span>
    </div>
  ),
};

// ─── 14. 이니셜 아이콘 통계 카드: 사각 이니셜 + 값 + 라벨 ────────────────────
const iconStatCard: CardPreset = {
  id: 'iconStat',
  name: '아이콘 통계',
  defaultAccent: '#0891b2',
  slots: [
    { key: 'icon', label: '아이콘 글자(선택)', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
    { key: 'label', label: '라벨', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        padding: 10,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          flexShrink: 0,
          background: `${accent}18`,
          color: accent,
          fontWeight: 900,
          fontSize: '1.1em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {v(data.icon || data.label, '#').slice(0, 1)}
      </span>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: '1.4em', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{v(data.value, '0')}</span>
        <span style={{ fontSize: '0.74em', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.label)}</span>
      </div>
    </div>
  ),
};

// ─── 15. 듀얼 메트릭 카드: 제목 + 두 지표(라벨/값 ×2) ────────────────────────
const dualMetricCard: CardPreset = {
  id: 'dualMetric',
  name: '듀얼 메트릭',
  defaultAccent: '#4f46e5',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'l1', label: '지표1 라벨', kind: 'text' },
    { key: 'v1', label: '지표1 값', kind: 'number' },
    { key: 'l2', label: '지표2 라벨', kind: 'text' },
    { key: 'v2', label: '지표2 값', kind: 'number' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${accent}33`,
        background: '#fff',
        padding: '9px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      <span style={{ fontSize: '0.78em', fontWeight: 700, color: accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: '0.68em', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.l1)}</span>
          <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#334155' }}>{v(data.v1, '0')}</span>
        </div>
        <span style={{ width: 1, background: '#e2e8f0', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: '0.68em', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.l2)}</span>
          <span style={{ fontSize: '1.05em', fontWeight: 800, color: '#334155' }}>{v(data.v2, '0')}</span>
        </div>
      </div>
    </div>
  ),
};

// ─── 16. 태그 리스트 카드: 제목 + pill 3개 ──────────────────────────────────
const pillTagsCard: CardPreset = {
  id: 'pillTags',
  name: '태그 리스트',
  defaultAccent: '#0ea5e9',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 't1', label: '태그1', kind: 'text' },
    { key: 't2', label: '태그2', kind: 'text' },
    { key: 't3', label: '태그3', kind: 'text' },
  ],
  Render: ({ data, accent }) => {
    const tags = [
      { key: 't1', val: data.t1 },
      { key: 't2', val: data.t2 },
      { key: 't3', val: data.t3 },
    ].filter((t) => t.val?.trim());
    return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          padding: '9px 12px',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span style={{ fontSize: '0.8em', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags.length === 0 ? (
            <span style={{ fontSize: '0.72em', color: '#cbd5e1' }}>-</span>
          ) : (
            tags.map((t) => (
              <span key={t.key} style={{ fontSize: '0.68em', fontWeight: 600, color: accent, background: `${accent}15`, borderRadius: 999, padding: '2px 8px' }}>
                {t.val}
              </span>
            ))
          )}
        </div>
      </div>
    );
  },
};

// ─── 17. 원형 진행 링 카드: conic 링 + 중앙 값 ──────────────────────────────
const ringCard: CardPreset = {
  id: 'ring',
  name: '원형 진행 링',
  defaultAccent: '#059669',
  slots: [
    { key: 'value', label: '값', kind: 'number' },
    { key: 'max', label: '최대값(선택, 기본100)', kind: 'number' },
    { key: 'caption', label: '캡션', kind: 'text' },
  ],
  Render: ({ data, accent }) => {
    const val = Number(data.value) || 0;
    const max = Number(data.max) || 100;
    const pct = Math.max(0, Math.min(100, max > 0 ? (val / max) * 100 : 0));
    return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          padding: 8,
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: `conic-gradient(${accent} ${pct * 3.6}deg, #eef2f7 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.82em', fontWeight: 800, color: '#334155' }}>{v(data.value, '0')}</span>
          </div>
        </div>
        {data.caption?.trim() && (
          <span style={{ fontSize: '0.72em', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {data.caption}
          </span>
        )}
      </div>
    );
  },
};

// ─── 18. 헤더-바디 카드: accent 헤더 줄 + 본문 큰 값 ─────────────────────────
const headerBodyCard: CardPreset = {
  id: 'headerBody',
  name: '헤더-바디',
  defaultAccent: '#be123c',
  slots: [
    { key: 'header', label: '헤더', kind: 'text' },
    { key: 'value', label: '큰 값', kind: 'number' },
    { key: 'sub', label: '보조(선택)', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        background: '#fff',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{ background: accent, color: '#fff', padding: '4px 10px', fontSize: '0.74em', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {v(data.header)}
      </div>
      <div style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: '1.5em', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{v(data.value, '0')}</span>
        {data.sub?.trim() && <span style={{ fontSize: '0.72em', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.sub}</span>}
      </div>
    </div>
  ),
};

// ─── 19. 레벨 바 카드: 세로 게이지 바 + 값 + 라벨 ───────────────────────────
const levelBarCard: CardPreset = {
  id: 'levelBar',
  name: '레벨 바',
  defaultAccent: '#ea580c',
  slots: [
    { key: 'label', label: '라벨', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
    { key: 'max', label: '최대값(선택, 기본100)', kind: 'number' },
  ],
  Render: ({ data, accent }) => {
    const val = Number(data.value) || 0;
    const max = Number(data.max) || 100;
    const pct = Math.max(0, Math.min(100, max > 0 ? (val / max) * 100 : 0));
    return (
      <div
        style={{
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          background: '#fff',
          padding: 10,
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'stretch',
          gap: 10,
        }}
      >
        <div
          style={{ width: 9, borderRadius: 999, background: '#eef2f7', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}
        >
          <span style={{ width: '100%', height: `${pct}%`, background: accent, borderRadius: 999 }} />
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
          <span style={{ fontSize: '1.4em', fontWeight: 800, color: accent, lineHeight: 1.1 }}>{v(data.value, '0')}</span>
          <span style={{ fontSize: '0.74em', color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.label)}</span>
        </div>
      </div>
    );
  },
};

// ─── 20. 리본 카드: 우상단 리본 태그 + 제목 + 값 ────────────────────────────
const ribbonCard: CardPreset = {
  id: 'ribbon',
  name: '리본 강조',
  defaultAccent: '#9333ea',
  slots: [
    { key: 'ribbon', label: '리본 텍스트', kind: 'badge' },
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        position: 'relative',
        borderRadius: 10,
        border: `1px solid ${accent}33`,
        background: '#fff',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {data.ribbon?.trim() && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: -22,
            transform: 'rotate(38deg)',
            background: accent,
            color: '#fff',
            fontSize: '0.6em',
            fontWeight: 700,
            padding: '2px 24px',
          }}
        >
          {data.ribbon}
        </span>
      )}
      <span style={{ fontSize: '0.78em', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 24 }}>
        {v(data.title)}
      </span>
      <span style={{ fontSize: '1.6em', fontWeight: 800, color: accent, lineHeight: 1 }}>{v(data.value, '0')}</span>
    </div>
  ),
};

// ─── 21. 좌측 강조바 카드: 굵은 컬러 세로 바 + 제목 + 값 ────────────────────
const leftAccentCard: CardPreset = {
  id: 'leftAccent',
  name: '좌측 강조바',
  defaultAccent: '#0f5b9e',
  slots: [
    { key: 'title', label: '제목', kind: 'text' },
    { key: 'value', label: '값', kind: 'number' },
    { key: 'sub', label: '보조(선택)', kind: 'text' },
  ],
  Render: ({ data, accent }) => (
    <div
      style={{
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${accent}`,
        background: '#fff',
        padding: '10px 12px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: '0.78em', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v(data.title)}</span>
      <span style={{ fontSize: '1.5em', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{v(data.value, '0')}</span>
      {data.sub?.trim() && (
        <span style={{ fontSize: '0.72em', color: accent, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.sub}</span>
      )}
    </div>
  ),
};

export const CARD_PRESETS: CardPreset[] = [
  statCard,
  agentCard,
  progressCard,
  kvCard,
  bigNumberCard,
  statusLightCard,
  trendCard,
  donutCard,
  rankingCard,
  compareCard,
  sparkBarsCard,
  alertCard,
  clockCard,
  iconStatCard,
  dualMetricCard,
  pillTagsCard,
  ringCard,
  headerBodyCard,
  levelBarCard,
  ribbonCard,
  leftAccentCard,
];

export function getCardPreset(id: string | undefined): CardPreset {
  return CARD_PRESETS.find((p) => p.id === id) ?? CARD_PRESETS[0];
}
