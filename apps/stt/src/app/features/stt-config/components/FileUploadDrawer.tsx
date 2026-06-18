import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Upload } from 'antd';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { fileUploadQueryKeys, useUploadSttFile } from '../hooks/useFileUploadQueries';
import { useFtsSocket } from '../hooks/useFtsSocket';

export interface FileUploadDrawerRef {
  open: () => void;
  close: () => void;
}

interface FileUploadDrawerProps {
  menuId: string;
  onRequestSuccess?: () => void;
}

type FileStatus = 'uploading' | 'done' | 'fts-sending' | 'fts-done' | 'fts-error' | 'error';

interface UploadedFile {
  id: number;
  originalName: string;
  uploadedFilename?: string;
  uploadPath?: string;
  status: FileStatus;
}

let idCounter = 0;

const FileUploadDrawer = forwardRef<FileUploadDrawerRef, FileUploadDrawerProps>(({ menuId, onRequestSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [ftsProgress, setFtsProgress] = useState<{ completed: number; total: number } | null>(null);
  const pendingRef = useRef(0);
  const ftsSuccessRef = useRef(0);
  const ftsFailRef = useRef(0);
  const queryClient = useQueryClient();
  const { connect, send, disconnect } = useFtsSocket();

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const handleClose = () => {
    disconnect();
    setOpen(false);
    setUploadedFiles([]);
    setIsSending(false);
    setFtsProgress(null);
  };

  const { mutateAsync: uploadSttFile } = useUploadSttFile({ menuId });

  const handleAddFile = async (file: File) => {
    if (uploadedFiles.some((f) => f.originalName === file.name)) {
      toast.warning(`이미 추가된 파일입니다: ${file.name}`);
      return;
    }

    const id = ++idCounter;
    setUploadedFiles((prev) => [...prev, { id, originalName: file.name, status: 'uploading' }]);

    try {
      const { uploadedFilename, uploadPath } = await uploadSttFile(file);
      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, uploadedFilename, uploadPath, status: 'done' } : f)));
    } catch {
      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'error' } : f)));
      toast.error(`파일 업로드 실패: ${file.name}`);
    }
  };

  const handleRequest = async () => {
    if (uploadedFiles.some((f) => f.status === 'uploading')) {
      toast.warning('파일 업로드가 진행 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const readyFiles = uploadedFiles.filter(
      (f): f is UploadedFile & { uploadedFilename: string; uploadPath: string } => f.status === 'done' && !!f.uploadedFilename && !!f.uploadPath,
    );

    if (readyFiles.length === 0) {
      toast.warning('STT 요청할 파일이 없습니다.');
      return;
    }

    setIsSending(true);
    setFtsProgress({ completed: 0, total: readyFiles.length });
    pendingRef.current = readyFiles.length;
    ftsSuccessRef.current = 0;
    ftsFailRef.current = 0;
    setUploadedFiles((prev) => prev.map((f) => (f.status === 'done' ? { ...f, status: 'fts-sending' } : f)));

    try {
      await connect((ack) => {
        setUploadedFiles((prev) => prev.map((f) => (f.uploadedFilename === ack.fileName ? { ...f, status: ack.success ? 'fts-done' : 'fts-error' } : f)));

        if (ack.success) {
          ftsSuccessRef.current += 1;
        } else {
          ftsFailRef.current += 1;
        }

        pendingRef.current -= 1;
        setFtsProgress((prev) => (prev ? { ...prev, completed: prev.completed + 1 } : null));

        if (pendingRef.current === 0) {
          disconnect();
          setIsSending(false);
          setFtsProgress(null);
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: fileUploadQueryKeys.getFileUploadList._def });

          const { current: successCount } = ftsSuccessRef;
          const { current: failCount } = ftsFailRef;
          if (failCount === 0) {
            toast.success('STT 요청이 완료되었습니다.');
            onRequestSuccess?.();
          } else if (successCount === 0) {
            toast.error('STT 요청에 실패했습니다.');
          } else {
            toast.warning(`STT 요청 완료: 성공 ${successCount}건, 실패 ${failCount}건`);
            onRequestSuccess?.();
          }
        }
      });

      for (const f of readyFiles) {
        send({ fileName: f.uploadedFilename, filePath: f.uploadPath });
      }
    } catch {
      disconnect();
      setIsSending(false);
      setFtsProgress(null);
      setUploadedFiles((prev) => prev.map((f) => (f.status === 'fts-sending' ? { ...f, status: 'done' } : f)));
      toast.error('WebSocket 연결에 실패했습니다.');
    }
  };

  const handleRemoveFile = (id: number) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const footer = (
    <div className="flex items-center justify-between gap-4">
      {isSending && ftsProgress ? (
        <span className="flex items-center gap-2 text-sm font-medium text-amber-600">
          <Loader2 size={14} className="animate-spin shrink-0" />
          STT 요청중 {ftsProgress.completed}/{ftsProgress.total}
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="solid" onClick={handleClose} disabled={isSending}>
          취소
        </Button>
        <Button color="cyan" variant="solid" loading={isSending} onClick={handleRequest}>
          STT 요청
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="STT 파일업로드" closable={{ placement: 'end' }} styles={{ wrapper: { width: '600px' } }} footer={footer} destroyOnHidden>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-[#495057]">파일업로드</span>
          <Upload.Dragger
            multiple
            accept=".wav,.pcm,.mp3,.m4a"
            showUploadList={false}
            beforeUpload={(file) => {
              handleAddFile(file);
              return false;
            }}
          >
            <div className="py-14 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-[#495057]">파일을 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-xs text-[#adb5bd]">허용 가능한 확장자: .wav, .pcm, .mp3, .m4a</p>
            </div>
          </Upload.Dragger>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#495057]">STT 대상 파일 리스트</span>
          </div>
          <div className="border border-[#e9ebec] rounded overflow-hidden flex flex-col min-h-0 flex-1">
            <div className="bg-[#f8f9fa] px-4 py-2 text-sm font-medium text-[#495057] text-center border-b border-[#e9ebec] shrink-0">STT 대상 파일명</div>
            {uploadedFiles.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#adb5bd]">선택된 파일이 없습니다.</div>
            ) : (
              <ul className="overflow-y-auto flex-1">
                {uploadedFiles.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e9ebec] last:border-b-0 hover:bg-[#f8f9fa]">
                    <span className="text-sm text-[#6c757d] w-5 shrink-0 text-right">{index + 1}</span>
                    <span className={`flex-1 text-sm truncate ${item.status === 'error' || item.status === 'fts-error' ? 'text-red-400' : 'text-[#495057]'}`}>
                      {item.originalName}
                    </span>
                    {item.status === 'uploading' && <Loader2 size={15} className="shrink-0 animate-spin text-blue-400" />}
                    {item.status === 'fts-sending' && <Loader2 size={15} className="shrink-0 animate-spin text-amber-400" />}
                    {item.status === 'fts-done' && <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />}
                    {item.status === 'error' && <span className="text-xs text-red-400 shrink-0">업로드 오류</span>}
                    {item.status === 'fts-error' && <span className="text-xs text-red-400 shrink-0">FTS 오류</span>}
                    {item.status !== 'uploading' && item.status !== 'fts-sending' && (
                      <button onClick={() => handleRemoveFile(item.id)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
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
