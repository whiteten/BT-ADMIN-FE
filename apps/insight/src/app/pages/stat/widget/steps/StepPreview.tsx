import { useState } from 'react';
import { Button, DatePicker, Select, Table } from 'antd';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { usePreviewStatQuery } from '../../../../features/stat/hooks/useStatQueries';
import type { StatisticsQueryColumn } from '../../../../features/stat/types/query';

interface Props {
  datasourceKey?: string;
  fieldNames?: string[];
  visualization?: string;
}

export default function StepPreview({ datasourceKey, fieldNames }: Props) {
  const [period, setPeriod] = useState({
    from: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });
  const [timeUnit, setTimeUnit] = useState('DD');
  const { mutate: runPreview, data, isPending } = usePreviewStatQuery({});

  const handleQuery = () => {
    if (!datasourceKey || !fieldNames?.length) {
      toast.error('데이터소스와 필드를 먼저 설정해주세요.');
      return;
    }
    runPreview({
      datasourceKey,
      fieldNames,
      globalFilters: { period, timeUnit },
      searchValues: {},
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-[13px] font-semibold text-gray-900">미리보기</h3>
        <p className="text-[12px] text-gray-500 mt-0.5">실제 데이터로 위젯이 어떻게 표시되는지 확인합니다.</p>
      </div>
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
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
        <Button size="small" type="primary" loading={isPending} onClick={handleQuery}>
          조회
        </Button>
      </div>
      {data ? (
        <Table
          size="small"
          dataSource={data.rows ?? []}
          rowKey={(_, idx) => String(idx)}
          columns={(data.columns ?? []).map((col: StatisticsQueryColumn) => ({
            key: col.fieldName,
            dataIndex: col.fieldName,
            title: col.displayName ?? col.fieldName,
            align: col.fieldType === 'NUMBER' ? ('right' as const) : ('left' as const),
          }))}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 'max-content' }}
        />
      ) : (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm border-2 border-dashed rounded-lg">기간을 선택하고 조회 버튼을 클릭하세요</div>
      )}
    </div>
  );
}
