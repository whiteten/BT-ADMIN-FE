import { App, type ModalFuncProps } from 'antd';

type OnOkCallback = () => void | Promise<unknown>;

interface ConfirmModalOptions {
  /** 확인 버튼 클릭 시 실행할 콜백 */
  onOk?: OnOkCallback;
  /** 취소 버튼 클릭 시 실행할 콜백 */
  onCancel?: () => void;
  /** 추가 옵션 (antd ModalFuncProps) */
  options?: Partial<ModalFuncProps>;
}

export const useModal = () => {
  const { modal } = App.useApp();

  return {
    confirm: {
      execute: ({ onOk, onCancel, options }: ConfirmModalOptions) => {
        modal.confirm({
          title: '진행 확인',
          content: '진행하시겠습니까?',
          okText: '확인',
          okType: 'primary',
          cancelText: '취소',
          centered: true,
          onOk,
          onCancel,
          ...options,
        });
      },
      delete: ({ onOk, onCancel, options }: ConfirmModalOptions) => {
        modal.confirm({
          title: '삭제 확인',
          content: '삭제하시겠습니까?',
          okText: '삭제',
          okType: 'danger',
          cancelText: '취소',
          centered: true,
          onOk,
          onCancel,
          ...options,
        });
      },
    },
    show: {
      info: (content: string, title = '알림') => {
        modal.info({
          title,
          content,
          okText: '확인',
          centered: true,
        });
      },
    },
  };
};
