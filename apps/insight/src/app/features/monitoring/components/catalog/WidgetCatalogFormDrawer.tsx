import { useEffect, useState } from 'react';
import { Button, Col, Drawer, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { Info } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import WidgetCatalogSettingsForm from './WidgetCatalogSettingsForm';
import TagInput from '../../../../components/TagInput';
import { useUpdateCustomWidgetCatalog } from '../../hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem, WidgetCategory } from '../../types';

const { TextArea } = Input;

const MAX_TAGS = 5;

const CATEGORY_OPTIONS: { value: WidgetCategory; label: string }[] = [
  { value: 'KPI', label: 'KPI' },
  { value: 'CHART', label: 'CHART (차트)' },
  { value: 'TABLE', label: 'TABLE (표)' },
  { value: 'STATUS', label: 'STATUS (상태판)' },
  { value: 'GENERIC', label: 'GENERIC (일반)' },
];

interface FormValues {
  widgetName: string;
  description?: string;
  widgetCategory: WidgetCategory;
  minW: number;
  minH: number;
}

interface Props {
  open: boolean;
  initial: CustomWidgetCatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const roLabelCls = 'text-[11px] font-medium text-[#868e96]';
const roValueCls = 'text-[12px] font-mono text-[#495057] break-all';

/**
 * 커스텀 위젯 카탈로그 편집 Drawer (관리 화면).
 * <p>
 * 변경 허용: 위젯명·설명·태그·카테고리·최소 크기 + 위젯별 기본 설정(구조화 폼).
 * 읽기전용: 위젯 식별자·BE Bean·FE 컴포넌트·등록 시각 (BE 화이트리스트로도 보호).
 */
export default function WidgetCatalogFormDrawer({ open, initial, onClose, onSaved }: Props) {
  const [form] = Form.useForm<FormValues>();
  // settings(JSON)·tags 는 antd Form value 체계 밖이라 로컬 상태로 제어
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !initial) return;
    form.setFieldsValue({
      widgetName: initial.widgetName,
      description: initial.description ?? '',
      widgetCategory: initial.widgetCategory,
      minW: initial.minW,
      minH: initial.minH,
    });
    setSettings({ ...(initial.defaultSettings ?? {}) });
    setTags([...(initial.tags ?? [])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { mutate: runUpdate, isPending } = useUpdateCustomWidgetCatalog({
    mutationOptions: {
      onSuccess: () => {
        toast.success('위젯이 수정되었습니다.');
        onSaved();
        onClose();
      },
    },
  });

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    if (!initial) return;
    runUpdate({
      widgetTypeId: initial.widgetTypeId,
      data: {
        widgetName: values.widgetName.trim(),
        description: values.description?.trim() || undefined,
        tags,
        widgetCategory: values.widgetCategory,
        minW: values.minW,
        minH: values.minH,
        defaultSettings: settings,
      },
    });
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => Log.warn('WidgetCatalog onFinishFailed', errorInfo);

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={onClose}>취소</Button>
      <Button type="primary" onClick={() => form.submit()} loading={isPending}>
        수정
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title="위젯 편집" closable={{ placement: 'end' }} size="large" footer={footer} destroyOnHidden>
      {initial && (
        <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
          {/* 읽기전용 식별자 */}
          <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-md bg-[var(--color-bt-bg-muted)] px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className={roLabelCls}>위젯 식별자</span>
              <span className={roValueCls}>{initial.widgetTypeId}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={roLabelCls}>등록 시각</span>
              <span className="text-[12px] text-[#495057]">{initial.createdAt ? new Date(initial.createdAt).toLocaleString('ko-KR') : '-'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={roLabelCls}>BE Bean</span>
              <span className={roValueCls}>{initial.beBeanName ?? '-'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={roLabelCls}>FE 컴포넌트</span>
              <span className={roValueCls}>{initial.feComponent ?? '-'}</span>
            </div>
          </div>

          <Form.Item
            label="위젯명"
            name="widgetName"
            rules={[
              { required: true, message: '위젯명을 입력하세요.' },
              { whitespace: true, message: '위젯명을 입력하세요.' },
              { max: 120, message: '120자까지 입력 가능합니다.' },
            ]}
          >
            <Input placeholder="예: 상담사 상태 매트릭스" />
          </Form.Item>

          <Form.Item label="태그" tooltip="분류·검색에 사용됩니다." extra={`Enter 또는 쉼표로 여러 개 추가 — 최대 ${MAX_TAGS}개`}>
            <TagInput value={tags} onChange={setTags} maxTags={MAX_TAGS} />
          </Form.Item>

          <Form.Item label="설명" name="description" rules={[{ max: 500, message: '500자까지 입력 가능합니다.' }]}>
            <TextArea rows={3} autoSize={{ minRows: 3, maxRows: 6 }} placeholder="사용자에게 보일 위젯 설명" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="카테고리" name="widgetCategory" rules={[{ required: true, message: '카테고리를 선택하세요.' }]}>
                <Select options={CATEGORY_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="최소 너비 (칸)" name="minW" rules={[{ required: true, message: '최소 너비를 입력하세요.' }]}>
                <InputNumber min={1} max={12} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="최소 높이 (칸)" name="minH" rules={[{ required: true, message: '최소 높이를 입력하세요.' }]}>
                <InputNumber min={1} max={12} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>

          {/* 기본 설정 (위젯 타입별 구조화 폼) */}
          <div className="mt-2 mb-3 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#212529]">기본 설정</span>
          </div>
          <div className="mb-3 flex items-start gap-2 rounded bg-[var(--color-bt-primary-soft)] px-3 py-2">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--color-bt-primary)]" />
            <span className="text-[12px] leading-relaxed text-[#495057]">
              여기서 바꾼 기본 설정은 <b>개인 설정을 저장하지 않은 사용자</b>에게만 적용됩니다. 이미 개인 설정을 저장한 사용자에게는 영향을 주지 않습니다.
            </span>
          </div>
          <WidgetCatalogSettingsForm widgetTypeId={initial.widgetTypeId} value={settings} onChange={setSettings} />
        </Form>
      )}
    </Drawer>
  );
}
