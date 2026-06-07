/**
 * 미디어 옵션 카드 리스트 (8 미디어 × 7 속성, 카드별 펼침/접힘).
 *
 * 헤더(접힘): 미디어명 / 사용 뱃지 / 자동수락 OFF/ON / UTIL·MAX·AFC quick 표시
 * 본문(펼침): 사용여부, 자동수락, 자동응답모드, 자동응답시간, util, max, afctime
 *
 * disabled (useGrpMdaOpt=1) — 카드 헤더 회색 처리, 펼침/입력 비활성.
 * hideAutoAns (그룹 미디어 편집) — 자동수락(autoansUse) 입력/표시 제거.
 *   레거시 IPR20S4060 그룹 팝업엔 autoansUse 가 없고, AgentGroup.*AutoansUse 는 @Transient 라
 *   그룹 미디어 저장 시 소실되므로 그룹 편집 UI 에서는 노출하지 않는다. 개별 상담사 편집엔 유지.
 */
import { useEffect, useState } from 'react';
import { InputNumber, Select } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MEDIA_OPTION_BOUNDS } from '../constants/codes';
import type { AgentMediaOption, AgentMediaMatrix as Matrix } from '../types';

type MediaKey = 'chat' | 'videoVoice' | 'videoChat' | 'email' | 'fax' | 'voip' | 'mvoip' | 'sms';

/** 동적 미디어 목록 한 항목. */
export interface MediaItem {
  key: MediaKey;
  label: string;
}

/** 전체 8종 기본 목록 (mediaItems 미지정 시 폴백). */
const ALL_MEDIA_ITEMS: MediaItem[] = [
  { key: 'voip', label: 'VOIP' },
  { key: 'chat', label: 'Chat' },
  { key: 'videoVoice', label: 'Video Voice' },
  { key: 'videoChat', label: 'Video Chat' },
  { key: 'email', label: 'Email' },
  { key: 'fax', label: 'Fax' },
  { key: 'mvoip', label: 'MVOIP' },
  { key: 'sms', label: 'SMS / WEB' },
];

const DEFAULT_OPT: AgentMediaOption = {
  use: false,
  autoansUse: false,
  autoanswerMode: 0,
  autoanswerTime: 2,
  util: 1,
  max: 1,
  afctime: 30,
};

function ensure(o: AgentMediaOption | null | undefined): AgentMediaOption {
  return o ?? { ...DEFAULT_OPT };
}

interface AgentMediaCardsProps {
  value: Matrix | null | undefined;
  onChange: (next: Matrix) => void;
  disabled?: boolean;
  /** 자동수락(autoansUse) 입력/표시 제거 — 그룹 미디어 편집 시 사용 (레거시 그룹 팝업엔 없음). */
  hideAutoAns?: boolean;
  /**
   * 등록·활성화된 미디어 목록 (서버 동적).
   * 미지정 시 8종 전체 표시 (하위 호환).
   */
  mediaItems?: MediaItem[];
}

