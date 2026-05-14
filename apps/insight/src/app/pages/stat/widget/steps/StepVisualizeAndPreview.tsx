import { useState } from 'react';
import { Button, DatePicker, Form, type FormInstance, Select, Table } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import type { FieldMapping } from './StepFieldMapping';
import { usePreviewStatQuery } from '../../../../features/stat/hooks/useStatQueries';
import type { StatisticsQueryColumn } from '../../../../features/stat/types/query';

const CHART_TYPES = [
  { value: 'LINE', label: '라인 차트', icon: '📈' },
  { value: 'BAR', label: '바 차트', icon: '📊' },
  { value: 'PIE', label: '파이 차트', icon: '🥧' },
  { value: 'DONUT', label: '도넛 차트', icon: '🍩' },
  { value: 'GRID', label: '그리드', icon: '📋' },
];

interface Props {
  form: FormInstance;
  datasourceKey?: string;
  fieldMappings: FieldMapping[];
}

export default function StepVisualizeAndPreview({ form, datasourceKey, fieldMappings }: Props) {
  const selected = Form.useWatch('visualization', form) as string | undefined;
  const [period, setPeriod] = useState({
    from: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });
  const [timeUnit, setTimeUnit] = useState('DD');

  const { mutate: runPreview, isPending, data: previewData } = usePreviewStatQuery({});

  const activeFields = fieldMappings.filter((f) => f.enabled);

  const handleQuery = () => {
    if (!datasourceKey || activeFields.length === 0) {
      toast.error('데이터소스와 활성화된 필드가 필요합니다.');
      return;
    }
    runPreview({
      datasourceKey,
      fieldNames: activeFields.map((f) => f.fieldName),
      globalFilters: { period, timeUnit },
      searchValues: {},
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 차트 유형 선택 */}
      <div>
        <h3 className="text-[13px] font-semibold text-gray-900 mb-3">차트 유형</h3>
        <Form.Item name="visualization" noStyle rules={[{ required: true, message: '시각화 유형을 선택하세요' }]}>
          <div className="grid grid-cols-5 gap-3">
            {CHART_TYPES.map((ct) => (
              <div
                key={ct.value}
                className={`cursor-pointer rounded border-2 p-3 text-center transition-all hover:border-blue-400 ${
                  selected === ct.value ? 'border-blue-500 bg-blue-50 font-semibold text-blue-600' : 'border-gray-200 text-gray-500'
                }`}
                onClick={() => form.setFieldValue('visualization', ct.value)}
              >
                <div className="text-2xl mb-1">{ct.icon}</div>
                <div className="text-xs">{ct.label}</div>
              </div>
            ))}
          </div>
        </Form.Item>
      </div>

      {/* 시각화 설정 + 미리보기 2컬럼 */}
      <div className="grid grid-cols-[280px_1fr] gap-4">
        {/* 좌: 시각화 설정 */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <h4 className="text-[12px] font-semibold text-gray-700">시각화 설정</h4>
          <Form.Item label="범례 위치" className="mb-2">
            <Select
              defaultValue="bottom"
              options={[
                { value: 'top', label: '상단' },
                { value: 'bottom', label: '하단' },
                { value: 'left', label: '좌측' },
                { value: 'right', label: '우측' },
                { value: 'none', label: '숨김' },
              ]}
            />
          </Form.Item>
          <Form.Item label="색상 팔레트" className="mb-0">
            <Select
              defaultValue="default"
              options={[
                { value: 'default', label: '기본' },
                { value: 'pastel', label: '파스텔' },
                { value: 'vivid', label: '비비드' },
                { value: 'monochrome', label: '모노크롬' },
              ]}
            />
          </Form.Item>
        </div>

        {/* 우: 미리보기 */}
        <div className="border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-700">미리보기</span>
            <div className="flex-1" />
            <DatePicker.RangePicker
              size="small"
              value={[dayjs(period.from), dayjs(period.to)]}
              onChange={(dates) => {
                if (dates?.[0] && dates?.[1]) {
                  setPeriod({ from: dates[0].format('YYYY-MM-DD'), to: dates[1].format('YYYY-MM-DD') });
                }
              }}
            />
            <Select size="small" value={timeUnit} onChange={setTimeUnit} style={{ width: 80 }}>
              <Select.Option value="MI">분</Select.Option>
              <Select.Option value="HH">시</Select.Option>
              <Select.Option value="DD">일</Select.Option>
              <Select.Option value="MM">월</Select.Option>
              <Select.Option value="YY">년</Select.Option>
            </Select>
            <Button size="small" type="primary" loading={isPending} disabled={!datasourceKey || activeFields.length === 0} onClick={handleQuery}>
              조회
            </Button>
          </div>
          {previewData ? (
            <Table
              size="small"
              dataSource={previewData.rows ?? []}
              rowKey={(_, idx) => String(idx)}
              columns={(previewData.columns ?? []).map((col: StatisticsQueryColumn) => ({
                key: col.fieldName,
                dataIndex: col.fieldName,
                title: col.displayName ?? col.fieldName,
                align: col.fieldType === 'NUMBER' ? ('right' as const) : ('left' as const),
              }))}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 'max-content' }}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 min-h-[120px] text-gray-400 text-sm border-2 border-dashed rounded-lg">
              기간을 선택하고 조회 버튼을 클릭하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
