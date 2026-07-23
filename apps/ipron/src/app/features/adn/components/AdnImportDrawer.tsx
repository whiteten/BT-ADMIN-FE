/**
 * ADN 엑셀 가져오기 Drawer (AS-IS IPR20S2023_Import).
 *
 * 양식 컬럼 (4개): ADN / 테넌트ID / 유형(=12) / 상담원기본상태(1/2/3)
 */
import { useState } from 'react';
import { Alert, Button, Drawer, Upload, type UploadFile } from 'antd';
import { Download, UploadCloud } from 'lucide-react';
import { toast } from '@/shared-util';
import { adnApi } from '../api/adnApi';
import { useImportAdnExcel } from '../hooks/useAdnQueries';

interface AdnImportDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function AdnImportDrawer({ open, onClose }: AdnImportDrawerProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const { mutate: importExcel, isPending } = useImportAdnExcel({
    mutationOptions: {
      onSuccess: (result) => {
        const failCnt = result.failures.length;
        if (failCnt === 0) {
          toast.success(`엑셀 가져오기 완료 — ${result.success}건 등록`);
        } else {
          toast.warning(`${result.success}건 등록 / ${failCnt}건 실패`);
        }
        setFileList([]);
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '엑셀 가져오기 실패';
        toast.error(msg);
      },
    },
  });

  const handleImport = () => {
    const f = fileList[0]?.originFileObj as File | undefined;
    if (!f) {
      toast.warning('파일을 선택하세요');
      return;
    }
    importExcel(f);
  };

  const handleTemplateDownload = async () => {
    try {
      const blob = await adnApi.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ADN_Import.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error('템플릿 다운로드 실패');
    }
  };

  return (
    <Drawer
      title="ADN 엑셀 가져오기"
      closable={{ placement: 'end' }}
      open={open}
      onClose={onClose}
      size={480}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isPending} onClick={handleImport} disabled={fileList.length === 0}>
            가져오기
          </Button>
        </div>
      }
    >
      <Alert type="info" showIcon message="ADN 양식 (4컬럼): ADN 번호 · 테넌트ID · 유형(12 고정) · 상담원기본상태(1/2/3)" className="!mb-4" />

      <div className="mb-4">
        <Button icon={<Download className="size-3.5" />} onClick={handleTemplateDownload}>
          양식 안내
        </Button>
      </div>

      <Upload.Dragger
        beforeUpload={(file) => {
          setFileList([{ uid: '-1', name: file.name, status: 'done', originFileObj: file as unknown as File } as unknown as UploadFile]);
          return false;
        }}
        onRemove={() => setFileList([])}
        fileList={fileList}
        maxCount={1}
        accept=".xlsx,.xls"
      >
        <p className="ant-upload-drag-icon flex justify-center">
          <UploadCloud className="size-8 text-gray-400" />
        </p>
        <p className="ant-upload-text">파일을 선택하거나 여기로 드래그하세요</p>
        <p className="ant-upload-hint">xlsx, xls 형식만 지원</p>
      </Upload.Dragger>
    </Drawer>
  );
}
