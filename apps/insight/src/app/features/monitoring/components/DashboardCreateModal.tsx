import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Modal } from 'antd';
import { toast } from '@/shared-util';
import { DOMAIN_LABELS } from '../constants/monitoringConstants';
import { useCreateDashboard } from '../hooks/useDashboardQueries';
import type { DomainCode } from '../types';

interface DashboardCreateModalProps {
  open: boolean;
  onClose: () => void;
}

const DOMAIN_CHOICES: Array<{ value: DomainCode; label: string }> = [
  { value: 'IE', label: '교환기' },
  { value: 'IC', label: 'CTI' },
  { value: 'IR', label: 'IVR' },
];

export default function DashboardCreateModal({ open, onClose }: DashboardCreateModalProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<{ dashboardName: string; domainCode: DomainCode }>();
  const [selectedDomain, setSelectedDomain] = useState<DomainCode>('IE');

  const { mutate: createDashboard, isPending } = useCreateDashboard({
    mutationOptions: {
      onSuccess: (dashboard) => {
        toast.success('새 대시보드가 생성되었습니다.');
        onClose();
        navigate(`/insight/monitoring/dashboards/${dashboard.dashboardId}/edit`);
      },
      onError: () => toast.error('생성 중 오류가 발생했습니다.'),
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      createDashboard({
        dashboardName: values.dashboardName.trim(),
        domainCode: selectedDomain,
      });
    } catch {
      // form validation 실패 — antd가 표시
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedDomain('IE');
    onClose();
  };

  return (
    <Modal
      title="새 모니터링 대시보드"
      open={open}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="생성 후 캔버스 열기"
      cancelText="취소"
      confirmLoading={isPending}
      width={520}
      destroyOnClose
    >
      <div className="space-y-5 py-2">
        {/* 도메인 선택 */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
            도메인 <span className="text-[var(--color-bt-danger)]">*</span>
            <span className="ml-1 normal-case tracking-normal text-[10px] text-[var(--color-bt-fg-muted)]">(생성 후 고정)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DOMAIN_CHOICES.map((d) => {
              const active = selectedDomain === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDomain(d.value)}
                  className={`flex flex-col items-center gap-1 rounded border-2 p-3 transition-colors ${
                    active
                      ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]'
                      : 'border-[var(--color-bt-border)] bg-white hover:border-[var(--color-bt-primary)]'
                  }`}
                >
                  <span className="rounded bg-[var(--color-bt-primary)] px-2 py-0.5 mono text-[11px] font-bold text-white">{d.value}</span>
                  <span className={`text-[12.5px] font-semibold ${active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg)]'}`}>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 이름 */}
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ dashboardName: '' }}>
          <Form.Item
            label={<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">이름 *</span>}
            name="dashboardName"
            rules={[
              { required: true, message: '대시보드 이름을 입력하세요.' },
              { max: 120, message: '120자 이내로 입력하세요.' },
            ]}
          >
            <Input placeholder="예: 교환기 운영 관제" onPressEnter={handleSubmit} />
          </Form.Item>
        </Form>

        <p className="text-[11px] text-[var(--color-bt-fg-muted)] leading-relaxed">생성 후 빈 캔버스로 진입합니다. 도메인은 변경할 수 없으니 신중히 선택하세요.</p>
      </div>
    </Modal>
  );
}
