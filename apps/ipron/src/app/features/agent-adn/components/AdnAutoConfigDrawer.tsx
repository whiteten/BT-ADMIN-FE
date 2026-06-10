/**
 * 자동채번 정책 설정 Drawer.
 *
 * AS-IS: SWAT IPR20S3011 Prefix 설정 팝업.
 *  - useYn (Switch) / adnPrefix (숫자 1~10) / digitLength (2~6) / description
 *  - 미리보기: prefix + 000..0 ~ prefix + 999..9 (자릿수 적용)
 *  - 충돌 검사: prefix + digitLength 변경 시 즉시 GET /conflict-check 호출하여 표시
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, InputNumber, Select, Switch } from 'antd';
import { useConflictCheck } from '../hooks/useAgentAdnQueries';
import type { AdnAutoConfigResponse, AdnAutoConfigUpsertRequest } from '../types';

interface AdnAutoConfigDrawerProps {
  open: boolean;
  initial: AdnAutoConfigResponse | null;
  onCancel: () => void;
  onSubmit: (values: AdnAutoConfigUpsertRequest) => void;
  submitting?: boolean;
}

export default function AdnAutoConfigDrawer({ open, initial, onCancel, onSubmit, submitting }: AdnAutoConfigDrawerProps) {
  const [form] = Form.useForm<AdnAutoConfigUpsertRequest>();

  // 미리보기/충돌검사 트리거용 라이브 값
  const [useYn, setUseYn] = useState<number>(0);
  const [prefix, setPrefix] = useState<string>('');
  const [digitLength, setDigitLength] = useState<number>(4);

  useEffect(() => {
    if (!open) return;
    const values: AdnAutoConfigUpsertRequest = {
      useYn: initial?.useYn ?? 0,
      adnPrefix: initial?.adnPrefix ?? '',
      digitLength: initial?.digitLength ?? 4,
      description: initial?.description ?? '',
    };
    form.setFieldsValue(values);
    setUseYn(values.useYn);
    setPrefix(values.adnPrefix ?? '');
    setDigitLength(values.digitLength ?? 4);
  }, [open, initial, form]);

  // 미리보기 범위
  const preview = useMemo(() => {
    if (!prefix || !digitLength) return null;
    const start = prefix + '0'.repeat(digitLength);
    const end = prefix + '9'.repeat(digitLength);
    const size = Math.pow(10, digitLength);
    return { start, end, size };
  }, [prefix, digitLength]);

  // 충돌 검사 — debounce 없이 hook이 enabled 조건으로 처리
  const { data: conflict } = useConflictCheck({
    params: prefix && digitLength ? { prefix, digitLength } : undefined,
  });

  const handleOk = async () => {
    const values = await form.validateFields();
    if (values.useYn === 1) {
      if (!values.adnPrefix) {
        form.setFields([{ name: 'adnPrefix', errors: ['활성 시 Prefix 는 필수입니다'] }]);
        return;
      }
      if (!values.digitLength) {
        form.setFields([{ name: 'digitLength', errors: ['활성 시 자릿수는 필수입니다'] }]);
        return;
      }
    }
    onSubmit(values);
  };

  return (
    <Drawer
      title="ADN 자동채번 설정"
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      width={480}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" onClick={handleOk} loading={submitting}>
            저장
          </Button>
        </div>
      }
    >
      <Alert
        type="info"
        showIcon
        message="Prefix + 자릿수로 ADN을 자동 채번해 미배정 상담사에게 일괄 매핑합니다."
        description="전체 테넌트 공통 정책입니다. 비활성 시 [자동배정] 버튼이 비활성화됩니다."
        className="!mb-4"
      />

      <Form form={form} layout="vertical" requiredMark>
        <Form.Item label="자동채번 사용" name="useYn" valuePropName="checked" getValueFromEvent={(checked) => (checked ? 1 : 0)} getValueProps={(v) => ({ checked: v === 1 })}>
          <Switch onChange={(checked) => setUseYn(checked ? 1 : 0)} />
        </Form.Item>

        <Form.Item
          label="ADN Prefix"
          name="adnPrefix"
          rules={[
            { required: useYn === 1, message: '활성 시 Prefix 는 필수입니다' },
            { pattern: /^\d{1,10}$/, message: '숫자 1~10자리' },
          ]}
        >
          <Input placeholder="예: 09" maxLength={10} onChange={(e) => setPrefix(e.target.value)} />
        </Form.Item>

        <Form.Item
          label="채번 자릿수"
          name="digitLength"
          rules={[{ required: useYn === 1, message: '활성 시 자릿수는 필수입니다' }]}
          extra="Prefix 뒤에 붙는 일련번호 자릿수 (2~6)"
        >
          <Select options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n}자리` }))} onChange={(v: number) => setDigitLength(v)} />
        </Form.Item>

        {/* 미리보기 */}
        {preview && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3">
            <div className="text-[11px] font-semibold text-blue-900 mb-1.5">생성 범위 미리보기</div>
            <div className="font-mono text-sm text-blue-900">
              {preview.start} ~ {preview.end}
            </div>
            <div className="text-[11px] text-blue-700 mt-1">최대 {preview.size.toLocaleString()}개 채번 가능</div>
          </div>
        )}

        {/* 충돌 검사 결과 */}
        {conflict && (conflict.usedAdns.length > 0 || conflict.conflictingDns.length > 0) && (
          <Alert
            type="warning"
            showIcon
            className="!mb-4"
            message={`충돌: 기존 ADN ${conflict.usedAdns.length}건 · 다른 DN ${conflict.conflictingDns.length}건`}
            description={
              <div className="text-[11px] text-amber-900 mt-1 space-y-1">
                {conflict.usedAdns.length > 0 && (
                  <div>
                    <span className="font-semibold">기존 ADN(자동배정 시 재사용):</span> <span className="font-mono">{conflict.usedAdns.slice(0, 6).join(', ')}</span>
                    {conflict.usedAdns.length > 6 && ` 외 ${conflict.usedAdns.length - 6}건`}
                  </div>
                )}
                {conflict.conflictingDns.length > 0 && (
                  <div>
                    <span className="font-semibold">다른 유형 DN(자동배정 시 회피):</span> <span className="font-mono">{conflict.conflictingDns.slice(0, 6).join(', ')}</span>
                    {conflict.conflictingDns.length > 6 && ` 외 ${conflict.conflictingDns.length - 6}건`}
                  </div>
                )}
              </div>
            }
          />
        )}

        {initial?.workTime && <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">최근 변경: {initial.workTime}</div>}
      </Form>
    </Drawer>
  );
}
