/**
 * IR 서비스 로그 본문 — pretty viewer (AS-IS IPR30S1060_logViewer.jsp 패턴 미러).
 *
 * 기능
 *  - 줄바꿈을 라인으로 분리 + 검정 배경 + D2 Coding monospace
 *  - ‡파일명/itemCode‡ → 노랑색 시각 마커
 *  - †암호†             → 파랑색 시각 마커
 *  - 텍스트 검색: 입력하면 자동 형광색 highlight + ↑↓ 네비
 *  - Finder navigation: 콤보박스(텍스트/멘트/암호화) + ↑↓ + "n/N" 카운트 + 스크롤 이동
 *  - 복사 / 다운로드
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { Input, Select, message } from 'antd';
import { ChevronDown, ChevronUp, Copy, Download, Search } from 'lucide-react';

interface Props {
  body: string;
  ucid: string;
  hop: number | string;
  maxHeight?: string;
  /**
   * 본문의 `onclick="Detail('파일', position, length)"` 같은 attribute 가 있는 span 클릭 시 호출.
   * SIP 로그 본문의 화살표 → SIP 메시지 raw 상세 모달 열기에 사용.
   */
  onDetailClick?: (detailRaw: string) => void;
  /**
   * SIP 로그 모드 — 멘트(‡‡)/암호화(††) finder 옵션 숨김 (IR 서비스 로그 전용 기능).
   */
  hideMarkerFinder?: boolean;
}

type FinderKind = 'text' | 'ment' | 'encrypt';

// 마커 + ANSI escape (\x1B[숫자(;숫자)*m) 동시 인식
const MARKER_REGEX = /(‡[^‡]+?‡|†[^†]+?†)/g;
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[([\d;]*)m/g;

// AS-IS JSP 가 SIP 로그 응답에 사용하는 클래스 (.ar1~6 화살표/전경, .lb1~6 라벨/배경)
// SWAT IPR30S1060.jsp .pop-logview span.* — sip.png 캡처 기준 색상 매칭
const HTML_SPAN_REGEX = /<span\s+class\s*=\s*['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/span>/gi;
const JSP_CLASS_STYLE: Record<string, AnsiStyle> = {
  ar1: { fg: '#ff6b6b' }, // 연한 빨강 (channel 1, TRK 화살표)
  ar2: { fg: '#5fcb5f' }, // 연한 초록 (channel 2, IE 화살표)
  ar3: { fg: '#5bc0de' }, // 시안 (channel 3, EXT 화살표)
  ar4: { fg: '#f59e0b' }, // 주황 (channel 4)
  ar5: { fg: '#a78bfa' }, // 보라 (channel 5)
  ar6: { fg: '#ec4899' }, // 핑크 (channel 6)
  // bold 의도적 비활성 — 일부 monospace 폰트의 bold 가 등폭 보존 안 함 → ASCII art 정렬 깨짐
  lb1: { fg: '#000000', bg: '#ff6b6b' },
  lb2: { fg: '#000000', bg: '#5fcb5f' },
  lb3: { fg: '#000000', bg: '#5bc0de' },
  lb4: { fg: '#000000', bg: '#f59e0b' },
  lb5: { fg: '#ffffff', bg: '#a78bfa' },
  lb6: { fg: '#ffffff', bg: '#ec4899' },
};

const ANSI_FG: Record<string, string> = {
  '30': '#1f2937',
  '31': '#f87171',
  '32': '#4ade80',
  '33': '#fbbf24',
  '34': '#60a5fa',
  '35': '#c084fc',
  '36': '#22d3ee',
  '37': '#e5e7eb',
  '90': '#9ca3af',
  '91': '#fca5a5',
  '92': '#86efac',
  '93': '#fde047',
  '94': '#93c5fd',
  '95': '#d8b4fe',
  '96': '#67e8f9',
  '97': '#ffffff',
};
const ANSI_BG: Record<string, string> = {
  '40': '#000000',
  '41': '#7f1d1d',
  '42': '#166534',
  '43': '#854d0e',
  '44': '#1e3a8a',
  '45': '#581c87',
  '46': '#155e75',
  '47': '#374151',
  '100': '#374151',
  '101': '#991b1b',
  '102': '#15803d',
  '103': '#a16207',
  '104': '#1d4ed8',
  '105': '#7e22ce',
  '106': '#0e7490',
  '107': '#d1d5db',
};

interface AnsiStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** ANSI 코드들 (예: "32", "1;44") 을 누적 스타일에 반영. 0 은 리셋. */
function applyAnsi(style: AnsiStyle, codes: string): AnsiStyle {
  const parts = codes ? codes.split(';') : ['0'];
  let next: AnsiStyle = { ...style };
  for (const p of parts) {
    if (p === '' || p === '0') {
      next = {};
      continue;
    }
    if (p === '1') {
      next.bold = true;
      continue;
    }
    if (p === '22') {
      next.bold = false;
      continue;
    }
    if (ANSI_FG[p]) {
      next.fg = ANSI_FG[p];
      continue;
    }
    if (ANSI_BG[p]) {
      next.bg = ANSI_BG[p];
      continue;
    }
    if (p === '39') {
      delete next.fg;
      continue;
    }
    if (p === '49') {
      delete next.bg;
      continue;
    }
  }
  return next;
}

type Token = { kind: 'text' | 'ment' | 'encrypt' | 'search'; value: string; style?: AnsiStyle; detailRaw?: string };

/** HTML &amp; / &lt; / &gt; / &quot; / &amp;#39 디코딩 (간단한 케이스). */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// onclick="Detail('파일',N,N)" — 외부 따옴표(" 또는 ') 와 내부 따옴표가 달라서 character class 로 합치면 잘림.
// 두 패턴을 OR 로 분리 (외 " 면 안 ' 허용, 외 ' 면 안 " 허용)
const ONCLICK_REGEX = /onclick\s*=\s*"([^"]+)"|onclick\s*=\s*'([^']+)'/i;

