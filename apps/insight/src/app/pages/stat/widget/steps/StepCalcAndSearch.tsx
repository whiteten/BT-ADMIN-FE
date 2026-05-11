import { useState } from 'react';
import { Button, Card, Input, Select, Table, Tag } from 'antd';
import { CheckCircle, Plus, Trash2, XCircle } from 'lucide-react';
import { useGetConditionList, useValidateFormula } from '../../../../features/stat/hooks/useStatQueries';

export interface CalcField {
  fieldName: string;
  displayName: string;
  formula: string;
  fieldType: string;
  showInGrid: boolean;
  chartRole: string;
  showRatio: boolean;
  format: string;
  sortOrder: number;
}

export interface SearchBind {
  conditionId: number | null;
  conditionName: string;
  bindDatasourceKey: string;
  bindFieldName: string;
  sortOrder: number;
}

interface Props {
  calcFields: CalcField[];
  onCalcFieldsChange: (fields: CalcField[]) => void;
  searchBindings: SearchBind[];
  onSearchBindingsChange: (bindings: SearchBind[]) => void;
  selectedDatasourceKeys: string[];
  availableFields: string[];
}

export default function StepCalcAndSearch({ calcFields, onCalcFieldsChange, searchBindings, onSearchBindingsChange, selectedDatasourceKeys, availableFields }: Props) {
  const validateMutation = useValidateFormula({});
  const { data: conditions = [] } = useGetConditionList({});
  const [validationResults, setValidationResults] = useState<Record<number, { valid: boolean; message: string }>>({});

  const addCalcField = () => {
    onCalcFieldsChange([
      ...calcFields,
      { fieldName: '', displayName: '', formula: '', fieldType: 'NUMBER', showInGrid: true, chartRole: '', showRatio: false, format: '', sortOrder: calcFields.length },
    ]);
  };

  const updateCalcField = (index: number, key: keyof CalcField, value: unknown) => {
    const updated = [...calcFields];
    updated[index] = { ...updated[index], [key]: value };
    onCalcFieldsChange(updated);
  };

  const removeCalcField = (index: number) => onCalcFieldsChange(calcFields.filter((_, i) => i !== index));

  const validateFormula = (index: number) => {
    validateMutation.mutate(
      { formula: calcFields[index].formula, availableFields },
      {
        onSuccess: (result) => {
          setValidationResults({ ...validationResults, [index]: { valid: result.valid, message: result.valid ? '유효한 수식입니다' : result.errors.join(', ') } });
        },
      },
    );
  };

  const addSearchBind = () => {
    onSearchBindingsChange([
      ...searchBindings,
      { conditionId: null, conditionName: '', bindDatasourceKey: selectedDatasourceKeys[0] || '', bindFieldName: '', sortOrder: searchBindings.length },
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium">계산 필드</h3>
            <p className="text-sm text-gray-500">데이터소스에 없는 필드를 수식으로 생성합니다.</p>
          </div>
          <Button size="small" icon={<Plus size={14} />} onClick={addCalcField}>
            계산 필드 추가
          </Button>
        </div>
        <div className="space-y-3">
          {calcFields.map((calc, idx) => (
            <Card key={idx} size="small" className="border-l-4 border-l-purple-500">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Input size="small" placeholder="필드명" value={calc.fieldName} onChange={(e) => updateCalcField(idx, 'fieldName', e.target.value)} />
                  <Input size="small" placeholder="표시명" value={calc.displayName} onChange={(e) => updateCalcField(idx, 'displayName', e.target.value)} />
                  <div className="flex gap-1">
                    <Select
                      size="small"
                      value={calc.fieldType}
                      onChange={(v) => updateCalcField(idx, 'fieldType', v)}
                      options={[
                        { value: 'NUMBER', label: 'NUMBER' },
                        { value: 'STRING', label: 'STRING' },
                      ]}
                      style={{ width: 100 }}
                    />
                    <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeCalcField(idx)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input.TextArea
                    size="small"
                    rows={2}
                    placeholder="{SUCCESS_CNT} / {TOTAL_CNT} * 100"
                    value={calc.formula}
                    onChange={(e) => updateCalcField(idx, 'formula', e.target.value)}
                    className="font-mono text-sm flex-1"
                  />
                  <Button size="small" onClick={() => validateFormula(idx)}>
                    검증
                  </Button>
                </div>
                {validationResults[idx] && (
                  <div className={`flex items-center gap-1 text-xs ${validationResults[idx].valid ? 'text-green-600' : 'text-red-500'}`}>
                    {validationResults[idx].valid ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {validationResults[idx].message}
                  </div>
                )}
                <div className="flex gap-2 text-xs">
                  <span className="text-gray-400">사용 가능 함수:</span>
                  {['SUM', 'AVG', 'IF', 'ROUND', 'NULLIF', 'COALESCE'].map((f) => (
                    <Tag key={f} className="text-xs cursor-pointer" onClick={() => updateCalcField(idx, 'formula', calc.formula + f + '()')}>
                      {f}
                    </Tag>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium">검색조건 바인딩</h3>
            <p className="text-sm text-gray-500">등록된 검색조건을 데이터소스 필드에 바인딩합니다.</p>
          </div>
          <Button size="small" icon={<Plus size={14} />} onClick={addSearchBind}>
            검색조건 추가
          </Button>
        </div>
        <Table
          dataSource={searchBindings}
          rowKey={(_, idx) => String(idx)}
          pagination={false}
          size="small"
          bordered
          columns={[
            {
              title: '검색조건',
              width: 200,
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
              width: 180,
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
              width: 40,
              render: (_: unknown, __: SearchBind, idx: number) => <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeSearchBind(idx)} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
