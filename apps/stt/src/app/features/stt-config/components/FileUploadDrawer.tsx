import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Upload } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { fileUploadQueryKeys, useRequestStt } from '../hooks/useFileUploadQueries';

export interface FileUploadDrawerRef {
  open: () => void;
  close: () => void;
}

const FileUploadDrawer = forwardRef<FileUploadDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const handleClose = () => {
    setOpen(false);
    setFiles([]);
  };

  const { mutate: requestStt, isPending } = useRequestStt({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT 요청이 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: fileUploadQueryKeys.getFileUploadList._def });
        handleClose();
      },
      onError: () => {
        toast.error('STT 요청에 실패했습니다.');
      },
    },
  });

  const handleRequest = () => {
    if (files.length === 0) {
      toast.warning('STT 요청할 파일을 선택해주세요.');
      return;
    }
    requestStt(files);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button color="cyan" variant="solid" loading={isPending} onClick={handleRequest}>
        STT 요청
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="STT 파일업로드" closable={{ placement: 'end' }} width={600} footer={footer} destroyOnHidden>
      <div className="flex flex-col gap-6 h-full">
        {/* 파일 업로드 영역 */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-[#495057]">파일업로드</span>
          <Upload.Dragger
            multiple
            accept=".wav,.pcm,.mp3,.m4a"
            showUploadList={false}
            beforeUpload={(file) => {
              setFiles((prev) => {
                if (prev.some((f) => f.name === file.name)) {
                  toast.warning(`이미 추가된 파일입니다: ${file.name}`);
                  return prev;
                }
                return [...prev, file];
              });
              return false;
            }}
          >
            <div className="py-14 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-[#495057]">파일을 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-xs text-[#adb5bd]">허용 가능한 확장자: .wav, .pcm, .mp3, .m4a</p>
            </div>
          </Upload.Dragger>
        </div>

        {/* STT 대상 파일 리스트 */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <span className="text-sm font-semibold text-[#495057]">STT 대상 파일 리스트</span>
          <div className="border border-[#e9ebec] rounded overflow-hidden flex flex-col min-h-0 flex-1">
            <div className="bg-[#f8f9fa] px-4 py-2 text-sm font-medium text-[#495057] text-center border-b border-[#e9ebec] shrink-0">STT 대상 파일명</div>
            {files.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#adb5bd]">선택된 파일이 없습니다.</div>
            ) : (
              <ul className="overflow-y-auto flex-1">
                {files.map((file, index) => (
                  <li key={file.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e9ebec] last:border-b-0 hover:bg-[#f8f9fa]">
                    <span className="text-sm text-[#6c757d] w-5 shrink-0 text-right">{index + 1}</span>
                    <span className="flex-1 text-sm text-[#495057] truncate">{file.name}</span>
                    <button onClick={() => handleRemoveFile(index)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
});

FileUploadDrawer.displayName = 'FileUploadDrawer';
export default FileUploadDrawer;
