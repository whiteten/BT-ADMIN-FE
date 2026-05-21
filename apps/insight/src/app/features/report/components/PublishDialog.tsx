import { useState } from 'react';
import { Form, type FormProps, Input } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/shared-util';
import { useReportEditorStore } from '../hooks/useReportEditorStore';
import { usePublishReport, useUnpublishReport } from '../hooks/useReportQueries';
import type { PublishDatas } from '../types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[14px]">메뉴 등록 해제</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-[12px]">이 보고서를 메뉴 트리에서 제거하시겠습니까?</p>
            <ul className="text-[11px] text-bt-fg-muted list-disc pl-4 space-y-1">
              <li>메뉴를 통해 진입한 사용자는 즉시 접근 불가</li>
              <li>본인의 개인 보고서로 회귀</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-[12px]" onClick={onClose}>
              취소
            </Button>
            <Button size="sm" variant="destructive" className="text-[12px]" onClick={() => unpublishReport(reportId)} disabled={unpublishing}>
              해제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px]">메뉴 등록</DialogTitle>
        </DialogHeader>

        <div className="text-[11px] text-bt-fg-muted mb-2">
          보고서: <span className="font-medium text-bt-fg">{report?.title}</span>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          initialValues={{ menuPath: '통계 > 교환기', menuName: report?.title ?? '' }}
        >
          <Form.Item name="menuPath" label={<span className="text-[12px]">메뉴 위치</span>} rules={[{ required: true, message: '메뉴 위치를 입력하세요.' }]}>
            <Input className="text-[12px]" placeholder="통계 > 교환기" />
          </Form.Item>

          <Form.Item name="menuName" label={<span className="text-[12px]">메뉴 이름</span>} rules={[{ required: true, message: '메뉴 이름을 입력하세요.' }]}>
            <Input className="text-[12px]" />
          </Form.Item>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[12px] font-medium">권한 그룹</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PERMISSION_GROUP_OPTIONS.map((group) => (
                <label key={group} className="flex items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={selectedGroups.includes(group)} onChange={() => toggleGroup(group)} className="rounded-sm accent-bt-primary" />
                  {group}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded border border-bt-warn bg-bt-warn-soft p-2.5 text-[10.5px] text-bt-warn mb-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            발행 시 boundary가 생성되며 일반 사용자에게 메뉴로 노출됩니다.
          </div>
        </Form>

        <DialogFooter>
          <Button variant="outline" size="sm" className="text-[12px]" onClick={onClose}>
            취소
          </Button>
          <Button size="sm" className="bg-bt-primary hover:bg-bt-primary-hover text-white text-[12px]" onClick={() => form.submit()} disabled={publishing}>
            발행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
