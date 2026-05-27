/**
 * 미디어 옵션 카드 리스트 (8 미디어 × 7 속성, 카드별 펼침/접힘).
 *
 * 헤더(접힘): 미디어명 / 사용 뱃지 / 자동수락 OFF/ON / UTIL·MAX·AFC quick 표시
 * 본문(펼침): 사용여부, 자동수락, 자동응답모드, 자동응답시간, util, max, afctime
 *
 * disabled (useGrpMdaOpt=1) — 카드 헤더 회색 처리, 펼침/입력 비활성.
 */
import { useState } from 'react';
import { InputNumber, Select } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AgentMediaOption, AgentMediaMatrix as Matrix } from '../types';

const MEDIA_KEYS = ['chat', 'videoVoice', 'videoChat', 'email', 'fax', 'voip', 'mvoip', 'sms'] as const;
type MediaKey = (typeof MEDIA_KEYS)[number];

const MEDIA_LABELS: Record<MediaKey, string> = {
  chat: 'Chat',
  videoVoice: 'Video Voice',
  videoChat: 'Video Chat',
  email: 'Email',
  fax: 'Fax',
  voip: 'VOIP',
  mvoip: 'MVOIP',
  sms: 'SMS / WEB',
};

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
}

export default function AgentMediaCards({ value, onChange, disabled }: AgentMediaCardsProps) {
  const matrix: Matrix = {
    chat: ensure(value?.chat),
    videoVoice: ensure(value?.videoVoice),
    videoChat: ensure(value?.videoChat),
    email: ensure(value?.email),
    fax: ensure(value?.fax),
    voip: ensure(value?.voip),
    mvoip: ensure(value?.mvoip),
    sms: ensure(value?.sms),
  };

  // 디폴트로 사용 중인 카드만 펼침 (Video Voice 등)
  const [openKeys, setOpenKeys] = useState<Set<MediaKey>>(() => {
    const init = new Set<MediaKey>();
    for (const k of MEDIA_KEYS) if (matrix[k]?.use) init.add(k);
    return init;
  });

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
      {MEDIA_KEYS.map((key) => {
        const cell = matrix[key]!;
        const isOpen = openKeys.has(key);
        const isOn = !!cell.use;
        return (
          <div key={key} className={`border rounded ${isOpen ? 'border-[#c5cbe0]' : 'border-gray-200'} bg-white`}>
            <button type="button" onClick={() => toggle(key)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
              {isOpen ? <ChevronDown className="size-3.5 text-gray-500 flex-shrink-0" /> : <ChevronRight className="size-3.5 text-gray-500 flex-shrink-0" />}
              <span className="text-sm font-semibold text-gray-800 min-w-[100px]">{MEDIA_LABELS[key]}</span>
              <span
                className={`inline-flex items-center px-2 h-[20px] rounded text-[11px] font-medium leading-none ${
                  isOn ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-600 bg-gray-50 border border-gray-200'
                }`}
              >
                {isOn ? '사용' : '미사용'}
              </span>
              <span className="text-[11px] text-gray-500">자동수락 {cell.autoansUse ? 'ON' : 'OFF'}</span>
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
                <Field label="자동 응답 모드">
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={cell.autoanswerMode ?? 0}
                    onChange={(v) => setCell(key, { autoanswerMode: v })}
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
                    min={0}
                    max={99}
                    value={cell.autoanswerTime ?? 2}
                    onChange={(v) => setCell(key, { autoanswerTime: typeof v === 'number' ? v : 2 })}
                  />
                </Field>
                <Field label="가중치 (UTIL)">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={0}
                    max={99}
                    value={cell.util ?? 1}
                    onChange={(v) => setCell(key, { util: typeof v === 'number' ? v : 1 })}
                  />
                </Field>
                <Field label="동시 최대 (MAX)">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={0}
                    max={99}
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
