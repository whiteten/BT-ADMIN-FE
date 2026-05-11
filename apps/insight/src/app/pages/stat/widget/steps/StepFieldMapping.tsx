import { useEffect } from 'react';
import { Checkbox, Input, Select, Table, Tag } from 'antd';
import { useGetDatasourceList } from '../../../../features/stat/hooks/useStatQueries';

export interface FieldMapping {
  datasourceKey: string;
  fieldName: string;
  displayName: string;
  fieldType: string;
  fieldRole: string;
  alias: string;
  showInGrid: boolean;
  chartRole: string;
  aggregation: string;
  showRatio: boolean;
  format: string;
  sortOrder: number;
  enabled: boolean;
}

interface Props {
  selectedDatasourceKeys: string[];
  fieldMappings: FieldMapping[];
  onFieldMappingsChange: (mappings: FieldMapping[]) => void;
}

const CHART_ROLE_OPTIONS = [
  { value: '', label: '-' },
  { value: 'X_AXIS', label: 'X축' },
  { value: 'Y_AXIS', label: 'Y축' },
  { value: 'GROUP', label: '그룹' },
  { value: 'VALUE', label: '값' },
  { value: 'LABEL', label: '라벨' },
];

const AGGREGATION_OPTIONS = [
  { value: '', label: '-' },
  { value: 'SUM', label: 'SUM' },
  { value: 'AVG', label: 'AVG' },
  { value: 'COUNT', label: 'COUNT' },
  { value: 'MAX', label: 'MAX' },
  { value: 'MIN', label: 'MIN' },
];

const ROLE_COLOR: Record<string, string> = {
  DIMENSION: 'cyan',
  MEASURE: 'purple',
  TIMESTAMP: 'orange',
};

export default function StepFieldMapping({ selectedDatasourceKeys, fieldMappings, onFieldMappingsChange }: Props) {
  const { data: datasources = [] } = useGetDatasourceList({});

  useEffect(() => {
    if (fieldMappings.length > 0 || selectedDatasourceKeys.length === 0) return;
    const mappings: FieldMapping[] = [];
    let order = 0;
    for (const dsKey of selectedDatasourceKeys) {
      const ds = datasources.find((d) => d.datasourceKey === dsKey);
      if (ds?.fields) {
        for (const field of ds.fields) {
          mappings.push({
            datasourceKey: dsKey,
            fieldName: field.fieldName,
            displayName: field.displayName,
            fieldType: field.fieldType,
            fieldRole: field.fieldRole,
            alias: '',
            showInGrid: true,
            chartRole: '',
            aggregation: '',
            showRatio: false,
            format: '',
            sortOrder: order++,
            enabled: true,
          });
        }
      }
    }
    onFieldMappingsChange(mappings);
  }, [datasources, selectedDatasourceKeys]);

  const updateField = (index: number, key: keyof FieldMapping, value: unknown) => {
    const updated = [...fieldMappings];
    updated[index] = { ...updated[index], [key]: value };
    onFieldMappingsChange(updated);
  };

  const columns = [
    {
      title: '',
      width: 40,
      render: (_: unknown, __: FieldMapping, idx: number) => <Checkbox checked={fieldMappings[idx].enabled} onChange={(e) => updateField(idx, 'enabled', e.target.checked)} />,
    },
    {
      title: '필드',
      width: 160,
      render: (_: unknown, record: FieldMapping) => (
        <div>
          <div className="font-mono text-xs">{record.fieldName}</div>
          <Tag color={ROLE_COLOR[record.fieldRole]} className="text-xs mt-1">
            {record.fieldRole}
          </Tag>
        </div>
      ),
    },
    {
      title: '표시명',
      width: 130,
      render: (_: unknown, __: FieldMapping, idx: number) => (
        <Input
          size="small"
          value={fieldMappings[idx].alias || fieldMappings[idx].displayName}
          onChange={(e) => updateField(idx, 'alias', e.target.value)}
          disabled={!fieldMappings[idx].enabled}
        />
      ),
    },
    {
      title: '그리드',
      width: 55,
      render: (_: unknown, __: FieldMapping, idx: number) => (
        <Checkbox checked={fieldMappings[idx].showInGrid} onChange={(e) => updateField(idx, 'showInGrid', e.target.checked)} disabled={!fieldMappings[idx].enabled} />
      ),
    },
    {
      title: '차트역할',
      width: 90,
      render: (_: unknown, __: FieldMapping, idx: number) => (
        <Select
          size="small"
          value={fieldMappings[idx].chartRole}
          onChange={(v) => updateField(idx, 'chartRole', v)}
          options={CHART_ROLE_OPTIONS}
          style={{ width: '100%' }}
          disabled={!fieldMappings[idx].enabled}
        />
      ),
    },
    {
      title: '집계',
      width: 80,
      render: (_: unknown, __: FieldMapping, idx: number) => (
        <Select
          size="small"
          value={fieldMappings[idx].aggregation}
          onChange={(v) => updateField(idx, 'aggregation', v)}
          options={AGGREGATION_OPTIONS}
          style={{ width: '100%' }}
          disabled={!fieldMappings[idx].enabled || fieldMappings[idx].fieldRole !== 'MEASURE'}
        />
      ),
    },
    {
      title: '비율%',
      width: 50,
      render: (_: unknown, __: FieldMapping, idx: number) => (
        <Checkbox
          checked={fieldMappings[idx].showRatio}
          onChange={(e) => updateField(idx, 'showRatio', e.target.checked)}
          disabled={!fieldMappings[idx].enabled || fieldMappings[idx].fieldRole !== 'MEASURE'}
        />
      ),
    },
    {
      title: '포맷',
      width: 90,
      render: (_: unknown, __: FieldMapping, idx: number) => (
        <Input
          size="small"
          value={fieldMappings[idx].format}
          onChange={(e) => updateField(idx, 'format', e.target.value)}
          placeholder="#,###"
          disabled={!fieldMappings[idx].enabled}
        />
      ),
    },
  ];

  const activeCount = fieldMappings.filter((f) => f.enabled).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-1">필드 매핑</h3>
        <p className="text-sm text-gray-500 mb-3">각 필드의 그리드 표시, 차트 역할, 집계 방식을 설정합니다.</p>
      </div>
      <div className="flex gap-4 text-sm">
        <Tag color="blue">활성 필드: {activeCount}</Tag>
        <Tag color="green">Y축: {fieldMappings.filter((f) => f.enabled && f.chartRole === 'Y_AXIS').length}</Tag>
      </div>
      <Table
        dataSource={fieldMappings}
        columns={columns}
        rowKey={(_, idx) => String(idx)}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 900 }}
        rowClassName={(record) => (!record.enabled ? 'opacity-40' : '')}
      />
    </div>
  );
}
