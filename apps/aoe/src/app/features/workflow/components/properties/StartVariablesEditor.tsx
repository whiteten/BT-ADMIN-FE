import { Button, Input, Select, Switch, Tooltip } from 'antd';
import { Plus, Trash2 } from 'lucide-react';

export interface StartVariableItem {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Array[File]';
  required: boolean;
}

interface StartVariablesEditorProps {
  value?: StartVariableItem[];
  onChange?: (value: StartVariableItem[]) => void;
}

const TYPE_OPTIONS = [
  { value: 'String', label: 'String' },
  { value: 'Number', label: 'Number' },
  { value: 'Boolean', label: 'Boolean' },
  { value: 'Array[File]', label: 'Array[File]' },
] as const;

const isValidVarName = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

export default function StartVariablesEditor({ value = [], onChange }: StartVariablesEditorProps) {
  const update = (idx: number, patch: Partial<StartVariableItem>) => {
    onChange?.(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };
  const remove = (idx: number) => {
    onChange?.(value.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange?.([...value, { name: '', type: 'String', required: false }]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-700">변수</div>
        <Button size="small" type="link" icon={<Plus size={12} />} onClick={add}>
          변수 추가
        </Button>
      </div>

      {value.length === 0 && <div className="text-[11px] text-gray-400 py-2">사용자 입력 변수를 추가하세요. 다른 노드의 텍스트에서 `/` 입력 시 이 변수들이 노출됩니다.</div>}

      {value.map((v, idx) => {
        const invalid = v.name.length > 0 && !isValidVarName(v.name);
        return (
          <div key={idx} className="flex items-center gap-2 py-1">
            <Tooltip title={invalid ? '영문/숫자/_ 만, 첫 글자 영문' : ''} open={invalid ? undefined : false}>
              <Input size="small" className="flex-1" placeholder="변수명" value={v.name} status={invalid ? 'error' : ''} onChange={(e) => update(idx, { name: e.target.value })} />
            </Tooltip>
            <Select size="small" className="w-[110px]" options={[...TYPE_OPTIONS]} value={v.type} onChange={(t) => update(idx, { type: t })} />
            <Tooltip title="필수 여부">
              <Switch size="small" checked={v.required} onChange={(c) => update(idx, { required: c })} />
            </Tooltip>
            <Button size="small" type="text" icon={<Trash2 size={12} className="text-red-500" />} onClick={() => remove(idx)} />
          </div>
        );
      })}
    </div>
  );
}
