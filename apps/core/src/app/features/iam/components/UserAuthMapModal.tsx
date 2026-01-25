/**
 * 사용자 권한 부여/차단 Modal
 * - forwardRef + useImperativeHandle 패턴 적용
 * - 다중 사용자 선택 가능
 * - 다중 권한 선택 가능 (Checkbox 트리)
 * - 만료일 지정 가능 (임시 권한)
 * - 사유 기록 필수
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { DatePicker, Form, Input, Modal, Radio, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle, Shield, Users, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import PermissionSelector from './PermissionSelector';
import { useCreateUserAuthMapBatchMutation } from '../hooks/useUserAuthQueries';
import type { UserAuthMapBatchRequest } from '../types/iam.types';

const { RangePicker } = DatePicker;

/**
 * UserAuthMapModal ref 타입
 * @property open - 모달을 여는 함수
 * @property close - 모달을 닫는 함수
 */
export interface UserAuthMapModalRef {
  open: () => void;
  close: () => void;
}

/**
 * 모달 내부 상태 타입
 */
interface ModalState {
  open: boolean;
}

interface UserOption {
  label: string;
  value: number;
}

interface UserAuthMapModalProps {
  userOptions: UserOption[];
  onSuccess?: () => void;
}

/**
 * 사용자 권한 부여/차단 Modal
 * - ref.open() : 모달 열기
 * - ref.close() : 모달 닫기
 */
const UserAuthMapModal = forwardRef<UserAuthMapModalRef, UserAuthMapModalProps>(({ userOptions, onSuccess }, ref) => {
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
  });

  const { open } = modalState;

  const [form] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  // 부모 컴포넌트에서 ref를 통해 호출할 수 있는 메서드 정의
  useImperativeHandle(ref, () => ({
    open: () => {
      setModalState({ open: true });
    },
    close: () => {
      setModalState({ open: false });
    },
  }));

  const handleClose = () => {
    setModalState({ open: false });
  };

  // API 연동: 배치 생성 Mutation
  const { mutate: createBatch, isPending: isCreating } = useCreateUserAuthMapBatchMutation({
    mutationOptions: {
      onSuccess: (response) => {
        toast.success(`${response.totalCreated}건의 권한 설정이 생성되었습니다.`);
        handleClose();
        onSuccess?.();
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '권한 설정 생성에 실패했습니다.';
        toast.error(errorMessage);
      },
    },
  });

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (!open) return;

    form.resetFields();
    setSelectedPermissions(new Set());

    return () => {
      form.resetFields();
      setSelectedPermissions(new Set());
    };
  }, [form, open]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 선택된 사용자/권한 검증
      if (!values.userIds || values.userIds.length === 0) {
        toast.warning('사용자를 선택해주세요.');
        return;
      }
      if (selectedPermissions.size === 0) {
        toast.warning('권한을 선택해주세요.');
        return;
      }

      // 날짜 범위 처리 (선택하지 않으면 기본값: 오늘 ~ 1년 후)
      const now = dayjs();
      const defaultStartDate = now.startOf('day');
      const defaultEndDate = now.add(1, 'year').endOf('day');

      const startDate = values.effectiveRange?.[0] ?? defaultStartDate;
      const endDate = values.effectiveRange?.[1] ?? defaultEndDate;

      const request: UserAuthMapBatchRequest = {
        userIds: values.userIds,
        authIds: Array.from(selectedPermissions),
        mapType: values.mapType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        description: values.description,
      };

      createBatch(request);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Users className="size-5 text-blue-600" />
          <span>사용자 권한 부여/차단 (다중 선택)</span>
        </div>
      }
      open={open}
      onOk={handleSave}
      onCancel={handleClose}
      okText="저장"
      cancelText="취소"
      confirmLoading={isCreating}
      width={700}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        {/* 사용자 다중 선택 */}
        <Form.Item
          label={
            <span className="flex items-center gap-2">
              <Users className="size-4 text-gray-500" />
              사용자 (다중 선택)
            </span>
          }
          name="userIds"
          rules={[{ required: true, message: '사용자를 선택해주세요' }]}
        >
          <Select
            mode="multiple"
            showSearch
            placeholder="사용자를 선택하세요 (여러 명 선택 가능)"
            options={userOptions}
            filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
            maxTagCount="responsive"
          />
        </Form.Item>

        {/* 유형 선택 */}
        <Form.Item label="유형" name="mapType" rules={[{ required: true, message: '유형을 선택해주세요' }]}>
          <Radio.Group className="w-full">
            <Radio.Button value="ALLOW" className="w-1/2 text-center">
              <span className="inline-flex items-center justify-center gap-1">
                <CheckCircle className="size-3.5 text-green-500" />
                권한 허용
              </span>
            </Radio.Button>
            <Radio.Button value="DENY" className="w-1/2 text-center">
              <span className="inline-flex items-center justify-center gap-1">
                <XCircle className="size-3.5 text-red-500" />
                권한 차단
              </span>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 권한 다중 선택 (Checkbox 트리) */}
        <Form.Item
          label={
            <span className="flex items-center gap-2">
              <Shield className="size-4 text-gray-500" />
              권한 (다중 선택)
              {selectedPermissions.size > 0 && <Tag color="blue">{selectedPermissions.size}개 선택</Tag>}
            </span>
          }
          required
        >
          <PermissionSelector value={selectedPermissions} onChange={setSelectedPermissions} />
        </Form.Item>

        {/* 적용 기간 */}
        <Form.Item label="적용 기간" name="effectiveRange" help="설정하지 않으면 오늘부터 1년간 적용됩니다.">
          <RangePicker showTime className="w-full" placeholder={['시작일', '종료일']} />
        </Form.Item>

        {/* 사유 */}
        <Form.Item label="사유" name="description" rules={[{ required: true, message: '사유를 입력해주세요' }]}>
          <Input.TextArea rows={3} placeholder="권한 부여/차단 사유를 입력하세요" />
        </Form.Item>

        {/* 요약 정보 */}
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const userIds = getFieldValue('userIds') || [];
            const mapType = getFieldValue('mapType');
            const totalRecords = userIds.length * selectedPermissions.size;

            if (userIds.length > 0 && selectedPermissions.size > 0) {
              return (
                <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                  <div className="font-medium mb-2">생성 예정:</div>
                  <div className="text-gray-600">
                    <span className="text-blue-600 font-semibold">{userIds.length}</span>명의 사용자 x{' '}
                    <span className="text-blue-600 font-semibold">{selectedPermissions.size}</span>개의 권한 ={' '}
                    <span className={`font-bold ${mapType === 'ALLOW' ? 'text-green-600' : 'text-red-600'}`}>
                      총 {totalRecords}건 {mapType === 'ALLOW' ? '부여' : '차단'}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
});

UserAuthMapModal.displayName = 'UserAuthMapModal';

export default UserAuthMapModal;
