/**
 * Watcher 환경파일 추가/수정 Drawer (AS-IS IPR20S6042_Watcher.jsp)
 *
 * - 시스템당 1개만 등록 (목록에 있으면 추가 버튼 자체 비활성 — 호출 측 가드)
 * - 추가: 파일 필수. 파일 선택 시 파일명을 Watcher명에 자동 세팅 (AS-IS setDefaultMentFile)
 * - 수정: 파일 optional — 파일 없으면 이름/설명만 갱신(메타-only), 파일 교체 시 EMS 저장 → F222 → F221 후 갱신
 *   (AS-IS U_Watcher.do / I_Watcher.do update 분기 동등)
 * - EMS 경로 watcher/{nodeId}/{systemId}/, IR 경로 common/watcher/ (AS-IS 동등)
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Upload } from 'antd';
import { UploadCloud } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateWatcher, useUpdateWatcher } from '../hooks/useExtAdaptorQueries';
import type { Watcher } from '../types/extAdaptor';

export interface WatcherDrawerRef {
  /** watcher=null → 추가 / watcher=값 → 수정 */
  open: (watcher: Watcher | null, systemId: number, systemName: string, nodeId: number) => void;
  close: () => void;
}

interface Props {
  /** 성공 콜백. 신규 추가 시 생성된 Watcher를 전달(새 그리드 행 포커싱용), 수정 시 인자 없음. */
  onSuccess?: (created?: Watcher) => void;
}

const WatcherDrawer = forwardRef<WatcherDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [systemId, setSystemId] = useState<number | null>(null);
  const [systemName, setSystemName] = useState('');
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Watcher | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const createMutation = useCreateWatcher();
  const updateMutation = useUpdateWatcher();

  const isEdit = editing != null;

  useImperativeHandle(ref, () => ({
    open: (watcher, sysId, sysName, ndId) => {
      setSystemId(sysId);
      setSystemName(sysName);
      setNodeId(ndId);
      setEditing(watcher);
      setFile(null);
      form.resetFields();
      if (watcher) {
        form.setFieldsValue({ watcherName: watcher.watcherName ?? '', watcherDesc: watcher.watcherDesc ?? '' });
      }
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values || systemId == null || nodeId == null) return;

    // systemId 10자리 zero-pad — 레거시 EMS 디렉터리 컨벤션(LPAD(SYSTEM_ID,10,'0')) 일치. DB/TCP 숫자는 그대로.
    const emsFilePath = `watcher/${nodeId}/${String(systemId).padStart(10, '0')}/`;
    const irFilePath = 'common/watcher/';

    if (isEdit && editing) {
      // 수정 — 파일은 optional. 파일 교체 시에만 경로 전달.
      updateMutation.mutate(
        {
          watcherId: editing.watcherId,
          systemId,
          file: file ?? undefined,
          watcherName: values.watcherName,
          watcherDesc: values.watcherDesc,
          ...(file ? { emsFilePath, irFilePath } : {}),
        },
        {
          onSuccess: () => {
            toast.success(file ? 'Watcher 파일이 교체되었습니다' : 'Watcher 정보가 수정되었습니다');
            setOpen(false);
            onSuccess?.();
          },
          onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? 'Watcher 수정에 실패했습니다'),
        },
      );
      return;
    }

    // 추가 — 파일 필수
    if (!file) {
      toast.warning('전송할 Watcher 파일을 선택하세요');
      return;
    }
    createMutation.mutate(
      { file, systemId, watcherName: values.watcherName, watcherDesc: values.watcherDesc, emsFilePath, irFilePath },
      {
        onSuccess: (created) => {
          toast.success('Watcher 환경파일이 등록되었습니다');
          setOpen(false);
          onSuccess?.(created as Watcher | undefined);
        },
      },
    );
  };

  const uploadProps = {
    maxCount: 1,
    beforeUpload: (f: File) => {
      setFile(f);
      // 추가 시 파일명 → Watcher명 자동. 수정 시에는 사용자가 입력한 이름을 함부로 덮지 않음.
      if (!isEdit) form.setFieldsValue({ watcherName: f.name });
      return false as const;
    },
    onRemove: () => {
      setFile(null);
      if (!isEdit) form.setFieldsValue({ watcherName: '' });
    },
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Drawer
      title={`${systemName} — Watcher ${isEdit ? '수정' : '추가'}`}
      open={open}
      onClose={() => setOpen(false)}
      width={480}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Watcher 파일" required={!isEdit} tooltip={isEdit ? '파일 교체 시에만 선택 (미선택 시 이름/설명만 수정)' : '시스템당 1개만 등록 가능'}>
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon flex justify-center">
              <UploadCloud className="size-7 text-gray-400" />
            </p>
            <p className="ant-upload-text text-[13px]">{isEdit ? '파일 교체 시에만 끌어다 놓거나 클릭' : 'Watcher 파일을 끌어다 놓거나 클릭'}</p>
          </Upload.Dragger>
        </Form.Item>
        <Form.Item label="Watcher 이름" name="watcherName" rules={[{ required: true, message: 'Watcher 이름은 필수입니다' }, { max: 100 }]}>
          <Input maxLength={100} placeholder={isEdit ? undefined : '파일 선택 시 자동 입력'} />
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
