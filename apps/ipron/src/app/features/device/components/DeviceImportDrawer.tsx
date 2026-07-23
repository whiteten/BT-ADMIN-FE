/**
 * 단말기 엑셀 가져오기 Drawer (AdnImportDrawer 패턴 — NUM-004 대응)
 *
 * AdnImportDrawer 와 동일 패턴. 노드 선택 후 파일 첨부 → 가져오기.
 */
import { useState } from 'react';
import { Alert, Button, Drawer, Upload, type UploadFile } from 'antd';
import { UploadCloud } from 'lucide-react';
import { toast } from '@/shared-util';
import { deviceApi } from '../api/deviceApi';

interface DeviceImportDrawerProps {
  open: boolean;
  nodeId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeviceImportDrawer({ open, nodeId, onClose, onSuccess }: DeviceImportDrawerProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isPending, setIsPending] = useState(false);

  const handleImport = async () => {
    if (!nodeId) {
      toast.warning('노드를 선택한 후 가져오기를 실행하세요');
      return;
    }
    const f = fileList[0]?.originFileObj as File | undefined;
    if (!f) {
      toast.warning('파일을 선택하세요');
      return;
    }
    setIsPending(true);
    try {
      const cnt = await deviceApi.importDevices(nodeId, f);
      toast.success(`${cnt}건 단말기를 가져왔습니다.`);
      setFileList([]);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '단말기 가져오기에 실패했습니다.';
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Drawer
      title="단말기 엑셀 가져오기"
      closable={{ placement: 'end' }}
      open={open}
      onClose={onClose}
      size={480}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isPending} onClick={handleImport} disabled={fileList.length === 0 || !nodeId}>
            가져오기
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {!nodeId && <Alert type="warning" showIcon message="노드를 먼저 선택한 후 가져오기를 실행하세요." />}
        <Alert
          type="info"
          showIcon
          message="엑셀 파일(.xlsx, .xls)을 첨부하여 단말기를 일괄 등록합니다."
          description="양식에 맞지 않는 행은 건너뜁니다. 결과 건수가 완료 후 표시됩니다."
        />
        <Upload.Dragger
          accept=".xlsx,.xls"
          maxCount={1}
          fileList={fileList}
          beforeUpload={() => false}
          onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
          onRemove={() => setFileList([])}
        >
          <p className="ant-upload-drag-icon">
            <UploadCloud className="size-8 mx-auto text-gray-400" />
          </p>
          <p className="ant-upload-text">클릭하거나 파일을 여기로 드래그하세요</p>
          <p className="ant-upload-hint">.xlsx / .xls 파일만 지원합니다</p>
        </Upload.Dragger>
      </div>
    </Drawer>
  );
}
