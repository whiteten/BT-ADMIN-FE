/**
 * 상담사 등록/수정 우측 슬라이드 Drawer.
 *
 * 호출 진입:
 *   - 그리드 상단 [등록] 버튼 → mode='create', initialTenantId/initialGroupId 전달
 *   - 그리드 행 더블클릭 / [수정] 아이콘 → mode='edit', agentId 전달
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, Radio, Row, Select, Spin, Tabs } from 'antd';
import { toast } from '@/shared-util';
import AgentMediaCards from './AgentMediaCards';
import { useGetAvailableSkillsets } from '../../skill-assign/hooks/useSkillAssignQueries';
import { ACTIVATE_OPTIONS, AGENT_GRADE_OPTIONS, JIKGUP_OPTIONS, ON_OFF_OPTIONS, RETIRE_OPTIONS, USE_GRP_MDA_OPT_OPTIONS, USE_GRP_SKILL_OPTIONS } from '../constants/codes';
import { useCreateAgent, useGetAgentDetail, useGetAgentGroupTree, useGetAgentTenants, useUpdateAgent } from '../hooks/useAgentMasterQueries';
import type { AgentCreateRequest, AgentGroupNode, AgentUpdateRequest, AgentMediaMatrix as Matrix } from '../types';

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
  useGrpSkill?: number;
  masterCtiqId?: number;
  monitorSvc?: number;
  coachingSvc?: number;
}

interface AgentMasterFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  agentId?: number; // edit 시
  initialTenantId?: number; // create 시 기본 테넌트
  initialGroupId?: number; // create 시 기본 그룹
  onClose: () => void;
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

export default function AgentMasterFormDrawer({ open, mode, agentId, initialTenantId, initialGroupId, onClose }: AgentMasterFormDrawerProps) {
  const isEdit = mode === 'edit';

  const [form] = Form.useForm<FormValues>();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();

  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({});
  const { data: detail, isLoading: detailLoading } = useGetAgentDetail(isEdit ? agentId : null);

  const { mutate: createAgent, isPending: creating } = useCreateAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담사가 등록되었습니다');
        onClose();
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
        onClose();
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setMatrix(null);
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
        useGrpSkill: detail.useGrpSkill ?? 0,
        masterCtiqId: detail.masterCtiqId ?? 0,
        monitorSvc: detail.monitorSvc ?? 0,
        coachingSvc: detail.coachingSvc ?? 0,
      });
      setSelectedTenantId(detail.tenantId);
      setMatrix(detail.mediaMatrix);
    } else if (!isEdit) {
      const init: FormValues = {
        activateYn: 1,
        retireYn: 0,
        useGrpMdaOpt: 0,
        useGrpSkill: 0,
        masterCtiqId: 0,
        monitorSvc: 0,
        coachingSvc: 0,
      };
      if (initialTenantId) {
        init.tenantId = initialTenantId;
        setSelectedTenantId(initialTenantId);
      }
      if (initialGroupId) init.groupId = initialGroupId;
      form.setFieldsValue(init);
    }
  }, [open, isEdit, detail, form, initialTenantId, initialGroupId]);

  const useGrpMdaOpt = Form.useWatch('useGrpMdaOpt', form) ?? 0;

  const tenantOptions = useMemo(() => tenantStats.map((t) => ({ value: t.tenantId, label: t.tenantName ?? `테넌트 ${t.tenantId}` })), [tenantStats]);

  const groupOptions = useMemo(() => {
    const flat = flattenGroups(groupTree, selectedTenantId);
    return flat.map((g) => ({
      value: g.groupId,
      label: `${'  '.repeat(Math.max(0, g.grpDepth - 1))}${g.groupName}`,
    }));
  }, [groupTree, selectedTenantId]);

  // 주 업무 스킬(MASTER_CTIQ_ID) — 선택 테넌트의 스킬셋 풀을 재사용(skill-assign 종단)
  const { data: skillsets = [] } = useGetAvailableSkillsets({
    params: { tenantId: selectedTenantId },
    queryOptions: { enabled: selectedTenantId != null },
  });

  const masterSkillOptions = useMemo(() => [{ value: 0, label: '없음' }, ...skillsets.map((s) => ({ value: s.skillsetId, label: s.skillsetName }))], [skillsets]);

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
          useGrpSkill: values.useGrpSkill,
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
          useGrpSkill: values.useGrpSkill,
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

  const submitting = creating || updating;

  return (
    <Drawer
      title={isEdit ? `상담사 수정 — ${detail?.agentName ?? ''}` : '상담사 등록'}
      open={open}
      onClose={onClose}
      width={840}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {isEdit ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      {isEdit && detailLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spin />
        </div>
      ) : (
        <Form form={form} layout="vertical" requiredMark>
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '① 기본정보',
                children: (
                  <div>
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
                          <Select options={AGENT_GRADE_OPTIONS} placeholder="상담등급 선택" allowClear showSearch optionFilterProp="label" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="직급" name="jikgup">
                          <Select options={JIKGUP_OPTIONS} placeholder="직급 선택" allowClear showSearch optionFilterProp="label" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="주 업무 스킬" name="masterCtiqId">
                          <Select
                            options={masterSkillOptions}
                            placeholder={selectedTenantId ? '스킬셋 선택' : '테넌트를 먼저 선택하세요'}
                            disabled={!selectedTenantId}
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>상태</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="활성화" name="activateYn" rules={[{ required: true }]}>
                          <Select options={ACTIVATE_OPTIONS} />
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
                    </Row>

                    {isEdit && (
                      <>
                        <SectionTitle>이력</SectionTitle>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="작업일시">
                              <ReadOnly text={detail?.workTime ?? '-'} />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="작업자">
                              <ReadOnly text={detail?.workUserName ?? '-'} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: 'cti',
                label: '② CTI 옵션',
                children: (
                  <div>
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

                    <div className="flex items-center justify-between mb-3" style={{ marginTop: 8 }}>
                      <h3 className="text-[13px] font-semibold text-gray-700 m-0">미디어 / 통화 옵션</h3>
                      <Form.Item name="useGrpMdaOpt" className="!mb-0">
                        <Radio.Group options={USE_GRP_MDA_OPT_OPTIONS} optionType="button" buttonStyle="solid" size="small" />
                      </Form.Item>
                    </div>
                    <p className="text-[12px] text-gray-500 -mt-2 mb-3">
                      {useGrpMdaOpt === 1 ? '그룹 기본값을 상속합니다. 아래 매트릭스는 비활성화됩니다.' : '아래 매트릭스에 입력된 개별 옵션이 적용됩니다.'}
                    </p>
                    <AgentMediaCards value={matrix} onChange={setMatrix} disabled={useGrpMdaOpt === 1} />

                    <SectionTitle>운영</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="감청 사용" name="monitorSvc">
                          <Select options={ON_OFF_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="코칭 사용" name="coachingSvc">
                          <Select options={ON_OFF_OPTIONS} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ]}
          />
        </Form>
      )}
    </Drawer>
  );
}

function SectionTitle({ children, marginTop = 8 }: { children: React.ReactNode; marginTop?: number }) {
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
