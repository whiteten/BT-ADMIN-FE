/**
 * Key-Value 쌍 편집기
 * - headers, params, body.map 등에 재사용
 */

import { Button, Input } from 'antd';
import { Plus, Trash2 } from 'lucide-react';

interface KeyValueEditorProps {
  value?: Record<string, string>;
  onChange?: (value: Record<string, string> | undefined) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({ value = {}, onChange, keyPlaceholder = '키', valuePlaceholder = '값' }: KeyValueEditorProps) {
  const entries = Object.entries(value);

  const handleAdd = () => {
    const newValue = { ...value, '': '' };
    onChange?.(newValue);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const newValue = { ...value };
    if (oldKey !== newKey) {
      delete newValue[oldKey];
    }
    newValue[newKey] = value[oldKey] ?? '';
    onChange?.(Object.keys(newValue).length > 0 ? newValue : undefined);
  };

  const handleValueChange = (key: string, newValue: string) => {
    const updated = { ...value, [key]: newValue };
    onChange?.(updated);
  };

  const handleDelete = (key: string) => {
    const newValue = { ...value };
    delete newValue[key];
    onChange?.(Object.keys(newValue).length > 0 ? newValue : undefined);
  };

  return (
    <div className="space-y-2">
      {entries.map(([key, val], index) => (
        <div key={index} className="flex gap-2">
          <Input placeholder={keyPlaceholder} value={key} onChange={(e) => handleKeyChange(key, e.target.value)} className="flex-1" />
          <Input placeholder={valuePlaceholder} value={val} onChange={(e) => handleValueChange(key, e.target.value)} className="flex-1" />
          <Button type="text" danger icon={<Trash2 className="size-4" />} onClick={() => handleDelete(key)} />
        </div>
      ))}
      <Button type="dashed" icon={<Plus className="size-4" />} onClick={handleAdd} block>
        추가
      </Button>
    </div>
  );
}
