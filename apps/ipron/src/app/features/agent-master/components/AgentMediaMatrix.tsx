/**
 * 미디어 매트릭스 입력 (8 미디어 × 7 속성).
 *
 * 미디어: Chat / Video Voice / Video Chat / Email / Fax / VOIP / MVOIP / SMS·WEB
 * 속성: 사용 / 자동수락 / 자동수락모드 / 자동수락시간 / 가중치(util) / 최대(max) / 후처리(afctime)
 *
 * disabled prop 이 true (useGrpMdaOpt=1) 면 전체 셀 비활성화 → 그룹 기본값 상속 의미.
 */
import { Checkbox, InputNumber, Select } from 'antd';
import { MEDIA_OPTION_BOUNDS } from '../constants/codes';
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

const AUTOANSWER_MODES = [
  { value: 0, label: '수동' },
  { value: 1, label: '자동' },
];

interface AgentMediaMatrixProps {
  value: Matrix | null | undefined;
  onChange: (next: Matrix) => void;
  disabled?: boolean;
}

const EMPTY_OPT: AgentMediaOption = {
  use: false,
  autoansUse: false,
  autoanswerMode: 0,
  autoanswerTime: 2,
  util: 1,
  max: 1,
  afctime: 30,
};

function ensure(opt: AgentMediaOption | null | undefined): AgentMediaOption {
  return opt ?? { ...EMPTY_OPT };
}

export default function AgentMediaMatrix({ value, onChange, disabled }: AgentMediaMatrixProps) {
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

  const setCell = (key: MediaKey, patch: Partial<AgentMediaOption>) => {
    const next: Matrix = { ...matrix, [key]: { ...matrix[key], ...patch } };
    onChange(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 text-gray-700">
            <th className="border border-gray-200 px-2 py-1 text-left font-semibold sticky left-0 bg-gray-50 min-w-[110px]">미디어</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[60px]">사용</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[70px]">자동수락</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[90px]">자동수락 모드</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[100px]">자동수락 시간(초)</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[80px]">가중치</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[80px]">최대</th>
            <th className="border border-gray-200 px-2 py-1 font-semibold min-w-[100px]">후처리(초)</th>
          </tr>
        </thead>
        <tbody>
          {MEDIA_KEYS.map((key) => {
            const cell = matrix[key]!;
            const rowDisabled = disabled || cell.use === false;
            return (
              <tr key={key} className={disabled ? 'opacity-40' : ''}>
                <td className="border border-gray-200 px-2 py-1 font-medium text-gray-700 sticky left-0 bg-white">{MEDIA_LABELS[key]}</td>
                <td className="border border-gray-200 px-2 py-1 text-center">
                  <Checkbox checked={!!cell.use} onChange={(e) => setCell(key, { use: e.target.checked })} disabled={disabled} />
                </td>
                <td className="border border-gray-200 px-2 py-1 text-center">
                  <Checkbox checked={!!cell.autoansUse} onChange={(e) => setCell(key, { autoansUse: e.target.checked })} disabled={rowDisabled} />
                </td>
                <td className="border border-gray-200 px-2 py-1">
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    options={AUTOANSWER_MODES}
                    value={cell.autoanswerMode ?? 0}
                    onChange={(v) => setCell(key, { autoanswerMode: v })}
                    disabled={rowDisabled}
                  />
                </td>
                <td className="border border-gray-200 px-2 py-1">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={MEDIA_OPTION_BOUNDS.autoanswerTime.min}
                    max={MEDIA_OPTION_BOUNDS.autoanswerTime.max}
                    value={cell.autoanswerTime ?? 2}
                    onChange={(v) => setCell(key, { autoanswerTime: typeof v === 'number' ? v : 2 })}
                    disabled={rowDisabled}
                  />
                </td>
                <td className="border border-gray-200 px-2 py-1">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={MEDIA_OPTION_BOUNDS.util.min}
                    max={MEDIA_OPTION_BOUNDS.util.max}
                    value={cell.util ?? 1}
                    onChange={(v) => setCell(key, { util: typeof v === 'number' ? v : 1 })}
                    disabled={rowDisabled}
                  />
                </td>
                <td className="border border-gray-200 px-2 py-1">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={MEDIA_OPTION_BOUNDS.max.min}
                    max={MEDIA_OPTION_BOUNDS.max.max}
                    value={cell.max ?? 1}
                    onChange={(v) => setCell(key, { max: typeof v === 'number' ? v : 1 })}
                    disabled={rowDisabled}
                  />
                </td>
                <td className="border border-gray-200 px-2 py-1">
                  <InputNumber
                    size="small"
                    style={{ width: '100%' }}
                    min={0}
                    max={999}
                    value={cell.afctime ?? 30}
                    onChange={(v) => setCell(key, { afctime: typeof v === 'number' ? v : 30 })}
                    disabled={rowDisabled}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
