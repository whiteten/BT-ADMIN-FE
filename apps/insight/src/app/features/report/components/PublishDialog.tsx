import { useState } from 'react';
import { Button, Form, type FormProps, Input, Modal } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useReportEditorStore } from '../hooks/useReportEditorStore';
import { usePublishReport, useUnpublishReport } from '../hooks/useReportQueries';
import type { PublishDatas } from '../types';

interface PublishDialogProps {
  reportId: number;
  onClose(): void;
}

const PERMISSION_GROUP_OPTIONS = ['ADMIN', 'EXCHANGE_MANAGER', 'AGENT', 'VIEWER'];

export default function PublishDialog({ reportId, onClose }: PublishDialogProps) {
  const { report, setReport } = useReportEditorStore();
  const isPublished = report?.isPublished ?? false;
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['ADMIN']);
  const [form] = Form.useForm<Omit<PublishDatas, 'permissionGroups'>>();

  const { mutate: publishReport, isPending: publishing } = usePublishReport({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메뉴 등록이 완료되었습니다.');
        if (report) setReport({ ...report, isPublished: true });
        onClose();
      },
      onError: () => toast.error('메뉴 등록 중 오류가 발생했습니다.'),
    },
  });

  const { mutate: unpublishReport, isPending: unpublishing } = useUnpublishReport({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메뉴 등록이 해제되었습니다.');
        if (report) setReport({ ...report, isPublished: false });
        onClose();
      },
      onError: () => toast.error('해제 중 오류가 발생했습니다.'),
    },
  });

  const handleFinish: FormProps<Omit<PublishDatas, 'permissionGroups'>>['onFinish'] = (values) => {
    publishReport({ reportId, data: { ...values, permissionGroups: selectedGroups } });
  };

  const handleFinishFailed: FormProps<Omit<PublishDatas, 'permissionGroups'>>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  };

  if (isPublished) {
    return (
      <Modal
        open
        title="메뉴 등록 해제"
        onCancel={onClose}
        footer={[
          <Button key="cancel" onClick={onClose}>
            취소
          </Button>,
          <Button key="confirm" danger onClick={() => unpublishReport(reportId)} loading={unpublishing}>
            해제
          </Button>,
        ]}
      >
        <p className="text-sm">이 보고서를 메뉴 트리에서 제거하시겠습니까?</p>
        <ul className="mt-2 text-xs text-bt-fg-muted list-disc pl-4 space-y-1">
          <li>메뉴를 통해 진입한 사용자는 즉시 접근 불가</li>
          <li>본인의 개인 보고서로 회귀</li>
        </ul>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="메뉴 등록"
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          취소
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()} loading={publishing}>
          발행
        </Button>,
      ]}
    >
      <div className="text-xs text-bt-fg-muted mb-4">
        보고서: <span className="font-medium text-bt-fg">{report?.title}</span>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish} onFinishFailed={handleFinishFailed} initialValues={{ menuPath: '통계 > 교환기', menuName: report?.title ?? '' }}>
        <Form.Item name="menuPath" label="메뉴 위치" rules={[{ required: true, message: '메뉴 위치를 입력하세요.' }]}>
          <Input placeholder="통계 > 교환기" />
        </Form.Item>

        <Form.Item name="menuName" label="메뉴 이름" rules={[{ required: true, message: '메뉴 이름을 입력하세요.' }]}>
          <Input />
        </Form.Item>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-sm font-medium">권한 그룹</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PERMISSION_GROUP_OPTIONS.map((group) => (
              <label key={group} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={selectedGroups.includes(group)} onChange={() => toggleGroup(group)} className="rounded-sm accent-bt-primary" />
                {group}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded border border-bt-warn bg-bt-warn-soft p-2.5 text-xs text-bt-warn">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          발행 시 boundary가 생성되며 일반 사용자에게 메뉴로 노출됩니다.
        </div>
      </Form>
    </Modal>
  );
}