export default function AgentMediaCards({ value, onChange, disabled, hideAutoAns, mediaItems }: AgentMediaCardsProps) {
  const activeItems: MediaItem[] = mediaItems?.length ? mediaItems : ALL_MEDIA_ITEMS;

  // 활성 미디어 키만 포함한 matrix 구성
  const matrix: Matrix = {} as Matrix;
  for (const { key } of activeItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (matrix as any)[key] = ensure(value?.[key]);
  }

  // 디폴트로 사용 중인 카드만 펼침
  const [openKeys, setOpenKeys] = useState<Set<MediaKey>>(() => new Set<MediaKey>());

  // value 또는 activeItems 변경 시 openKeys 동기화
  // (비동기 로드: value=null→detail 로드→실제 값 순으로 들어옴)
  useEffect(() => {
    const next = new Set<MediaKey>();
    for (const { key } of activeItems) {
      if (value?.[key]?.use) next.add(key);
    }
    if (next.size > 0)
      setOpenKeys((prev) => {
        const merged = new Set(prev);
        next.forEach((k) => merged.add(k));
        return merged;
      });
  }, [value, activeItems]);

  const setCell = (key: MediaKey, patch: Partial<AgentMediaOption>) => {
    const next: Matrix = { ...matrix, [key]: { ...matrix[key], ...patch } };
    onChange(next);
  };

  const toggle = (key: MediaKey) => {
    if (disabled) return;
    setOpenKeys((prev) => {
      const n = new Set(prev);
      if (n.has(key)) {
        n.delete(key);
      } else {
        n.add(key);
      }
      return n;
    });
  };

  return (
    <div className={`flex flex-col gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {activeItems.map(({ key, label }) => {
        const cell = matrix[key]!;
        const isOpen = openKeys.has(key);
        const isOn = !!cell.use;
        return (
          <div key={key} className={`border rounded ${isOpen ? 'border-[#c5cbe0]' : 'border-gray-200'} bg-white`}>
            <button type="button" onClick={() => toggle(key)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
              {isOpen ? <ChevronDown className="size-3.5 text-gray-500 flex-shrink-0" /> : <ChevronRight className="size-3.5 text-gray-500 flex-shrink-0" />}
              <span className="text-sm font-semibold text-gray-800 min-w-[100px]">{label}</span>
              <span
                className={`inline-flex items-center px-2 h-[20px] rounded text-[11px] font-medium leading-none ${
                  isOn ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-600 bg-gray-50 border border-gray-200'
                }`}
              >
                {isOn ? '사용' : '미사용'}
              </span>
              {!hideAutoAns && <span className="text-[11px] text-gray-500">자동수락 {cell.autoansUse ? 'ON' : 'OFF'}</span>}
              <span className="ml-auto text-[11px] text-gray-500">
                UTIL <b className="text-gray-800">{cell.util ?? 0}</b>
                {'  '}·{'  '}
                MAX <b className="text-gray-800">{cell.max ?? 0}</b>
                {'  '}·{'  '}
                AFC <b className="text-gray-800">{cell.afctime ?? 0}</b>s
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 px-3 py-3 grid grid-cols-4 gap-3">
                <Field label="사용 여부">
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={cell.use ? 1 : 0}
                    onChange={(v) => setCell(key, { use: v === 1 })}
                    options={[
                      { value: 1, label: '사용' },
                      { value: 0, label: '미사용' },
                    ]}
                  />
                </Field>
                {!hideAutoAns && (
                  <Field label="자동 수락">
                    <Select
                      size="small"
                      style={{ width: '100%' }}
                      value={cell.autoansUse ? 1 : 0}
                      onChange={(v) => setCell(key, { autoansUse: v === 1 })}
                      options={[
                        { value: 0, label: 'OFF' },
                        { value: 1, label: 'ON' },
                      ]}
                    />
                  </Field>
                )}
                <Field label="자동 응답 모드">
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={cell.autoanswerMode ?? 0}
                    onChange={(v) => {
                      // SWAT IPR20S4010 L577-581 정합: mode=0(수동)이면 time 비활성 + 0 리셋
                      setCell(key, { autoanswerMode: v, ...(v === 0 ? { autoanswerTime: 0 } : {}) });
                    }}
                    options={[
                      { value: 0, label: '수동' },
                      { value: 1, label: '자동' },
                    ]}
                  />
                </Field>
                <Field label="자동 응답 시간(초)">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={MEDIA_OPTION_BOUNDS.autoanswerTime.min}
                    max={MEDIA_OPTION_BOUNDS.autoanswerTime.max}
                    value={cell.autoanswerTime ?? 2}
                    disabled={cell.autoanswerMode === 0}
                    onChange={(v) => setCell(key, { autoanswerTime: typeof v === 'number' ? v : 2 })}
                  />
                </Field>
                <Field label="가중치 (UTIL)">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={MEDIA_OPTION_BOUNDS.util.min}
                    max={MEDIA_OPTION_BOUNDS.util.max}
                    value={cell.util ?? 1}
                    onChange={(v) => setCell(key, { util: typeof v === 'number' ? v : 1 })}
                  />
                </Field>
                <Field label="동시 최대 (MAX)">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={MEDIA_OPTION_BOUNDS.max.min}
                    max={MEDIA_OPTION_BOUNDS.max.max}
                    value={cell.max ?? 1}
                    onChange={(v) => setCell(key, { max: typeof v === 'number' ? v : 1 })}
                  />
                </Field>
                <Field label="후처리 (AFC, 초)">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={0}
                    max={999}
                    value={cell.afctime ?? 30}
                    onChange={(v) => setCell(key, { afctime: typeof v === 'number' ? v : 30 })}
                  />
                </Field>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}
