import { Modal, type ModalFuncProps } from 'antd';

type OnOkCallback = () => void | Promise<unknown>;

interface ConfirmModalOptions {
  /** 확인 버튼 클릭 시 실행할 콜백 */
  onOk?: OnOkCallback;
  /** 취소 버튼 클릭 시 실행할 콜백 */
  onCancel?: () => void;
  /** 추가 옵션 (antd ModalFuncProps) */
  options?: Partial<ModalFuncProps>;
}

/**
 * 삭제 확인 모달
 * @example
 * confirmModal.delete({
 *   onOk: () => deleteUser(userId),
 * });
 */
const deleteConfirm = ({ onOk, onCancel, options }: ConfirmModalOptions) => {
  return Modal.confirm({
    title: '삭제 확인',
    content: '삭제하시겠습니까?',
    okText: '삭제',
    okType: 'danger',
    cancelText: '취소',
    onOk,
    onCancel,
    centered: true,
    ...options,
  });
};

/**
 * 정보 모달 (단순 알림, 확인 버튼만)
 * @example
 * showModal.info('작업이 완료되었습니다.');
 */
const infoModal = (content: string, title = '알림') => {
  return Modal.info({
    title,
    content,
    okText: '확인',
    centered: true,
  });
};

// 확인 모달 (예/아니오 선택 필요)
export const confirmModal = {
  delete: deleteConfirm,
};

// 단순 알림 모달 (확인 버튼만)
export const showModal = {
  info: infoModal,
};
