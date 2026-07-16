import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CARD_PRESETS, getCardPreset } from './cardPresets';
import type { TableColumn } from '../types/taskboard.types';

type CardConfig = NonNullable<NonNullable<import('../types/taskboard.types').CallDataItem['tableConfig']>['cardConfig']>;

/**
 * 카드 편집 팝업 — 프리셋 고르기 + 강조색 + 컬럼→슬롯 매핑 + 그리드 열 수.
 * 원시 HTML 입력 없음(프리셋 픽 방식) → XSS 불가. 변경은 즉시 onChange로 반영(캔버스 미리보기 실시간).
 */
export function CardEditorModal({
  columns,
  cardConfig,
  onChange,
  onClose,
}: {
  columns: TableColumn[];
  cardConfig: CardConfig | undefined;
  onChange: (next: CardConfig) => void;
  onClose: () => void;
}) {
  const preset = getCardPreset(cardConfig?.presetId);
  const accent = cardConfig?.accent?.trim() ? cardConfig.accent : preset.defaultAccent;
  const slotMap = cardConfig?.slotMap ?? {};
  const gridCols = cardConfig?.columns ?? 0;

  const patch = (p: Partial<CardConfig>) => onChange({ presetId: preset.id, slotMap, accent, columns: gridCols, ...cardConfig, ...p });

  const selectPreset = (id: string) => {
    const next = getCardPreset(id);
    // 프리셋 변경 시 기존 매핑 중 새 프리셋에도 있는 슬롯키만 유지
    const keptSlotMap: Record<string, string> = {};
    next.slots.forEach((s) => {
      if (slotMap[s.key]) keptSlotMap[s.key] = slotMap[s.key];
    });
    onChange({ presetId: id, slotMap: keptSlotMap, accent: cardConfig?.accent ?? next.defaultAccent, columns: gridCols });
  };

  const previewData: Record<string, string> = {};
  preset.slots.forEach((s) => (previewData[s.key] = s.label));

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[620px] max-h-[86vh] overflow-hidden flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <div className="relative px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-sm font-bold text-slate-800">카드 편집</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">카드 모양을 고르고, 색상과 각 자리에 넣을 컬럼을 선택하세요.</p>
          <button onClick={onClose} title="닫기" className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          {/* 프리셋 갤러리 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">카드 종류</label>
            <div className="grid grid-cols-3 gap-2">
              {CARD_PRESETS.map((p) => {
                const sample: Record<string, string> = {};
                p.slots.forEach((s) => (sample[s.key] = s.label));
                const selected = p.id === preset.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPreset(p.id)}
                    className={`text-left rounded-lg border p-2 transition-colors ${selected ? 'border-[#0f5b9e] ring-1 ring-[#0f5b9e] bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="text-[10px] font-bold text-slate-600 mb-1 truncate">{p.name}</div>
                    <div className="h-[52px] overflow-hidden" style={{ fontSize: 9 }}>
                      {p.Render({ data: sample, accent: p.id === preset.id ? accent : p.defaultAccent })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 색상 + 그리드 열 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-500">강조색</label>
              <input type="color" value={accent} onChange={(e) => patch({ accent: e.target.value })} className="w-8 h-7 rounded border border-slate-200 cursor-pointer" />
              <button onClick={() => patch({ accent: preset.defaultAccent })} className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                기본색
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-500">열 수</label>
              <input
                type="number"
                min={0}
                value={gridCols}
                onChange={(e) => patch({ columns: Math.max(0, Number(e.target.value) || 0) })}
                className="w-16 text-xs border border-slate-200 rounded px-2 py-1"
                title="0 = 자동"
              />
              <span className="text-[10px] text-slate-400">0=자동</span>
            </div>
          </div>

          {/* 슬롯 → 컬럼 매핑 */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">데이터 매핑 (자리 → 컬럼)</label>
            {columns.length === 0 ? (
              <p className="text-[11px] text-amber-600">먼저 아래 &ldquo;테이블 컬럼&rdquo;에서 보여줄 필드를 추가한 뒤 매핑하세요.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {preset.slots.map((slot) => (
                  <div key={slot.key} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 w-32 flex-shrink-0 truncate" title={slot.label}>
                      {slot.label}
                    </span>
                    <select
                      value={slotMap[slot.key] ?? ''}
                      onChange={(e) => patch({ slotMap: { ...slotMap, [slot.key]: e.target.value } })}
                      className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                    >
                      <option value="">(없음)</option>
                      {columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label || c.key}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 미리보기 — 스크롤 영역 밖, 하단 고정(항상 보임) */}
        <div className="px-5 pt-3 pb-1 border-t border-slate-100 flex-shrink-0">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">미리보기</label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" style={{ fontSize: 12 }}>
            <div style={{ width: 200 }}>{preset.Render({ data: previewData, accent })}</div>
          </div>
        </div>

        <div className="px-5 py-3 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0f5b9e] rounded-lg hover:bg-[#0d4f8a]">
            완료
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
