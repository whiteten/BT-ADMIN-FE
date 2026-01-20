import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, type FormProps, Input } from 'antd';
import { MinusCircle, Plus } from 'lucide-react';
import { Log } from '@/log';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// ============ 타입 정의 ============

interface AoeFaqItem {
  faqId: string;
  enable: 0 | 1;
  sentences: string[];
  answer: string;
  updatedAt: string;
}

interface AoeFaqFormData {
  sentences: string[];
  answer: string;
}

/**
 * AoeFaqDrawer ref 타입
 * @property open - 드로어를 여는 함수. faqData가 없으면 추가 모드, 있으면 편집 모드
 * @property close - 드로어를 닫는 함수
 */
export interface AoeFaqDrawerRef {
  open: (params: { faqData?: AoeFaqItem }) => void;
  close: () => void;
}

export interface AoeFaqDrawerProps {
  onSave?: (data: AoeFaqFormData, isEditMode: boolean) => void;
  onDelete?: (faqId: string) => void;
}

interface DrawerState {
  open: boolean;
  faqData?: AoeFaqItem;
}

// ============ 컴포넌트 ============

const AoeFaqDrawer = forwardRef<AoeFaqDrawerRef, AoeFaqDrawerProps>(({ onSave, onDelete }, ref) => {
  const modal = useModal();
  const [form] = Form.useForm<AoeFaqFormData>();

  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    faqData: undefined,
  });

  const { open, faqData } = drawerState;
  const isEditMode = !!faqData;
  const title = isEditMode ? 'FAQ 수정' : 'FAQ 추가';

  // ========== Ref 메서드 ==========
  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        faqData: params.faqData,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  // ========== 핸들러 ==========
  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  // ========== 폼 초기화 ==========
  useEffect(() => {
    if (!open) return;

    if (faqData) {
      // 편집 모드: 기존 데이터 로드
      form.setFieldsValue({
        sentences: faqData.sentences,
        answer: faqData.answer,
      });
    } else {
      // 추가 모드: 빈 폼 (질문 1개)
      form.setFieldsValue({
        sentences: [''],
        answer: '',
      });
    }

    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open, faqData]);

  // ========== 폼 제출 ==========
  const onFinish: FormProps<AoeFaqFormData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    onSave?.(values, isEditMode);
    // 퍼블리싱 단계에서는 Drawer 닫기 (API 연동 시 성공 콜백에서 처리)
    handleClose();
  };

  const onFinishFailed: FormProps<AoeFaqFormData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    if (!faqData) return;
    modal.confirm.delete({
      onOk: () => {
        onDelete?.(faqData.faqId);
        handleClose();
      },
    });
  };

  // ========== Footer ==========
  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        닫기
      </Button>
      {isEditMode && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn}>
        저장
      </Button>
    </div>
  );

  // ========== 렌더 ==========
  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={{ sentences: [''], answer: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed}>
        {/* 질문 섹션 - Form.List */}
        <Form.Item label="질문" required>
          <Form.List name="sentences">
            {(fields, { add, remove }) => (
              <div className="flex flex-col gap-2">
                {fields.map(({ key, ...restField }) => (
                  <div key={key} className="flex gap-2">
                    <Form.Item {...restField} className="!mb-0 flex-1" rules={[{ required: true, message: '질문을 입력하세요.' }]}>
                      <Input placeholder="질문을 입력하세요." />
                    </Form.Item>
                    {fields.length > 1 && <Button type="text" icon={<MinusCircle className="size-4" />} onClick={() => remove(restField.name)} className="!text-red-500" />}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add('')} icon={<Plus className="size-4" />} className="!mt-2">
                  질문 추가
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>

        {/* 답변 섹션 */}
        <Form.Item name="answer" label="답변내용" required rules={[{ required: true, message: '답변내용을 입력하세요.' }]}>
          <Input placeholder="답변내용을 입력하세요." />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

export default AoeFaqDrawer;
