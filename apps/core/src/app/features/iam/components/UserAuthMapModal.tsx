/**
 * 사용자 권한 부여/차단 Modal
 * - forwardRef + useImperativeHandle 패턴 적용
 * - 단일 사용자, 다중 권한 선택 (Checkbox 트리)
 * - userId는 props로 전달받음 (URL path에서 추출)
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Form, Modal, Radio, Tag } from 'antd';
import { CheckCircle, Shield, XCircle } from 'lucide-react';
import { toast } from '@/shared-util';
import PermissionSelector from './PermissionSelector';
import { useCreateUserAuthMapMutation } from '../hooks/useUserAuthQueries';
import type { UserAuthMapCreateRequest } from '../types/iam.types';

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

interface UserAuthMapModalProps {
  /** 대상 사용자 ID (필수) */
  userId: number;
  /** 성공 시 콜백 */
  onSuccess?: () => void;
}

/**
 * 사용자 권한 부여/차단 Modal
 * - ref.open() : 모달 열기
 * - ref.close() : 모달 닫기
 */
const UserAuthMapModal = forwardRef<UserAuthMapModalRef, UserAuthMapModalProps>(({ userId, onSuccess }, ref) => {
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

  // API 연동: 생성 Mutation (userId 전달)
  const { mutate: createMappings, isPending: isCreating } = useCreateUserAuthMapMutation(userId, {
    mutationOptions: {
      onSuccess: (response) => {
        toast.success(`${response.totalCreated}개의 권한 매핑이 생성되었습니다.`);
        handleClose();
        onSuccess?.();
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : '권한 매핑 생성에 실패했습니다.';
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

      // 선택된 권한 검증
      if (selectedPermissions.size === 0) {
        toast.warning('권한을 하나 이상 선택해주세요.');
        return;
      }

      const request: UserAuthMapCreateRequest = {
        authIds: Array.from(selectedPermissions),
        mapType: values.mapType,
      };

      createMappings(request);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-blue-600" />
          <span>권한 부여/차단</span>
        </div>
      }
      open={open}
      onOk={handleSave}
      onCancel={handleClose}
      okText="저장"
      cancelText="취소"
      confirmLoading={isCreating}
      width={700}
      styles={{
        body: {
          height: '65vh',
          maxHeight: '75vh',
          overflowY: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4 flex-1 flex flex-col min-h-0">
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
          className="flex-1 min-h-0 [&>.ant-form-item-row]:h-full [&>.ant-form-item-row>.ant-form-item-control]:flex-1 [&>.ant-form-item-row>.ant-form-item-control]:min-h-0"
        >
          <PermissionSelector value={selectedPermissions} onChange={setSelectedPermissions} />
        </Form.Item>
      </Form>
    </Modal>
  );
});

UserAuthMapModal.displayName = 'UserAuthMapModal';

export default UserAuthMapModal;
