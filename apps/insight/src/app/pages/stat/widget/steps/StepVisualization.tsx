import { Card, Form, Select } from 'antd';

const CHART_TYPES = [
  { value: 'LINE', label: '라인 차트', icon: '📈' },
  { value: 'BAR', label: '바 차트', icon: '📊' },
  { value: 'PIE', label: '파이 차트', icon: '🥧' },
  { value: 'DONUT', label: '도넛 차트', icon: '🍩' },
  { value: 'GRID', label: '그리드 (테이블)', icon: '📋' },
];

interface Props {
  form: ReturnType<typeof Form.useForm>[0];
}

export default function StepVisualization({ form }: Props) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-medium mb-3">시각화 설정</h3>
        <p className="text-sm text-gray-500 mb-4">차트 유형과 표시 옵션을 설정합니다.</p>
      </div>
      <Form.Item name="visualization" label="차트 유형">
        <div className="grid grid-cols-5 gap-3">
          {CHART_TYPES.map((ct) => (
            <Card
              key={ct.value}
              size="small"
              className="cursor-pointer text-center hover:border-blue-500 transition-all"
              onClick={() => form.setFieldValue('visualization', ct.value)}
            >
              <div className="text-2xl mb-1">{ct.icon}</div>
              <div className="text-xs">{ct.label}</div>
            </Card>
          ))}
        </div>
      </Form.Item>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item label="범례 위치">
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
        <Form.Item label="색상 팔레트">
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
    </div>
  );
}
