/**
 * Watcher 환경파일 추가 Drawer (AS-IS IPR20S6042_Watcher.jsp)
 *
 * - 시스템당 1개만 등록 (목록에 있으면 추가 버튼 자체 비활성 — 호출 측 가드)
 * - 파일 선택 시 파일명을 Watcher명에 자동 세팅 (AS-IS setDefaultMentFile)
 * - EMS 경로 watcher/{nodeId}/{systemId}/, IR 경로 common/watcher/ (AS-IS 동등)
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Upload } from 'antd';
import { UploadCloud } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateWatcher } from '../hooks/useExtAdaptorQueries';

export interface WatcherDrawerRef {
  open: (systemId: number, systemName: string, nodeId: number) => void;
  close: () => void;
}

interface Props {
  onSuccess?: () => void;
}

const WatcherDrawer = forwardRef<WatcherDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [systemId, setSystemId] = useState<number | null>(null);
  const [systemName, setSystemName] = useState('');
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const createMutation = useCreateWatcher();

  useImperativeHandle(ref, () => ({
    open: (sysId, sysName, ndId) => {
      setSystemId(sysId);
      setSystemName(sysName);
      setNodeId(ndId);
      setFile(null);
      form.resetFields();
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values || systemId == null || nodeId == null) return;
    if (!file) {
      toast.warning('전송할 Watcher 파일을 선택하세요');
      return;
    }
    createMutation.mutate(
      {
        file,
        systemId,
        watcherName: values.watcherName,
        watcherDesc: values.watcherDesc,
        // systemId 10자리 zero-pad — 레거시 EMS 디렉터리 컨벤션(LPAD(SYSTEM_ID,10,'0')) 일치. DB/TCP 숫자는 그대로.
        emsFilePath: `watcher/${nodeId}/${String(systemId).padStart(10, '0')}/`,
        irFilePath: 'common/watcher/',
      },
      {
        onSuccess: () => {
          toast.success('Watcher 환경파일이 등록되었습니다');
          setOpen(false);
          onSuccess?.();
        },
      },
    );
  };

  const uploadProps = {
    maxCount: 1,
    beforeUpload: (f: File) => {
      setFile(f);
      form.setFieldsValue({ watcherName: f.name }); // 파일명 → Watcher명 자동
      return false as const;
    },
    onRemove: () => {
      setFile(null);
      form.setFieldsValue({ watcherName: '' });
    },
  };

  return (
    <Drawer
      title={`${systemName} — Watcher 추가`}
      open={open}
      onClose={() => setOpen(false)}
      width={480}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button type="primary" loading={createMutation.isPending} onClick={handleSave}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Watcher 파일" required tooltip="시스템당 1개만 등록 가능">
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon flex justify-center">
              <UploadCloud className="size-7 text-gray-400" />
            </p>
            <p className="ant-upload-text text-[13px]">Watcher 파일을 끌어다 놓거나 클릭</p>
          </Upload.Dragger>
        </Form.Item>
        <Form.Item label="Watcher 이름" name="watcherName" rules={[{ required: true, message: 'Watcher 이름은 필수입니다' }, { max: 100 }]}>
          <Input maxLength={100} placeholder="파일 선택 시 자동 입력" />
        </Form.Item>
        <Form.Item label="설명" name="watcherDesc" rules={[{ max: 500 }]}>
          <Input.TextArea rows={3} maxLength={500} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

WatcherDrawer.displayName = 'WatcherDrawer';
export default WatcherDrawer;