/** 라인을 JSP HTML span 클래스 기반으로 1차 분리. onclick 속성도 추출 (SIP 메시지 Detail 호출). */
function splitByHtmlSpan(line: string): Array<{ value: string; style: AnsiStyle; detailRaw?: string }> {
  if (!line) return [{ value: '', style: {} }];
  if (!line.includes('<span')) return [{ value: line, style: {} }];
  const out: Array<{ value: string; style: AnsiStyle; detailRaw?: string }> = [];
  let cursor = 0;
  for (const m of line.matchAll(HTML_SPAN_REGEX)) {
    if (m.index! > cursor) out.push({ value: line.slice(cursor, m.index!), style: {} });
    const classes = m[1].split(/\s+/);
    let style: AnsiStyle = {};
    for (const c of classes) if (JSP_CLASS_STYLE[c]) style = { ...style, ...JSP_CLASS_STYLE[c] };
    // span 의 onclick="..." 추출 (있으면 Detail call 으로 추정)
    const onclickMatch = m[0].match(ONCLICK_REGEX);
    // group [1] = " 따옴표 / group [2] = ' 따옴표 — 매칭된 쪽 사용
    const detailRaw = onclickMatch ? (onclickMatch[1] ?? onclickMatch[2]) : undefined;
    out.push({ value: decodeHtmlEntities(m[2]), style, detailRaw });
    cursor = m.index! + m[0].length;
  }
  if (cursor < line.length) out.push({ value: line.slice(cursor), style: {} });
  return out;
}

/** 라인을 ANSI escape 기반 segment 로 1차 분리 (text/segment 의 style 유지). */
function splitByAnsi(line: string): Array<{ value: string; style: AnsiStyle }> {
  if (!line) return [{ value: '', style: {} }];
  const out: Array<{ value: string; style: AnsiStyle }> = [];
  let cursor = 0;
  let style: AnsiStyle = {};
  for (const m of line.matchAll(ANSI_REGEX)) {
    if (m.index! > cursor) out.push({ value: line.slice(cursor, m.index!), style });
    style = applyAnsi(style, m[1]);
    cursor = m.index! + m[0].length;
  }
  if (cursor < line.length) out.push({ value: line.slice(cursor), style });
  return out;
}

/** ANSI 와 HTML span 두 방식을 모두 처리. style 누적 merge. detailRaw 보존. */
function splitByStyle(line: string): Array<{ value: string; style: AnsiStyle; detailRaw?: string }> {
  // 1차: HTML span 분리
  const stage1 = splitByHtmlSpan(line);
  // 2차: 각 segment 안에 ANSI escape 있으면 추가 분리하고 style 누적
  const stage2: Array<{ value: string; style: AnsiStyle; detailRaw?: string }> = [];
  for (const seg of stage1) {
    const ansiParts = splitByAnsi(seg.value);
    for (const p of ansiParts) {
      stage2.push({ value: p.value, style: { ...seg.style, ...p.style }, detailRaw: seg.detailRaw });
    }
  }
  return stage2;
}

