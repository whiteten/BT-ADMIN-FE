/**
 * 상담그룹 등록/수정 페이지 (목업 정합 — agent-master.html 의 "④ 상담그룹 추가/수정").
 *
 * 구조:
 *   Card (title=상담그룹 등록/수정)
 *   ├ Tab ① 기본정보
 *   │   ├ 소속 / 계층 (테넌트 / 상위그룹 / 계층경로 RO / 깊이 RO)
 *   │   └ 기본정보 (그룹명 / 활성화 / 아웃소싱 / 그룹발신 사용 / 그룹발신번호)
 *   ├ Tab ② 그룹 기본 미디어 옵션 (8 미디어 카드 — 상담사 USE_GRP_MDA_OPT=1 시 상속됨)
 *   └ 하단: 취소 / 삭제(edit) / 저장
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Spin, Tabs } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AgentMediaCards from '../../features/agent-master/components/AgentMediaCards';
import {
  useCreateAgentGroup,
  useDeleteAgentGroup,
  useGetAgentGroupDetail,
  useGetAgentGroupTree,
  useGetAgentTenants,
  useUpdateAgentGroup,
} from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentGroupCreateRequest, AgentGroupNode, AgentGroupUpdateRequest, AgentMediaMatrix as Matrix } from '../../features/agent-master/types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '상담사 관리', path: '/ipron/agent-master' }];

interface FormValues {
  tenantId?: number;
  priorGrpId?: number;
  groupName?: string;
  grpAniNo?: string;
  grpAniYn?: number;
  oscomId?: number;
  activateYn?: number;
}

function flattenGroups(tree: AgentGroupNode[], tenantId?: number, excludeId?: number): AgentGroupNode[] {
  const out: AgentGroupNode[] = [];
  const walk = (nodes: AgentGroupNode[]) => {
    for (const n of nodes) {
      if (n.groupId === excludeId) continue;
      if (tenantId == null || n.tenantId === tenantId) out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

const YESNO_OPTIONS = [
  { value: 1, label: '활성' },
  { value: 0, label: '비활성' },
];
const ON_OFF_OPTIONS = [
  { value: 0, label: '미사용' },
  { value: 1, label: '사용' },
];

export default function AgentGroupForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const modal = useModal();
  const isEdit = !!id;
  const groupId = id ? Number(id) : undefined;

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb([
      ...breadcrumb,
      {
        title: isEdit ? '상담그룹 수정' : '상담그룹 등록',
        path: isEdit && id ? `/ipron/agent-master/groups/${id}/edit` : '/ipron/agent-master/groups/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEdit, id, setBreadcrumb, clearBreadcrumb]);

  const [form] = Form.useForm<FormValues>();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();

  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({});
  const { data: detail, isLoading: detailLoading } = useGetAgentGroupDetail(groupId);

  const { mutate: createGroup, isPending: creating } = useCreateAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹이 등록되었습니다');
        navigate('/ipron/agent-master');
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });
  const { mutate: updateGroup, isPending: updating } = useUpdateAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹이 수정되었습니다');
        navigate('/ipron/agent-master');
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });
  const { mutate: deleteGroup, isPending: deleting } = useDeleteAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹이 삭제되었습니다');
        navigate('/ipron/agent-master');
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  useEffect(() => {
    if (isEdit && detail) {
      form.setFieldsValue({
        tenantId: detail.tenantId,
        priorGrpId: detail.priorGrpId ?? 0,
        groupName: detail.groupName,
        grpAniNo: detail.grpAniNo ?? undefined,
        grpAniYn: detail.grpAniYn ?? 0,
        oscomId: detail.oscomId ?? undefined,
        activateYn: detail.activateYn ?? 1,
      });
      setSelectedTenantId(detail.tenantId);
      setMatrix(detail.mediaMatrix);
    } else if (!isEdit) {
      const t = searchParams.get('tenantId');
      const p = searchParams.get('priorGrpId');
      const init: FormValues = { activateYn: 1, grpAniYn: 0 };
      if (t) {
        init.tenantId = Number(t);
        setSelectedTenantId(Number(t));
      }
      if (p) init.priorGrpId = Number(p);
      form.setFieldsValue(init);
    }
  }, [isEdit, detail, form, searchParams]);

  const tenantOptions = useMemo(() => tenantStats.map((t) => ({ value: t.tenantId, label: t.tenantName ?? `테넌트 ${t.tenantId}` })), [tenantStats]);

  const parentGroupOptions = useMemo(() => {
    const flat = flattenGroups(groupTree, selectedTenantId, groupId);
    return [
      { value: 0, label: '(최상위)' },
      ...flat.map((g) => ({
        value: g.groupId,
        label: `${'  '.repeat(Math.max(0, g.grpDepth - 1))}${g.groupName}`,
      })),
    ];
  }, [groupTree, selectedTenantId, groupId]);

  const watchedPriorGrpId = Form.useWatch('priorGrpId', form);
  const watchedGroupName = Form.useWatch('groupName', form);
  const watchedTenantId = Form.useWatch('tenantId', form);
  const watchedActivateYn = Form.useWatch('activateYn', form);
  const watchedGrpAniYn = Form.useWatch('grpAniYn', form);

  const hierarchyPreview = useMemo(() => {
    if (isEdit) return detail?.grpHierarchy ?? '-';
    if (!watchedPriorGrpId || watchedPriorGrpId === 0) return `/${watchedGroupName ?? '...'}/`;
    const parent = flattenGroups(groupTree).find((g) => g.groupId === watchedPriorGrpId);
    if (!parent) return '-';
    return `${parent.groupName ? '/' + parent.groupName + '/' : '/'}${watchedGroupName ?? '...'}/`;
  }, [isEdit, detail, watchedPriorGrpId, watchedGroupName, groupTree]);

  const depthPreview = useMemo(() => {
    if (isEdit) return detail?.grpDepth ?? '-';
    if (!watchedPriorGrpId || watchedPriorGrpId === 0) return 1;
    const parent = flattenGroups(groupTree).find((g) => g.groupId === watchedPriorGrpId);
    return parent ? (parent.grpDepth ?? 1) + 1 : 1;
  }, [isEdit, detail, watchedPriorGrpId, groupTree]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && groupId) {
        const body: AgentGroupUpdateRequest = {
          groupName: values.groupName!,
          grpAniNo: values.grpAniNo,
          grpAniYn: values.grpAniYn,
          oscomId: values.oscomId,
          activateYn: values.activateYn,
          mediaMatrix: matrix,
        };
        updateGroup({ id: groupId, body });
      } else {
        const body: AgentGroupCreateRequest = {
          tenantId: values.tenantId!,
          priorGrpId: values.priorGrpId && values.priorGrpId > 0 ? values.priorGrpId : null,
          groupName: values.groupName!,
          grpAniNo: values.grpAniNo,
          grpAniYn: values.grpAniYn,
          oscomId: values.oscomId,
          activateYn: values.activateYn,
          mediaMatrix: matrix,
        };
        createGroup(body);
      }
    } catch {
      /* antd 자동 표시 */
    }
  };

  const handleCancel = () => navigate('/ipron/agent-master');
  const handleDelete = () => {
    if (!isEdit || !groupId) return;
    modal.confirm.execute({
      onOk: () => deleteGroup(groupId),
      options: {
        title: '상담그룹 삭제',
        content: `"${detail?.groupName}" 그룹을 삭제하시겠습니까? 하위 그룹 / 소속 상담사 있으면 차단됩니다.`,
      },
    });
  };

  if (isEdit && detailLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin />
      </div>
    );
  }

  const submitting = creating || updating;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Row gutter={16} className="flex-1 min-h-0">
        <Col flex="auto" className="min-w-0">
          <Card title={isEdit ? `상담그룹 수정 — ${detail?.groupName ?? id}` : '상담그룹 등록'} className="!h-full" styles={{ body: { padding: 0 } }}>
            <Form form={form} layout="vertical" requiredMark>
              <Tabs
                defaultActiveKey="basic"
                className="px-6 pt-2"
                items={[
                  {
                    key: 'basic',
                    label: '① 기본정보',
                    children: (
                      <div className="px-6 pb-6">
                        <SectionTitle>소속 / 계층</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="테넌트" name="tenantId" rules={[{ required: true, message: '테넌트를 선택하세요' }]}>
                              <Select
                                options={tenantOptions}
                                disabled={isEdit}
                                placeholder="테넌트 선택"
                                onChange={(v) => {
                                  setSelectedTenantId(v);
                                  form.setFieldsValue({ priorGrpId: 0 });
                                }}
                                showSearch
                                optionFilterProp="label"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="상위 그룹" name="priorGrpId">
                              <Select
                                options={parentGroupOptions}
                                disabled={!selectedTenantId || isEdit}
                                placeholder={selectedTenantId ? '상위 그룹 선택 (최상위는 비워두기)' : '테넌트를 먼저 선택하세요'}
                                showSearch
                                optionFilterProp="label"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="계층 경로">
                              <ReadOnly text={hierarchyPreview} hint="상위 그룹에서 자동 산출" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="깊이">
                              <ReadOnly text={String(depthPreview)} hint="상위 그룹에서 자동 산출" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>기본정보</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="그룹명" name="groupName" rules={[{ required: true, message: '그룹명을 입력하세요' }, { max: 60 }]}>
                              <Input placeholder="예: 신규고객그룹" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="활성화" name="activateYn" rules={[{ required: true }]}>
                              <Select options={YESNO_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="아웃소싱업체" name="oscomId">
                              <InputNumber style={{ width: '100%' }} min={0} placeholder="0 = 없음" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="그룹 발신 사용" name="grpAniYn">
                              <Select options={ON_OFF_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col span={24}>
                            <Form.Item label="그룹 발신번호" name="grpAniNo">
                              <Input placeholder="예: 02-1234-5678" maxLength={32} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ),
                  },
                  {
                    key: 'media',
                    label: '② 그룹 기본 미디어 옵션',
                    children: (
                      <div className="px-6 pb-6">
                        <div className="text-[12px] text-gray-500 mb-3">상담사 등록 시 "그룹 미디어 옵션 사용" (USE_GRP_MDA_OPT=1) 선택 시 이 값이 상속됩니다.</div>
                        <AgentMediaCards value={matrix} onChange={setMatrix} />
                      </div>
                    ),
                  },
                ]}
              />
            </Form>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              {isEdit && (
                <Button danger loading={deleting} onClick={handleDelete} className="!mr-auto">
                  삭제
                </Button>
              )}
              <Button onClick={handleCancel}>취소</Button>
              <Button type="primary" loading={submitting} onClick={handleSubmit}>
                {isEdit ? '수정' : '등록'}
              </Button>
            </div>
          </Card>
        </Col>

        <Col flex="320px" className="hidden lg:block">
          <Card title="요약" className="!h-full" styles={{ body: { padding: 16 } }}>
            <dl className="text-sm space-y-2">
              <SummaryRow label="테넌트" value={tenantOptions.find((t) => t.value === watchedTenantId)?.label ?? '-'} />
              <SummaryRow label="상위 그룹" value={parentGroupOptions.find((p) => p.value === (watchedPriorGrpId ?? 0))?.label?.trim() ?? '-'} />
              <SummaryRow label="그룹명" value={watchedGroupName || '-'} />
              <SummaryRow label="깊이" value={String(depthPreview)} />
              <SummaryRow label="계층 경로" value={hierarchyPreview} mono />
              <SummaryRow
                label="활성"
                value={watchedActivateYn === 1 ? '활성' : watchedActivateYn === 0 ? '비활성' : '-'}
                accent={watchedActivateYn === 1 ? 'green' : watchedActivateYn === 0 ? 'gray' : undefined}
              />
              <SummaryRow label="그룹 발신" value={watchedGrpAniYn === 1 ? '사용' : '미사용'} accent={watchedGrpAniYn === 1 ? 'blue' : undefined} />
            </dl>
            <div className="mt-6 text-[12px] text-gray-400 leading-relaxed">상위 그룹과 그룹명이 결정되면 계층/깊이는 자동 산출됩니다.</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function SummaryRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: 'green' | 'red' | 'blue' | 'gray' }) {
  const accentClass =
    accent === 'green'
      ? 'text-green-600 font-semibold'
      : accent === 'red'
        ? 'text-red-500 font-semibold'
        : accent === 'blue'
          ? 'text-[#405189] font-semibold'
          : accent === 'gray'
            ? 'text-gray-500'
            : 'font-medium';
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`text-right truncate ${mono ? 'font-mono ' : ''}${accentClass}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function SectionTitle({ children, marginTop = 16 }: { children: React.ReactNode; marginTop?: number }) {
  return (
    <h3 className="text-[13px] font-semibold text-gray-700 mb-3" style={{ marginTop }}>
      {children}
    </h3>
  );
}

function ReadOnly({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="h-8 px-3 inline-flex items-center bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 w-full">
      {text}
      {hint && <span className="ml-2 text-[11px] text-gray-400">{hint}</span>}
    </div>
  );
}
