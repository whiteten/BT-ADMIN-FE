import { Form, type FormProps, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateCalcField, useUpdateCalcField } from '../../report/hooks/useReportQueries';
import type { CalcField, CalcFieldCreateDatas, ColumnFormat, KpiDirection } from '../../report/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CalcFieldEditorProps {
  reportId?: number;
  calcField?: CalcField | (CalcFieldCreateDatas & { _localId?: string });
  onClose(): void;
  onSave?: (data: CalcFieldCreateDatas) => void;
}

const FORMAT_OPTIONS: { value: ColumnFormat; label: string }[] = [
  { value: 'Number', label: 'Number (정수)' },
  { value: 'Decimal', label: 'Decimal (소수)' },
  { value: 'Rate', label: 'Rate (%)' },
  { value: 'String', label: 'String (문자)' },
  { value: 'Date', label: 'Date (날짜)' },
  { value: 'Time', label: 'Time (시간)' },
];

const KPI_DIRECTION_OPTIONS: { value: KpiDirection; label: string }[] = [
  { value: 'HIGHER_BETTER', label: '높을수록 좋음' },
  { value: 'LOWER_BETTER', label: '낮을수록 좋음' },
  { value: 'NEUTRAL', label: '중립' },
];

export default function CalcFieldEditor({ reportId, calcField, onClose, onSave }: CalcFieldEditorProps) {
  const isEdit = !!calcField;
  const [form] = Form.useForm<CalcFieldCreateDatas>();

  const { mutate: createCalcField, isPending: creating } = useCreateCalcField({
    mutationOptions: {
      onSuccess: () => {
        toast.success('계산 필드가 추가되었습니다.');
        onClose();
      },
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: updateCalcField, isPending: updating } = useUpdateCalcField({
    mutationOptions: {
      onSuccess: () => {
        toast.success('계산 필드가 수정되었습니다.');
        onClose();
      },
      onError: () => toast.error('수정 중 오류가 발생했습니다.'),
    },
  });

  const handleFinish: FormProps<CalcFieldCreateDatas>['onFinish'] = (values) => {
    if (onSave) {
      onSave(values);
      onClose();
      return;
    }
    if (!reportId) return;
    if (isEdit) {
      updateCalcField({ reportId, calcFieldId: (calcField as CalcField).calcFieldId, data: values });
    } else {
      createCalcField({ reportId, data: values });
    }
  };

  const handleFinishFailed: FormProps<CalcFieldCreateDatas>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[14px]">{isEdit ? '계산 필드 수정' : '계산 필드 추가'}</DialogTitle>
        </DialogHeader>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          initialValues={
            calcField ?? {
              columnFormat: 'Number',
              kpiDirection: 'NEUTRAL',
            }
          }
        >
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="fieldCode"
              label={<span className="text-[12px]">필드 코드</span>}
              rules={[
                { required: true, message: '필드 코드를 입력하세요.' },
                { pattern: /^[A-Z_][A-Z0-9_]*$/, message: '대문자와 밑줄만 허용됩니다.' },
              ]}
              hasFeedback
            >
              <Input disabled={isEdit} className="font-mono text-[12px]" placeholder="ANSWER_RATE" />
            </Form.Item>

            <Form.Item name="displayName" label={<span className="text-[12px]">표시명</span>} rules={[{ required: true, message: '표시명을 입력하세요.' }]} hasFeedback>
              <Input className="text-[12px]" placeholder="응답률" />
            </Form.Item>

            <Form.Item name="columnFormat" label={<span className="text-[12px]">컬럼 서식</span>}>
              <Select options={FORMAT_OPTIONS} className="text-[12px]" />
            </Form.Item>

            <Form.Item name="kpiDirection" label={<span className="text-[12px]">KPI 방향</span>}>
              <Select options={KPI_DIRECTION_OPTIONS} className="text-[12px]" />
            </Form.Item>
          </div>

          <Form.Item name="rowExpression" label={<span className="text-[12px] font-medium">Row-level 수식</span>} rules={[{ required: true, message: 'Row 수식을 입력하세요.' }]}>
            <Input.TextArea rows={3} className="font-mono text-[12px] resize-none" placeholder="ANSWER_CNT / TOTAL_CALL * 100" />
          </Form.Item>

          <Form.Item
            name="aggExpression"
            label={
              <span className="text-[12px] font-medium">
                외부 집계 식 (푸터/그룹 계산 — D122)
                <span className="ml-1 text-[10px] text-bt-fg-muted">(선택)</span>
              </span>
            }
          >
            <Input.TextArea rows={2} className="font-mono text-[12px] resize-none" placeholder="SUM(ANSWER_CNT) / SUM(TOTAL_CALL) * 100" />
          </Form.Item>
          <p className="text-[10px] text-bt-warn -mt-3 mb-3">⚠️ 행 단위 백분율의 평균은 가중평균이 아니므로 푸터 오류 방지를 위해 명시 권장</p>
        </Form>

        <DialogFooter>
          <Button variant="outline" size="sm" className="text-[12px]" onClick={onClose}>
            취소
          </Button>
          <Button size="sm" className="bg-bt-primary hover:bg-bt-primary-hover text-white text-[12px]" onClick={() => form.submit()} disabled={creating || updating}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
