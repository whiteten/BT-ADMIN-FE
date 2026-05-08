import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, Input, Row, Select, Switch } from 'antd';
import { toast } from '@/shared-util';
import { conditionQueryKeys, useCreateCondition, useUpdateCondition } from '../../features/condition/hooks/useConditionQueries';
import type { SearchConditionItem, SearchConditionRequest } from '../../features/condition/types/condition.types';

/**
 * ConditionFormDrawer ref 타입
 * @property open - 드로어를 여는 함수. item이 없으면 등록 모드, 있으면 수정 모드
 * @property close - 드로어를 닫는 함수
 */
export interface ConditionFormDrawerRef {
  open: (item?: SearchConditionItem) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const INPUT_TYPE_OPTIONS = [
  { value: 'DATE_RANGE', label: '날짜 범위 선택기' },
  { value: 'DATE_SINGLE', label: '단일 날짜 선택기' },
  { value: 'TIME_RANGE', label: '시간 범위 선택기' },
  { value: 'SINGLE_SELECT', label: '단일 선택 드롭다운' },
  { value: 'MULTI_SELECT', label: '멀티 선택 드롭다운' },
  { value: 'SEGMENT', label: '세그먼트 컨트롤' },
  { value: 'RADIO_GROUP', label: '라디오 버튼 그룹' },
  { value: 'CHECKBOX', label: '단일 체크박스' },
  { value: 'TOGGLE', label: '토글 스위치' },
  { value: 'TEXT', label: '텍스트 입력' },
  { value: 'NUMBER_RANGE', label: '숫자 범위 입력' },
];

const OPERATOR_OPTIONS = [
  { value: 'EQ', label: '= (같음)' },
  { value: 'NE', label: '!= (다름)' },
  { value: 'GT', label: '> (초과)' },
  { value: 'LT', label: '< (미만)' },
  { value: 'GTE', label: '>= (이상)' },
  { value: 'LTE', label: '<= (이하)' },
  { value: 'IN', label: 'IN (포함)' },
  { value: 'BETWEEN', label: 'BETWEEN (범위)' },
  { value: 'LIKE', label: 'LIKE (유사)' },
];

/**
 * 검색조건 등록/수정 Drawer
 * - ref.open() : 등록 모드로 열기
 * - ref.open(item) : 수정 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const ConditionFormDrawer = forwardRef<ConditionFormDrawerRef, Props>(({ onSuccess }, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<SearchConditionItem | null>(null);

  const isEditMode = !!editItem;

  useImperativeHandle(ref, () => ({
    open: (item?: SearchConditionItem) => {
      if (item) {
        setEditItem(item);
      } else {
        setEditItem(null);
      }
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  useEffect(() => {
    if (!isOpen) return;
    if (editItem) {
      form.setFieldsValue({
        conditionName: editItem.conditionName,
        inputType: editItem.inputType,
        operator: editItem.operator,
        defaultValue: editItem.defaultValue,
        optionsSource: editItem.optionsSource,
        groupKey: editItem.groupKey,
        groupLabel: editItem.groupLabel,
        isRequired: editItem.isRequired,
        sortOrder: editItem.sortOrder,
      });
    }
    return () => {
      form.resetFields();
    };
  }, [editItem, form, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: conditionQueryKeys.getList._def });
  };

  // Mutation hooks
  const createMutation = useCreateCondition({
    mutationOptions: {
      onSuccess: () => {
        invalidateList();
        toast.success('검색조건이 등록되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: () => {
        toast.error('검색조건 등록에 실패했습니다.');
      },
    },
  });

  const updateMutation = useUpdateCondition({
    mutationOptions: {
      onSuccess: () => {
        invalidateList();
        toast.success('검색조건이 수정되었습니다.');
        handleClose();
        onSuccess();
      },
      onError: () => {
        toast.error('검색조건 수정에 실패했습니다.');
      },
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const request: SearchConditionRequest = { ...values };

      if (isEditMode && editItem) {
        updateMutation.mutate({
          params: { conditionId: editItem.conditionId },
          data: request,
        });
      } else {
        createMutation.mutate(request);
      }
    });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose} disabled={isLoading}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmit} loading={isLoading} disabled={isLoading}>
        {isEditMode ? '수정' : '저장'}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title={isEditMode ? '검색조건 수정' : '새 검색조건 등록'}
      closable={{ placement: 'end' }}
      size={520}
      footer={footer}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ isRequired: false, sortOrder: 0 }}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="conditionName" label="검색조건명" rules={[{ required: true, message: '검색조건명을 입력하세요.' }]}>
              <Input placeholder="조회기간" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="inputType" label="입력 유형" rules={[{ required: true, message: '입력 유형을 선택하세요.' }]}>
              <Select placeholder="입력 유형 선택" options={INPUT_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="operator" label="연산자" rules={[{ required: true, message: '연산자를 선택하세요.' }]}>
              <Select placeholder="연산자 선택" options={OPERATOR_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="defaultValue" label="기본값">
              <Input placeholder="최근 7일" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="optionsSource" label="선택지 소스" tooltip="STATIC:값1,값2 또는 API:/api/dashboard/options/services">
              <Input placeholder="STATIC:값1,값2 또는 API:/api/..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="groupKey" label="그룹 키">
              <Input placeholder="period" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="groupLabel" label="그룹 표시명">
              <Input placeholder="기간 조건" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="isRequired" label="필수 여부" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="sortOrder" label="표시 순서">
              <Input type="number" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

ConditionFormDrawer.displayName = 'ConditionFormDrawer';

export default ConditionFormDrawer;
