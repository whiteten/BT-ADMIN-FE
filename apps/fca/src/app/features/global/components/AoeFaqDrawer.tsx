import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, type FormProps, Input } from 'antd';
import { MinusCircle, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { aoeQueryKeys, useCreateFaq, useDeleteFaq, useGetFaqDetail, useUpdateFaq } from '../hooks/useAoeQueries';
import type { FaqFormData, FaqListItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// ============ 타입 정의 ============

/**
 * AoeFaqDrawer ref 타입
 * @property open - 드로어를 여는 함수. faqData가 없으면 추가 모드, 있으면 편집 모드
 * @property close - 드로어를 닫는 함수
 */
export interface AoeFaqDrawerRef {
  open: (params: { aoeAgentId: string; faqData?: FaqListItem }) => void;
  close: () => void;
}

export interface AoeFaqDrawerProps {
  onSave?: (data: FaqFormData, isEditMode: boolean) => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  aoeAgentId?: string;
  faqData?: FaqListItem;
}

// ============ 컴포넌트 ===========
/**
 * FAQ 등록/수정 Drawer
 * - ref.open({}) : 추가 모드로 열기
 * - ref.open({ faqData }) : 편집 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const AoeFaqDrawer = forwardRef<AoeFaqDrawerRef, AoeFaqDrawerProps>(({ onSave }, ref) => {
  const modal = useModal();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FaqFormData>();

  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    faqData: undefined,
  });

  const { open, aoeAgentId, faqData } = drawerState;
  const isEditMode = !!faqData;
  const title = isEditMode ? 'FAQ 수정' : 'FAQ 추가';

  // FAQ 상세 조회
  const { data: faqDetail, isFetching } = useGetFaqDetail({
    params: faqData ? { aoeAgentId: faqData.aoeAgentId, faqId: faqData.faqId } : undefined,
    queryOptions: { enabled: isEditMode && open },
  });

  // FAQ 생성
  const { mutate: createFaq, isPending: isCreating } = useCreateFaq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('FAQ가 추가되었습니다.');
        if (aoeAgentId) {
          queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqList({ aoeAgentId }).queryKey });
        }
        handleClose();
      },
    },
  });

  // FAQ 삭제
  const { mutate: deleteFaq, isPending: isDeleting } = useDeleteFaq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('FAQ가 삭제되었습니다.');
        if (aoeAgentId) {
          queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqList({ aoeAgentId }).queryKey });
        }
        handleClose();
      },
    },
  });

  // FAQ 수정
  const { mutate: updateFaq, isPending: isUpdating } = useUpdateFaq({
    mutationOptions: {
      onSuccess: () => {
        toast.success('FAQ가 수정되었습니다.');
        if (aoeAgentId) {
          queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqList({ aoeAgentId }).queryKey });
          queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getFaqDetail({ aoeAgentId, faqId: faqData?.faqId }).queryKey });
        }
        handleClose();
      },
    },
  });

  // ========== Ref 메서드 ==========
  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        aoeAgentId: params.aoeAgentId,
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

    if (isEditMode && faqDetail) {
      // 편집 모드: 상세 데이터 로드
      const sentences = faqDetail.sentences.map((s) => s.sentence);
      form.setFieldsValue({
        sentences,
        answer: faqDetail.faqAnswer,
      });
    } else if (!isEditMode) {
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
  }, [form, open, isEditMode, faqDetail]);

  // ========== 폼 제출 ==========
  const onFinish: FormProps<FaqFormData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);

    if (!aoeAgentId) {
      toast.error('Agent ID가 없습니다.');
      return;
    }

    if (isEditMode && faqData) {
      // 편집 모드: FAQ 수정 API 호출
      updateFaq({
        params: { aoeAgentId, faqId: faqData.faqId },
        data: {
          faqAnswer: values.answer,
          sentences: values.sentences,
        },
      });
    } else {
      // 추가 모드: FAQ 생성 API 호출
      createFaq({
        params: { aoeAgentId },
        data: {
          faqAnswer: values.answer,
          sentences: values.sentences,
        },
      });
    }
  };

  const onFinishFailed: FormProps<FaqFormData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    if (!faqData || !aoeAgentId) return;
    modal.confirm.delete({
      onOk: () => {
        deleteFaq({ aoeAgentId, faqId: faqData.faqId });
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
        <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={isDeleting}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isCreating || isUpdating}>
        저장
      </Button>
    </div>
  );

  // ========== 렌더 ==========
  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      {isEditMode && isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
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
      )}
    </Drawer>
  );
});

export default AoeFaqDrawer;