/** 한 줄을 ANSI → 마커 → 검색어 순서로 토큰화. */
function tokenizeLine(line: string, searchTerm: string): Token[] {
  if (!line) return [{ kind: 'text', value: '' }];

  // 0) HTML span 클래스 + ANSI escape 기준 segment 분리 (style merge)
  const ansiSegments = splitByStyle(line);

  // 1) 각 ansi segment 안에서 마커(‡‡, ††) 분리 (detailRaw 보존)
  const stage1: Token[] = [];
  for (const seg of ansiSegments) {
    if (!seg.value) continue;
    let cursor = 0;
    for (const m of seg.value.matchAll(MARKER_REGEX)) {
      if (m.index! > cursor) stage1.push({ kind: 'text', value: seg.value.slice(cursor, m.index!), style: seg.style, detailRaw: seg.detailRaw });
      const raw = m[0];
      if (raw.startsWith('‡')) {
        stage1.push({ kind: 'ment', value: raw.slice(1, -1), style: seg.style, detailRaw: seg.detailRaw });
      } else {
        stage1.push({ kind: 'encrypt', value: raw.slice(1, -1), style: seg.style, detailRaw: seg.detailRaw });
      }
      cursor = m.index! + raw.length;
    }
    if (cursor < seg.value.length) stage1.push({ kind: 'text', value: seg.value.slice(cursor), style: seg.style, detailRaw: seg.detailRaw });
  }

  // 2) text 토큰에 한해 검색어 매칭 분리 (style/detailRaw 유지)
  if (!searchTerm) return stage1;
  const re = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  const stage2: Token[] = [];
  for (const t of stage1) {
    if (t.kind !== 'text' || !t.value) {
      stage2.push(t);
      continue;
    }
    let last = 0;
    for (const m of t.value.matchAll(re)) {
      if (m.index! > last) stage2.push({ kind: 'text', value: t.value.slice(last, m.index!), style: t.style, detailRaw: t.detailRaw });
      stage2.push({ kind: 'search', value: m[0], style: t.style, detailRaw: t.detailRaw });
      last = m.index! + m[0].length;
    }
    if (last < t.value.length) stage2.push({ kind: 'text', value: t.value.slice(last), style: t.style, detailRaw: t.detailRaw });
  }
  return stage2;
}

// 모든 inline span 에 강제하는 등폭 보존 옵션 — 부모 pre 의 letter-spacing/font-kerning 을
// span 이 어디서 override 받지 못하게 명시. fontFamily 도 inherit 명시.
const MONO_INHERIT: React.CSSProperties = {
  fontFamily: 'inherit',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 0,
  fontKerning: 'none' as React.CSSProperties['fontKerning'],
};

function styleToCss(s?: AnsiStyle): React.CSSProperties {
  const css: React.CSSProperties = { ...MONO_INHERIT };
  if (s?.fg) css.color = s.fg;
  if (s?.bg) css.backgroundColor = s.bg;
  if (s?.bold) css.fontWeight = 700;
  return css;
}

function MentMarker({ value, style }: { value: string; style?: AnsiStyle }) {
  return (
    <span data-finder="ment" className="text-yellow-300 font-bold cursor-default" style={styleToCss(style)}>
      ‡{value}‡
    </span>
  );
}

function EncryptMarker({ value, style }: { value: string; style?: AnsiStyle }) {
  return (
    <span data-finder="encrypt" className="text-sky-400 font-bold cursor-default" style={styleToCss(style)}>
      †{value}†
    </span>
  );
}

function SearchHit({ value }: { value: string }) {
  return (
    <span data-finder="text" className="bg-yellow-400 text-black font-semibold rounded-sm px-0.5">
      {value}
    </span>
  );
}

function TextSpan({ value, style, detailRaw, onDetailClick }: { value: string; style?: AnsiStyle; detailRaw?: string; onDetailClick?: (detailRaw: string) => void }) {
  const clickable = !!(detailRaw && onDetailClick);
  const css = styleToCss(style);
  if (clickable) css.cursor = 'pointer';
  return (
    <span
      style={css}
      className={clickable ? 'hover:brightness-125 hover:underline' : undefined}
      onMouseDown={
        clickable
          ? (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[SipMsg] Detail click', detailRaw);
              onDetailClick!(detailRaw!);
            }
          : undefined
      }
      title={clickable ? 'SIP 메시지 상세 보기' : undefined}
    >
      {value}
    </span>
  );
}

