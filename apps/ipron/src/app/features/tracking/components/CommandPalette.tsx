/**
 * 명령어 팔레트 (⌘K) — 콜트래킹 검색 입력.
 *
 * Ant Design Modal 위에 입력 + 문법 가이드 + 빠른 프리셋 칩.
 * SD-CALL-TRACKING.md § 7.2 검색 문법 정확히 준수.
 *
 * UX:
 *  - ⌘K / Ctrl+K 어디서든 열기 (TrackingSearchPage에서 글로벌 핸들러)
 *  - Enter → onSubmit
 *  - Esc  → 닫기
 *  - 칩 클릭 → 입력창에 추가
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Modal } from 'antd';
import { Calendar, Clock, Search, Star, Trash2 } from 'lucide-react';
import type { DateRangePreset, RecentSearch } from '../types/tracking.types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  initialValue?: string;
  /** Enter 시 raw 문자열 그대로 부모에 전달 — 부모가 parseSearchSyntax로 파싱 */
  onSubmit: (rawQuery: string) => void;
  /** 최근 검색 (LocalStorage) */
  recentSearches?: RecentSearch[];
  onRecentSelect?: (item: RecentSearch) => void;
  onRecentClear?: () => void;
}

// 문법 가이드 (cmdk 우측 패널)
const SYNTAX_GUIDE: Array<{ prefix: string; description: string; example: string }> = [
  { prefix: 'ucid:', description: 'UCID 단건', example: 'ucid:abc123' },
  { prefix: 'ani:', description: '발신번호 (4~11자리)', example: 'ani:01012345678' },
  { prefix: 'dnis:', description: '수신번호', example: 'dnis:1588' },
  { prefix: 'agent:', description: '상담사 ID', example: 'agent:7001' },
  { prefix: 'queue:', description: '큐 ID', example: 'queue:200' },
  { prefix: 'tenant:', description: '테넌트 ID', example: 'tenant:200' },
  { prefix: 'node:', description: '노드 ID', example: 'node:10' },
  { prefix: 'scenario:', description: 'IVR 시나리오 ID', example: 'scenario:1234' },
  { prefix: 'result:', description: '통화 결과 (다중 가능)', example: 'result:포기,단절' },
  { prefix: '시간:', description: '통화 시간', example: '시간:>=5m' },
  { prefix: '큐대기:', description: '큐 대기', example: '큐대기:>=1m' },
  { prefix: '상담시간:', description: '상담통화시간 (인바운드,아웃바운드)', example: '상담시간:>=10m' },
  { prefix: '기간:', description: '기간', example: '기간:오늘' },
  { prefix: 'tracking:', description: '트래킹 모드', example: 'tracking:pbx' },
];

const QUICK_PRESETS: Array<{ label: string; preset: DateRangePreset; icon: string }> = [
  { label: '최근 1시간', preset: 'LAST_1H', icon: '🕐' },
  { label: '오늘', preset: 'TODAY', icon: '📅' },
  { label: '어제', preset: 'YESTERDAY', icon: '📅' },
  { label: '최근 24시간', preset: 'LAST_24H', icon: '🕘' },
  { label: '이번주', preset: 'THIS_WEEK', icon: '📅' },
  { label: '지난주', preset: 'LAST_WEEK', icon: '📅' },
];

export default function CommandPalette({ open, onClose, initialValue = '', onSubmit, recentSearches = [], onRecentSelect, onRecentClear }: CommandPaletteProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      // Modal 열림 직후 focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialValue]);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    onClose();
  };

  const handleInsertChip = (text: string) => {
    // 같은 키 prefix(예: 기간:, 시간:, result:) 토큰이 이미 있으면 교체. 없으면 append.
    const colonIdx = text.indexOf(':');
    setValue((v) => {
      if (colonIdx <= 0) return v.trim() ? `${v.trim()} ${text}` : text;
      const key = text.slice(0, colonIdx);
      const tokens = v.split(/\s+/).filter((t) => t && !t.startsWith(`${key}:`));
      tokens.push(text);
      return tokens.join(' ');
    });
    inputRef.current?.focus();
  };

  // ANI/UCID 추론 힌트 (입력값이 prefix 없을 때)
  const inferenceHint = useMemo(() => {
    const t = value.trim();
    if (!t || t.includes(':')) return null;
    if (/^\d{4,11}$/.test(t)) return `ANI로 추론: ${t}`;
    if (t.length >= 4) return `UCID로 추론: ${t}`;
    return null;
  }, [value]);

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={780} closable={false} maskClosable centered styles={{ body: { padding: 0 } }}>
      <div className="flex flex-col">
        {/* ── 검색 입력 ── */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Search className="size-4 text-gray-400 flex-shrink-0" />
          <Input
            ref={inputRef as never}
            variant="borderless"
            size="large"
            placeholder="ucid:abc123 / ani:01012345678 / 기간:오늘 result:포기"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={handleSubmit}
            className="flex-1"
            style={{ fontSize: 14 }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="text-[11px] font-mono px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 cursor-pointer transition-colors"
            title="검색 실행 (Enter)"
            aria-label="검색 실행"
          >
            Enter
          </button>
        </div>

        {inferenceHint && <div className="px-4 py-1.5 bg-blue-50 text-blue-700 text-[11px] border-b border-blue-100">💡 {inferenceHint}</div>}

        <div className="grid grid-cols-2 gap-0 h-[460px] overflow-hidden">
          {/* ── 좌: 빠른 프리셋 + 최근 검색 ── */}
          <div className="border-r border-gray-100 overflow-y-auto min-h-0">
            {/* 빠른 프리셋 */}
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 flex items-center gap-1">
                <Clock className="size-3" />
                빠른 기간
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.preset}
                    type="button"
                    onClick={() => handleInsertChip(`기간:${p.label.replace(' ', '')}`)}
                    className="px-2.5 py-1 text-[11px] border border-gray-200 rounded-full hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-gray-600 transition-colors"
                  >
                    <span className="mr-1">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 최근 검색 */}
            {recentSearches.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
                    <Star className="size-3" />
                    최근 검색
                  </div>
                  {onRecentClear && (
                    <button onClick={onRecentClear} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-1" type="button">
                      <Trash2 className="size-3" />
                      비우기
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 8).map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setValue(r.rawQuery);
                        onRecentSelect?.(r);
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded text-[11px] text-gray-700 font-mono truncate"
                      title={r.rawQuery}
                    >
                      {r.rawQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 우: 문법 가이드 ── */}
          <div className="overflow-y-auto min-h-0">
            <div className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 flex items-center gap-1">
                <Calendar className="size-3" />
                검색 문법
              </div>
              <div className="space-y-1.5">
                {SYNTAX_GUIDE.map((s) => (
                  <button
                    key={s.prefix}
                    type="button"
                    onClick={() => handleInsertChip(s.example)}
                    className="w-full text-left px-2 py-1.5 hover:bg-blue-50 rounded transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 group-hover:bg-blue-100 px-1.5 py-0.5 rounded">{s.prefix}</code>
                      <span className="text-[11px] text-gray-700">{s.description}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono ml-1 mt-0.5">{s.example}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 푸터 ── */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
              검색
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">Esc</kbd>
              닫기
            </span>
          </div>
          <div>기간 필수 · 최대 30일 · 와일드카드 불가</div>
        </div>
      </div>
    </Modal>
  );
}
