import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Modal, Upload, type UploadFile, type UploadProps } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { toast } from '@/shared-util';

const { Dragger } = Upload;

export interface FileImportModalRef {
  open: () => void;
  close: () => void;
}

export interface FileImportModalProps {
  /** 모달 제목 (기본값: 'Import') */
  title?: string;
  /** 허용할 파일 확장자 (예: '.xlsx,.csv' 또는 '.json') */
  accept?: string;
  /** 다중 파일 허용 여부 */
  multiple?: boolean;
  /** 최대 파일 개수 (multiple이 true일 때만 적용) */
  maxCount?: number;
  /** 최대 파일 크기 (MB 단위, 기본값: 10) */
  maxSizeMB?: number;
  /** 확인 버튼 텍스트 */
  okText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 확인 버튼 클릭 시 실행할 콜백 (파일 목록 전달) */
  onConfirm: (files: File[]) => void | Promise<void>;
  /** 모달 닫힐 때 실행할 콜백 (선택사항) */
  onCancel?: () => void;
  /** 확인 버튼 로딩 상태 제어 */
  confirmLoading?: boolean;
}

interface ModalState {
  open: boolean;
}

const FileImportModal = forwardRef<FileImportModalRef, FileImportModalProps>(
  ({ title = 'Import', accept, multiple = false, maxCount = 1, maxSizeMB = 10, okText = '가져오기', cancelText = '취소', onConfirm, onCancel, confirmLoading = false }, ref) => {
    const [modalState, setModalState] = useState<ModalState>({ open: false });
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const { open } = modalState;

    useImperativeHandle(ref, () => ({
      open: () => {
        setFileList([]);
        setModalState({ open: true });
      },
      close: () => {
        setModalState({ open: false });
      },
    }));

    const handleClose = () => {
      setModalState({ open: false });
      onCancel?.();
    };

    const handleConfirm = async () => {
      if (fileList.length === 0) {
        toast.warning('파일을 선택해주세요.');
        return;
      }

      const files = fileList.map((item) => item.originFileObj).filter((file): file is RcFile => file !== undefined) as File[];

      await onConfirm(files);
    };

    const uploadProps: UploadProps = {
      name: 'file',
      multiple,
      maxCount: multiple ? maxCount : 1,
      accept,
      fileList,
      beforeUpload: (file) => {
        if (accept) {
          const extensions = accept
            .split(',')
            .map((ext) => ext.trim().replace('.', ''))
            .join('|');
          const pattern = new RegExp(`\\.(${extensions})$`, 'i');
          if (!pattern.test(file.name)) {
            toast.warning(`지정된 확장자의 파일만 업로드할 수 있습니다.(${accept})`);
            return Upload.LIST_IGNORE;
          }
        }
        const isWithinLimit = file.size / 1024 / 1024 < maxSizeMB;
        if (!isWithinLimit) {
          toast.warning(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
          return Upload.LIST_IGNORE;
        }
        return false;
      },
      onChange: (info) => {
        setFileList(info.fileList);
      },
      onRemove: (file) => {
        setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
      },
    };

    const footer = (
      <div className="flex items-center justify-end gap-2">
        <Button variant="solid" onClick={handleClose}>
          {cancelText}
        </Button>
        <Button variant="solid" color="primary" onClick={handleConfirm} loading={confirmLoading} disabled={fileList.length === 0}>
          {okText}
        </Button>
      </div>
    );

    return (
      <Modal open={open} onCancel={handleClose} title={title} footer={footer} destroyOnHidden centered>
        <div className="py-4">
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon"></p>
            <p className="ant-upload-text">파일을 드래그하거나 클릭하여 선택하세요</p>
            {accept && <p className="ant-upload-hint text-gray-500">허용 가능한 확장자: {accept}</p>}
          </Dragger>
        </div>
      </Modal>
    );
  },
);

FileImportModal.displayName = 'FileImportModal';

export default FileImportModal;
