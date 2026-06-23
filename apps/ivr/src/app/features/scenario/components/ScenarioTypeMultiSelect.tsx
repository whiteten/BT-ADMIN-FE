/**
 * 시나리오 타입 멀티 선택 컴포넌트.
 * BOT(90)은 IVR 화면에서 옵션 자체를 노출하지 않음 — FCA 봇운영 관리에서 처리.
 */
import { Select } from 'antd';
import { SCENARIO_TYPE_OPTIONS, type ScenarioType } from '../types';

interface ScenarioTypeMultiSelectProps {
  value: ScenarioType[];
  onChange: (next: ScenarioType[]) => void;
  className?: string;
}

export default function ScenarioTypeMultiSelect({ value, onChange, className }: ScenarioTypeMultiSelectProps) {
  return (
    <Select<ScenarioType[]>
      mode="multiple"
      placeholder="전체"
      value={value}
      onChange={onChange}
      maxTagCount="responsive"
      className={className}
      style={{ minWidth: 300 }}
      options={SCENARIO_TYPE_OPTIONS.map((o) => ({
        label: o.label,
        value: o.value,
      }))}
      allowClear
    />
  );
}
