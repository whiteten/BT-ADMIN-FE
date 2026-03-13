/**
 * Key-Value 쌍 편집기
 * - headers, params, body.map 등에 재사용
 */

import { Input } from 'antd';
import { Plus } from 'lucide-react';
import { IconTrash } from '@/components/custom/Icons';

interface KeyValueEditorProps {
  value?: Record<string, string>;
  onChange?: (value: Record<string, string> | undefined) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({ value, onChange, keyPlaceholder = '키', valuePlaceholder = '값' }: KeyValueEditorProps) {
  // null/undefined 모두 빈 객체로 정규화 (API 응답이 null로 올 수 있음)
  const safeValue = value ?? {};
  const entries = Object.entries(safeValue);

  const handleAdd = () => {
    const newValue = { ...safeValue, '': '' };
    onChange?.(newValue);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const newValue = { ...safeValue };
    if (oldKey !== newKey) {
      delete newValue[oldKey];
    }
    newValue[newKey] = safeValue[oldKey] ?? '';
    onChange?.(Object.keys(newValue).length > 0 ? newValue : undefined);
  };

  const handleValueChange = (key: string, newVal: string) => {
    const updated = { ...safeValue, [key]: newVal };
    onChange?.(updated);
  };

  const handleDelete = (key: string) => {
    const newValue = { ...safeValue };
    delete newValue[key];
    onChange?.(Object.keys(newValue).length > 0 ? newValue : undefined);
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], index) => (
        <div key={index} className="flex gap-2 items-center">
          <Input placeholder={keyPlaceholder} value={key} onChange={(e) => handleKeyChange(key, e.target.value)} className="flex-1" />
          <Input placeholder={valuePlaceholder} value={val} onChange={(e) => handleValueChange(key, e.target.value)} className="flex-1" />
          <button type="button" onClick={() => handleDelete(key)}>
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="w-full flex items-center justify-center gap-1 py-1 border border-dashed border-[#d9d9d9] rounded text-sm text-[#595959] hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)] transition-colors"
      >
        <Plus className="size-4" />
        추가
      </button>
    </div>
  );
}
