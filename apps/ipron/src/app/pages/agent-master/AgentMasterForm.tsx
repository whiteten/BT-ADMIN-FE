/**
 * 상담사 등록/수정 페이지 (목업 정합 — agent-master.html 의 "③ 등록 페이지").
 *
 * 구조:
 *   Card (title=상담사 등록/수정)
 *   ├ Tab ① 기본정보
 *   │   ├ 소속 (테넌트 / 상담그룹 / 아웃소싱업체)
 *   │   ├ 기본정보 (로그인ID / 상담사명 / 별명 / 상담등급 / 직급)
 *   │   ├ 상태 (활성화 Select / 퇴사 Select)
 *   │   └ 인증 (비밀번호 / 암호화방식 SHA-512 RO / 최종변경 RO)
 *   ├ Tab ② CTI 옵션
 *   │   ├ 노드 (NODE_ID RO / BACK_UP_NODE_ID RO) — 자동 배정
 *   │   ├ PBX 로그인 ID (ADN) RO
 *   │   ├ 미디어 옵션 사용 방식 (USE_GRP_MDA_OPT Select)
 *   │   ├ 미디어 옵션 카드 (8 미디어 × 7 속성, expandable)
 *   │   ├ 주 업무 스킬 (MASTER_CTIQ_ID)
 *   │   └ 운영 (감청 Select / 코칭 Select)
 *   └ 하단: 취소 / 저장
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Spin, Tabs } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AgentMediaCards from '../../features/agent-master/components/AgentMediaCards';
import { useCreateAgent, useGetAgentDetail, useGetAgentGroupTree, useGetAgentTenants, useUpdateAgent } from '../../features/agent-master/hooks/useAgentMasterQueries';
import type { AgentCreateRequest, AgentGroupNode, AgentUpdateRequest, AgentMediaMatrix as Matrix } from '../../features/agent-master/types';

const breadcrumb = [
  { title: '상담사 관리', path: '/ipron/agent-master' },
  { title: '상담사 관리', path: '/ipron/agent-master' },
];

interface FormValues {
  tenantId?: number;
  groupId?: number;
  agentLoginId?: string;
  agentName?: string;
  agentAlias?: string;
  password?: string;
  agentGrade?: string;
  jikgup?: string;
  oscomId?: number;
  activateYn?: number;
  retireYn?: number;
  useGrpMdaOpt?: number;
  masterCtiqId?: number;
  monitorSvc?: number;
  coachingSvc?: number;
}

function flattenGroups(tree: AgentGroupNode[], tenantId?: number): AgentGroupNode[] {
  const out: AgentGroupNode[] = [];
  const walk = (nodes: AgentGroupNode[]) => {
    for (const n of nodes) {
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
const RETIRE_OPTIONS = [
  { value: 0, label: '재직' },
  { value: 1, label: '퇴사' },
];
const ONOFF_OPTIONS = [
  { value: 1, label: '사용' },
  { value: 0, label: '미사용' },
];
const USE_GRP_MDA_OPT_OPTIONS = [
  { value: 0, label: '개별 미디어 옵션 사용 (아래 매트릭스 활성)' },
  { value: 1, label: '그룹 미디어 옵션 사용 (아래 매트릭스 비활성 — 그룹 기본값 상속)' },
];

export default function AgentMasterForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const agentId = id ? Number(id) : undefined;

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb([
      ...breadcrumb,
      {
        title: isEdit ? '수정' : '등록',
        path: isEdit && id ? `/ipron/agent-master/${id}/edit` : '/ipron/agent-master/create',
      },
    ]);
    return () => clearBreadcrumb();
  }, [isEdit, id, setBreadcrumb, clearBreadcrumb]);

  const [form] = Form.useForm<FormValues>();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();

  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({});
  const { data: detail, isLoading: detailLoading } = useGetAgentDetail(agentId);

  const { mutate: createAgent, isPending: creating } = useCreateAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담사가 등록되었습니다');
        navigate('/ipron/agent-master');
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateAgent, isPending: updating } = useUpdateAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담사가 수정되었습니다');
        navigate('/ipron/agent-master');
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  useEffect(() => {
    if (isEdit && detail) {
      form.setFieldsValue({
        tenantId: detail.tenantId,
        groupId: detail.groupId,
        agentLoginId: detail.agentLoginId,
        agentName: detail.agentName,
        agentAlias: detail.agentAlias,
        agentGrade: detail.agentGrade ?? undefined,
        jikgup: detail.jikgup ?? undefined,
        oscomId: detail.oscomId ?? undefined,
        activateYn: detail.activateYn ?? 1,
        retireYn: detail.retireYn ?? 0,
        useGrpMdaOpt: detail.useGrpMdaOpt ?? 0,
        masterCtiqId: detail.masterCtiqId ?? undefined,
        monitorSvc: detail.monitorSvc ?? 0,
        coachingSvc: detail.coachingSvc ?? 0,
      });
      setSelectedTenantId(detail.tenantId);
      setMatrix(detail.mediaMatrix);
    } else if (!isEdit) {
      const t = searchParams.get('tenantId');
      const g = searchParams.get('groupId');
      const init: FormValues = {
        activateYn: 1,
        retireYn: 0,
        useGrpMdaOpt: 0,
        monitorSvc: 0,
        coachingSvc: 0,
      };
      if (t) {
        init.tenantId = Number(t);
        setSelectedTenantId(Number(t));
      }
      if (g) init.groupId = Number(g);
      form.setFieldsValue(init);
    }
  }, [isEdit, detail, form, searchParams]);

  const useGrpMdaOpt = Form.useWatch('useGrpMdaOpt', form) ?? 0;
  const watchedTenantId = Form.useWatch('tenantId', form);
  const watchedGroupId = Form.useWatch('groupId', form);
  const watchedLoginId = Form.useWatch('agentLoginId', form);
  const watchedAgentName = Form.useWatch('agentName', form);
  const watchedActivateYn = Form.useWatch('activateYn', form);
  const watchedRetireYn = Form.useWatch('retireYn', form);

  const tenantOptions = useMemo(() => tenantStats.map((t) => ({ value: t.tenantId, label: t.tenantName ?? `테넌트 ${t.tenantId}` })), [tenantStats]);

  const groupOptions = useMemo(() => {
    const flat = flattenGroups(groupTree, selectedTenantId);
    return flat.map((g) => ({
      value: g.groupId,
      label: `${'  '.repeat(Math.max(0, g.grpDepth - 1))}${g.groupName}`,
    }));
  }, [groupTree, selectedTenantId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && agentId) {
        const body: AgentUpdateRequest = {
          groupId: values.groupId!,
          agentName: values.agentName!,
          agentAlias: values.agentAlias!,
          password: values.password?.trim() || undefined,
          agentGrade: values.agentGrade,
          jikgup: values.jikgup,
          oscomId: values.oscomId,
          activateYn: values.activateYn,
          retireYn: values.retireYn,
          useGrpMdaOpt: values.useGrpMdaOpt,
          masterCtiqId: values.masterCtiqId,
          monitorSvc: values.monitorSvc,
          coachingSvc: values.coachingSvc,
          mediaMatrix: values.useGrpMdaOpt === 1 ? null : matrix,
        };
        updateAgent({ id: agentId, body });
      } else {
        const body: AgentCreateRequest = {
          tenantId: values.tenantId!,
          groupId: values.groupId!,
          agentLoginId: values.agentLoginId!,
          agentName: values.agentName!,
          agentAlias: values.agentAlias!,
          password: values.password!,
          agentGrade: values.agentGrade,
          jikgup: values.jikgup,
          oscomId: values.oscomId,
          activateYn: values.activateYn,
          retireYn: values.retireYn,
          useGrpMdaOpt: values.useGrpMdaOpt,
          masterCtiqId: values.masterCtiqId,
          monitorSvc: values.monitorSvc,
          coachingSvc: values.coachingSvc,
          mediaMatrix: values.useGrpMdaOpt === 1 ? null : matrix,
        };
        createAgent(body);
      }
    } catch {
      /* antd 자동 표시 */
    }
  };

  const handleCancel = () => navigate('/ipron/agent-master');

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
          <Card title={isEdit ? `상담사 수정 — ${detail?.agentName ?? id}` : '상담사 등록'} className="!h-full" styles={{ body: { padding: 0 } }}>
            <Form form={form} layout="vertical" requiredMark>
              <Tabs
                defaultActiveKey="basic"
                className="px-6 pt-2"
                items={[
                  {
                    key: 'basic',
                    label: '① 기본정보',
                    children: (
                      <div className="px-4 pb-4">
                        <SectionTitle>소속</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="테넌트" name="tenantId" rules={[{ required: true, message: '테넌트를 선택하세요' }]}>
                              <Select
                                options={tenantOptions}
                                disabled={isEdit}
                                placeholder="테넌트 선택"
                                onChange={(v) => {
                                  setSelectedTenantId(v);
                                  form.setFieldsValue({ groupId: undefined });
                                }}
                                showSearch
                                optionFilterProp="label"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="상담그룹" name="groupId" rules={[{ required: true, message: '상담그룹을 선택하세요' }]}>
                              <Select
                                options={groupOptions}
                                placeholder={selectedTenantId ? '상담그룹 선택' : '테넌트를 먼저 선택하세요'}
                                disabled={!selectedTenantId}
                                showSearch
                                optionFilterProp="label"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="아웃소싱업체" name="oscomId">
                              <InputNumber style={{ width: '100%' }} min={0} placeholder="0 = 없음" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>기본정보</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="로그인 ID" name="agentLoginId" rules={[{ required: true, message: '로그인 ID를 입력하세요' }, { max: 64 }]}>
                              <Input disabled={isEdit} placeholder="예: agent004" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="상담사명" name="agentName" rules={[{ required: true, message: '상담사명을 입력하세요' }, { max: 30 }]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="별명" name="agentAlias" rules={[{ required: true, message: '별명을 입력하세요' }, { max: 20 }]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="상담등급" name="agentGrade">
                              <Input maxLength={4} placeholder="예: 30" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="직급" name="jikgup">
                              <Input maxLength={4} placeholder="예: 60" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>상태</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="활성화" name="activateYn" rules={[{ required: true }]}>
                              <Select options={YESNO_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="퇴사 여부" name="retireYn">
                              <Select options={RETIRE_OPTIONS} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>인증</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              label={isEdit ? '비밀번호 (변경 시 입력)' : '비밀번호'}
                              name="password"
                              rules={isEdit ? [] : [{ required: true, message: '비밀번호를 입력하세요' }]}
                            >
                              <Input.Password autoComplete="new-password" placeholder={isEdit ? '미입력 시 유지' : ''} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="암호화 방식">
                              <ReadOnly text="SHA-512" hint="(시스템 고정)" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="최종 변경">
                              <ReadOnly text={formatPwdChgDate(detail?.workTime ?? null)} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ),
                  },
                  {
                    key: 'cti',
                    label: '② CTI 옵션',
                    children: (
                      <div className="px-4 pb-4">
                        <SectionTitle>노드</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="노드">
                              <ReadOnly text={detail?.nodeName ?? '(자동 배정)'} hint="NODE_ID — 테넌트 소속 노드 자동" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="DR 노드">
                              <ReadOnly text={detail?.backUpNodeName ?? '(미사용)'} hint="BACK_UP_NODE_ID — 자동 배정" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>PBX 로그인 ID (ADN)</SectionTitle>
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item label="PBX 로그인 ID">
                              <ReadOnly text={detail?.pbxLoginId ?? '— 미할당'} hint='자동 채번은 "상담사 ADN 설정" 화면에서 진행 (후속 PR)' />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>미디어 옵션 사용 방식</SectionTitle>
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item label="옵션 사용" name="useGrpMdaOpt">
                              <Select options={USE_GRP_MDA_OPT_OPTIONS} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>미디어 / 통화 옵션</SectionTitle>
                        <AgentMediaCards value={matrix} onChange={setMatrix} disabled={useGrpMdaOpt === 1} />

                        <SectionTitle marginTop={20}>주 업무 스킬</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="주 업무 스킬 ID" name="masterCtiqId">
                              <InputNumber style={{ width: '100%' }} min={0} placeholder="0 = 없음" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <SectionTitle>운영</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="감청 사용" name="monitorSvc">
                              <Select options={ONOFF_OPTIONS} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="코칭 사용" name="coachingSvc">
                              <Select options={ONOFF_OPTIONS} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ),
                  },
                ]}
              />
            </Form>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
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
              <SummaryRow label="상담그룹" value={groupOptions.find((g) => g.value === watchedGroupId)?.label?.trim() ?? '-'} />
              <SummaryRow label="로그인 ID" value={watchedLoginId || '-'} mono />
              <SummaryRow label="상담사명" value={watchedAgentName || '-'} />
              <SummaryRow
                label="활성"
                value={watchedActivateYn === 1 ? '활성' : watchedActivateYn === 0 ? '비활성' : '-'}
                accent={watchedActivateYn === 1 ? 'green' : watchedActivateYn === 0 ? 'gray' : undefined}
              />
              <SummaryRow label="퇴사" value={watchedRetireYn === 1 ? '퇴사' : watchedRetireYn === 0 ? '재직' : '-'} accent={watchedRetireYn === 1 ? 'red' : undefined} />
              <SummaryRow label="암호화" value="SHA-512" />
              <SummaryRow label="미디어 옵션" value={useGrpMdaOpt === 1 ? '그룹 상속' : '개별 설정'} accent={useGrpMdaOpt === 1 ? 'blue' : undefined} />
            </dl>
            <div className="mt-6 text-[12px] text-gray-400 leading-relaxed">상담사 ADN 자동채번은 "상담사 ADN 설정" 화면에서 진행 (후속 PR).</div>
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

function formatPwdChgDate(workTime: string | null): string {
  if (!workTime) return '-';
  return workTime.replace('T', ' ').slice(0, 16);
}
