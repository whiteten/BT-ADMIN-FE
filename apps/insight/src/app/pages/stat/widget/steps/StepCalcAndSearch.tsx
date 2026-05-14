import { Button, Input, Select, Table } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useGetConditionList } from '../../../../features/stat/hooks/useStatQueries';

export interface SearchBind {
  conditionId: number | null;
  conditionName: string;
  bindDatasourceKey: string;
  bindFieldName: string;
  sortOrder: number;
}

interface Props {
  searchBindings: SearchBind[];
  onSearchBindingsChange: (bindings: SearchBind[]) => void;
  selectedDatasourceKeys: string[];
}

export default function StepCalcAndSearch({ searchBindings, onSearchBindingsChange, selectedDatasourceKeys }: Props) {
  const { data: conditions = [] } = useGetConditionList({});

  const addSearchBind = () => {
    onSearchBindingsChange([
      ...searchBindings,
      {
        conditionId: null,
        conditionName: '',
        bindDatasourceKey: selectedDatasourceKeys[0] || '',
        bindFieldName: '',
        sortOrder: searchBindings.length,
      },
    ]);
  };

  const updateSearchBind = (index: number, key: keyof SearchBind, value: unknown) => {
    const updated = [...searchBindings];
    updated[index] = { ...updated[index], [key]: value };
    if (key === 'conditionId') {
      const cond = conditions.find((c) => c.conditionId === value);
      if (cond) updated[index] = { ...updated[index], conditionName: cond.conditionName };
    }
    onSearchBindingsChange(updated);
  };

  const removeSearchBind = (index: number) => onSearchBindingsChange(searchBindings.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-gray-900">검색조건 바인딩</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">등록된 검색조건을 데이터소스 필드에 바인딩합니다.</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={addSearchBind}>
          검색조건 추가
        </Button>
      </div>

      {searchBindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-14 text-[12px] text-gray-400">
          <p className="font-medium">바인딩된 검색조건이 없습니다</p>
          <button type="button" className="mt-2 text-blue-500 hover:underline" onClick={addSearchBind}>
            + 검색조건 추가
          </button>
        </div>
      ) : (
        <Table
          dataSource={searchBindings}
          rowKey={(_, idx) => String(idx)}
          pagination={false}
          size="small"
          bordered
          columns={[
            {
              title: '검색조건',
              width: 240,
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Select
                  size="small"
                  value={searchBindings[idx].conditionId}
                  onChange={(v) => updateSearchBind(idx, 'conditionId', v)}
                  options={conditions.map((c) => ({ value: c.conditionId, label: `${c.conditionName} (${c.inputType})` }))}
                  placeholder="검색조건 선택"
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '바인딩 데이터소스',
              width: 200,
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Select
                  size="small"
                  value={searchBindings[idx].bindDatasourceKey}
                  onChange={(v) => updateSearchBind(idx, 'bindDatasourceKey', v)}
                  options={selectedDatasourceKeys.map((k) => ({ value: k, label: k }))}
                  style={{ width: '100%' }}
                />
              ),
            },
            {
              title: '바인딩 필드',
              render: (_: unknown, __: SearchBind, idx: number) => (
                <Input
                  size="small"
                  value={searchBindings[idx].bindFieldName}
                  onChange={(e) => updateSearchBind(idx, 'bindFieldName', e.target.value)}
                  placeholder="STAT_DATE"
                  style={{ fontFamily: 'monospace' }}
                />
              ),
            },
            {
              title: '',
              width: 48,
              render: (_: unknown, __: SearchBind, idx: number) => <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeSearchBind(idx)} />,
            },
          ]}
        />
      )}
    </div>
  );
}
