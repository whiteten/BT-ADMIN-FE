import { Select } from 'antd';
import type { QuerySelectorProps } from '@/shared-store';

interface EnumOption {
  value: string;
  label: string;
}

export default function EnumSelector({ spec, value, onChange }: QuerySelectorProps) {
  const options = (spec.options as EnumOption[] | undefined) ?? [];
  return <Select value={value} onChange={(v) => onChange(v ?? undefined)} options={options} allowClear placeholder={`${spec.label} 선택`} />;
}
