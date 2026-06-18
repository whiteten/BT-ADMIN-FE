import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Server } from 'lucide-react';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import A2ASkillsEditor from '../../features/a2a/components/A2ASkillsEditor';
import { a2aQueryKeys, useDeleteA2A, useGetA2A, useUpdateA2A } from '../../features/a2a/hooks/useA2aQueries';
import type { A2ASkill } from '../../features/a2a/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FormValues {
  agentName: string;
  agentDescription?: string;
}

export default function A2ADetail() {
  const { a2aId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [form] = Form.useForm<FormValues>();

  const { data: a2a, isLoading, isFetching } = useGetA2A({ params: { a2aId }, queryOptions: { enabled: !!a2aId } });
  const skills = a2a?.skills ?? [];

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: 'AOE 관리', path: '/aoe/agent-config' },
      { title: 'A2A', path: '/aoe/agent-config/a2a/list' },
      { title: ':agentName', path: `/aoe/agent-config/a2a/${a2aId}` },
    ];
    setBreadcrumb(breadcrumb, { agentName: a2a?.agentName ?? '-' });
    return () => clearBreadcrumb();
  }, [a2aId, a2a?.agentName, setBreadcrumb, clearBreadcrumb]);

  useEffect(() => {
    if (!a2a) return;
    form.setFieldsValue({
      agentName: a2a.agentName,
      agentDescription: a2a.agentDescription ?? undefined,
    });
  }, [a2a, form]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
    queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2A({ a2aId: a2aId ?? '' }).queryKey });
  };

  const { mutate: updateA2A, isPending: isUpdating } = useUpdateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        invalidate();
      },
      onError: (error) => Log.warn('updateA2A failed', error),
    },
  });

  const { mutate: deleteA2A, isPending: isDeleting } = useDeleteA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 삭제되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteA2A failed', error),
    },
  });

  const handleBasicInfoSubmit: FormProps<FormValues>['onFinish'] = (values) => {
    updateA2A({
      params: { a2aId: a2aId ?? '' },
      data: {
        a2aId: a2aId ?? '',
        agentName: values.agentName,
        agentDescription: values.agentDescription,
        skills,
      },
    });
  };

  // 수정 모드 — Skills 변경은 즉시 BE 저장.
  const handleSkillsChange = (next: A2ASkill[]) => {
    const formValues = form.getFieldsValue();
    updateA2A({
      params: { a2aId: a2aId ?? '' },
      data: {
        a2aId: a2aId ?? '',
        agentName: formValues.agentName ?? a2a?.agentName ?? '',
        agentDescription: formValues.agentDescription ?? a2a?.agentDescription,
        skills: next,
      },
    });
  };

  const handleDelete = () => {
    modal.confirm.delete({ onOk: () => deleteA2A({ a2aId: a2aId ?? '' }) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-4 w-full flex-1 min-h-0 bg-white bt-shadow p-5">
        <div className="flex flex-row gap-5 w-full flex-1 min-h-0">
          {/* 좌측 — 기본정보 폼 (사이드 패널) */}
          <div className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
            <header className="flex items-center gap-2.5 border-b border-[#F1F3F5] px-4 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bt-primary-soft)]">
                <Server className="size-[18px] text-[var(--color-bt-primary)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#495057]">기본 정보</h3>
                <p className="text-xs text-[#888B9A]">A2A 서버 기본 정보</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              <Form form={form} layout="vertical" onFinish={handleBasicInfoSubmit}>
                <Row gutter={20}>
                  <Col span={24}>
                    <Form.Item name="agentName" label="Agent 명" required rules={[{ required: true, message: 'Agent 명을 입력해 주세요.' }]}>
                      <Input placeholder="Agent 명을 입력하세요." />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="배포 Agent">
                      <Input value={a2a?.sourceAgentName ?? '-'} disabled />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="배포 포트">
                      <Input value={a2a?.deploymentId ?? '-'} disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={20}>
                  <Col span={24}>
                    <Form.Item name="agentDescription" label="설명">
                      <Input.TextArea placeholder="설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </div>
          </div>
          {/* 우측 — Skills 그리드 (변경 즉시 BE 저장, 카드) */}
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
            <A2ASkillsEditor skills={skills} onChange={handleSkillsChange} loading={isFetching} />
          </div>
        </div>
        {/* 카드 하단 — 기본정보 저장/삭제/취소 */}
        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
          <Button color="red" variant="solid" loading={isDeleting} onClick={handleDelete}>
            삭제
          </Button>
          <Button color="primary" variant="solid" loading={isUpdating} onClick={() => form.submit()}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