export default function IrLogPrettyView({ body, ucid, hop, maxHeight, onDetailClick, hideMarkerFinder }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [finderKind, setFinderKind] = useState<FinderKind>('text');
  const [finderIndex, setFinderIndex] = useState(0);
  const [finderTotal, setFinderTotal] = useState(0);

  const lines = body.split(/\r?\n/);
  const trimmedSearch = searchTerm.trim();

  useEffect(() => {
    if (!preRef.current) return;
    const matches = preRef.current.querySelectorAll(`[data-finder="${finderKind}"]`);
    setFinderTotal(matches.length);
    setFinderIndex(0);
  }, [finderKind, body, trimmedSearch]);

  // 검색어 입력 시 자동으로 text finder 로 전환 (사용자가 다른 종류 선택 중일 때만)
  useEffect(() => {
    if (trimmedSearch && finderKind !== 'text') setFinderKind('text');
  }, [trimmedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (delta: number) => {
    if (!preRef.current || finderTotal === 0) return;
    const matches = preRef.current.querySelectorAll<HTMLElement>(`[data-finder="${finderKind}"]`);
    const nextIdx = (finderIndex + delta + finderTotal) % finderTotal;
    setFinderIndex(nextIdx);
    const target = matches[nextIdx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ring-2', 'ring-orange-400');
      setTimeout(() => target.classList.remove('ring-2', 'ring-orange-400'), 1500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    message.success('복사됨');
  };

  const handleDownload = () => {
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeUcid = (ucid ?? 'log').slice(0, 8);
    const hopStr = String(hop).padStart(4, '0');
    const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    a.download = `ir-svc-log_${safeUcid}_${hopStr}_${ts}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 키보드 단축키: Enter → 다음, Shift+Enter → 이전 (검색 input focus 중)
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigate(e.shiftKey ? -1 : 1);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 툴바 */}
      <div className="flex items-center gap-2 text-[12px] flex-wrap">
        <Input
          size="small"
          placeholder="본문 검색 (Enter / Shift+Enter)"
          prefix={<Search size={12} className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={onSearchKey}
          allowClear
          style={{ width: 240 }}
        />
        <span className="text-gray-400">|</span>
        <span className="text-gray-500">찾기</span>
        <Select
          size="small"
          value={finderKind}
          onChange={(v) => setFinderKind(v)}
          style={{ width: 140 }}
          options={
            hideMarkerFinder
              ? [{ value: 'text', label: '🟧 검색어' }]
              : [
                  { value: 'text', label: '🟧 검색어' },
                  { value: 'ment', label: '🟡 멘트' },
                  { value: 'encrypt', label: '🔵 암호화' },
                ]
          }
        />
        <button
          className="inline-flex items-center px-1.5 py-1 text-gray-600 hover:text-blue-600 border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => navigate(-1)}
          disabled={finderTotal === 0}
          title="이전 (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          className="inline-flex items-center px-1.5 py-1 text-gray-600 hover:text-blue-600 border border-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => navigate(1)}
          disabled={finderTotal === 0}
          title="다음 (Enter)"
        >
          <ChevronDown size={14} />
        </button>
        <span className="text-gray-500 font-mono text-[11px] min-w-[50px]">{finderTotal === 0 ? '0/0' : `${finderIndex + 1}/${finderTotal}`}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-2 py-1 rounded"
            onClick={handleCopy}
            title="본문 전체 복사"
          >
            <Copy size={12} /> 복사
          </button>
          <button
            className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-2 py-1 rounded"
            onClick={handleDownload}
            title=".log 파일 다운로드"
          >
            <Download size={12} /> 다운로드
          </button>
        </div>
      </div>

      {/* 본문 */}
      <pre
        ref={preRef}
        className="rounded border border-gray-700 overflow-auto text-[12px] leading-[1.3] p-3"
        style={{
          backgroundColor: '#000',
          color: '#F1F1F1',
          // 등폭 폰트 — Windows 우선 (D2 Coding 없으면 Cascadia / Consolas 순)
          fontFamily: "'D2 Coding','Cascadia Mono','Consolas','Lucida Console','Courier New',monospace",
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 0,
          fontKerning: 'none' as React.CSSProperties['fontKerning'],
          // 공백/줄바꿈 100% 보존 (nowrap 은 연속 공백 collapse 시켜 ASCII art 정렬 깨짐)
          whiteSpace: 'pre',
          maxHeight: maxHeight ?? '500px',
        }}
      >
        {lines.length === 0 || (lines.length === 1 && lines[0] === '') ? (
          <span className="text-gray-500">(빈 로그)</span>
        ) : (
          lines.map((line, i) => {
            const tokens = tokenizeLine(line, trimmedSearch);
            return (
              <Fragment key={i}>
                {tokens.length === 0 || tokens.every((t) => !t.value)
                  ? ' ' /* nbsp - 빈 라인 한 줄 차지 */
                  : tokens.map((t, j) => {
                      if (t.kind === 'text') return <TextSpan key={j} value={t.value} style={t.style} detailRaw={t.detailRaw} onDetailClick={onDetailClick} />;
                      if (t.kind === 'ment') return <MentMarker key={j} value={t.value} style={t.style} />;
                      if (t.kind === 'encrypt') return <EncryptMarker key={j} value={t.value} style={t.style} />;
                      return <SearchHit key={j} value={t.value} />;
                    })}
                {i < lines.length - 1 ? '\n' : null}
              </Fragment>
            );
          })
        )}
      </pre>
    </div>
  );
}
