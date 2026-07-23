/**
 * 상담사 등록/수정 우측 슬라이드 Drawer.
 *
 * 호출 진입:
 *   - 그리드 상단 [등록] 버튼 → mode='create', initialTenantId/initialGroupId 전달
 *   - 그리드 행 더블클릭 / [수정] 아이콘 → mode='edit', agentId 전달
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, Radio, Row, Select, Spin, Tabs } from 'antd';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetAvailableSkillsets } from '../../skill-assign/hooks/useSkillAssignQueries';
import { ACTIVATE_OPTIONS, AGENT_GRADE_OPTIONS, JIKGUP_OPTIONS, ON_OFF_OPTIONS, RETIRE_OPTIONS, USE_GRP_MDA_OPT_OPTIONS, USE_GRP_SKILL_OPTIONS } from '../constants/codes';
import { useCreateAgent, useGetAgentConfig, useGetAgentDetail, useGetAgentGroupTree, useGetAgentTenants, useGetOscoms, useUpdateAgent } from '../hooks/useAgentMasterQueries';
import type { AgentCreateRequest, AgentGroupNode, AgentMediaMatrix, AgentUpdateRequest } from '../types';
import AgentMediaCards from './AgentMediaCards';

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
  useGrpSkill?: number;
  masterCtiqId?: number;
  monitorSvc?: number;
  coachingSvc?: number;
  useGrpMdaOpt?: number;
}

interface AgentMasterFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  agentId?: number; // edit 시
  initialTenantId?: number; // create 시 기본 테넌트
  initialGroupId?: number; // create 시 기본 그룹
  /** 운영자 모드 여부 — true 일 때만 "테넌트" 선택 필드를 노출(대상 테넌트 지정). 일반 콘솔은 자기 테넌트 고정(숨김). */
  operatorMode?: boolean;
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

export default function AgentMasterFormDrawer({ open, mode, agentId, initialTenantId, initialGroupId, operatorMode = false, onClose }: AgentMasterFormDrawerProps) {
  const isEdit = mode === 'edit';
  // 일반 모드(operatorMode=false)에서 대상 테넌트 폴백용 활성 테넌트.
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });

  const [form] = Form.useForm<FormValues>();
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();
  // 미디어 매트릭스 — antd Form.Item 밖에서 별도 state 로 관리 (AgentMediaCards controlled)
  const [mediaMatrix, setMediaMatrix] = useState<AgentMediaMatrix | null>(null);

  const { data: agentConfig } = useGetAgentConfig();
  // passwordValidationRequired 기본값 true — 설정 로드 전에도 필수로 동작
  const pwdRequired = agentConfig?.passwordValidationRequired ?? true;

  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({});
  const { data: detail, isLoading: detailLoading } = useGetAgentDetail(isEdit ? agentId : null);
  const { data: oscoms = [] } = useGetOscoms();

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
    setMediaMatrix(null);
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
      setMediaMatrix(detail.mediaMatrix ?? null);
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
      // 일반 모드: 로그인 테넌트로 고정(부모 전달값 우선, 없으면 활성 테넌트 폴백).
      const createTenantId = initialTenantId ?? (operatorMode ? undefined : (activeTenantId ?? undefined));
      if (createTenantId) {
        init.tenantId = createTenantId;
        setSelectedTenantId(createTenantId);
      }
      if (initialGroupId) init.groupId = initialGroupId;
      form.setFieldsValue(init);
    }
  }, [open, isEdit, detail, form, initialTenantId, initialGroupId, operatorMode, activeTenantId]);

  const tenantOptions = useMemo(() => tenantStats.map((t) => ({ value: t.tenantId, label: t.tenantName ?? `테넌트 ${t.tenantId}` })), [tenantStats]);

  // groupId → oscomId 룩업 맵 (SWAT IPR20S4010 L419: 그룹 선택 시 oscomId 자동설정)
  const groupOscomMap = useMemo(() => {
    const map = new Map<number, number | null>();
    const walk = (nodes: AgentGroupNode[]) => {
      for (const n of nodes) {
        map.set(n.groupId, n.oscomId ?? null);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(groupTree);
    return map;
  }, [groupTree]);

  const groupOptions = useMemo(() => {
    const flat = flattenGroups(groupTree, selectedTenantId);
    return flat.map((g) => ({
      value: g.groupId,
      label: `${'  '.repeat(Math.max(0, g.grpDepth - 1))}${g.groupName}`,
    }));
  }, [groupTree, selectedTenantId]);

  // 아웃소싱업체 콤보 옵션 (AgentGroupFormDrawer 패턴 정합 — 수정 시 기존 ID 폴백 포함)
  const oscomOptions = useMemo(() => {
    const opts = oscoms.map((o) => ({ value: o.oscomId, label: o.oscomName || `업체 ${o.oscomId}` }));
    if (isEdit && detail?.oscomId != null) {
      const editId = detail.oscomId;
      if (!opts.some((o) => o.value === editId)) {
        opts.push({ value: editId, label: `업체 ${editId}` });
      }
    }
    return opts;
  }, [oscoms, isEdit, detail]);

  // 주 업무 스킬(MASTER_CTIQ_ID) — 선택 테넌트의 스킬셋 풀을 재사용(skill-assign 종단)
  const { data: skillsets = [] } = useGetAvailableSkillsets({
    params: { tenantId: selectedTenantId },
    queryOptions: { enabled: selectedTenantId != null },
  });

  const masterSkillOptions = useMemo(() => [{ value: 0, label: '없음' }, ...skillsets.map((s) => ({ value: s.skillsetId, label: s.skillsetName }))], [skillsets]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const useGrpMdaOpt = values.useGrpMdaOpt ?? 0;
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
          useGrpMdaOpt,
          useGrpSkill: values.useGrpSkill,
          masterCtiqId: values.masterCtiqId,
          monitorSvc: values.monitorSvc,
          coachingSvc: values.coachingSvc,
          mediaMatrix: useGrpMdaOpt === 0 ? mediaMatrix : null,
        };
        updateAgent({ id: agentId, body });
      } else {
        const body: AgentCreateRequest = {
          tenantId: values.tenantId!,
          groupId: values.groupId!,
          agentLoginId: values.agentLoginId!,
          agentName: values.agentName!,
          agentAlias: values.agentAlias!,
          // pwdRequired=false 이면 비밀번호 미입력 허용 → undefined 전달 시 BE 에서 encryptPwd 미설정
          password: values.password?.trim() || (pwdRequired ? '' : undefined),
          agentGrade: values.agentGrade,
          jikgup: values.jikgup,
          oscomId: values.oscomId,
          activateYn: values.activateYn,
          retireYn: values.retireYn,
          useGrpMdaOpt,
          useGrpSkill: values.useGrpSkill,
          masterCtiqId: values.masterCtiqId,
          monitorSvc: values.monitorSvc,
          coachingSvc: values.coachingSvc,
          mediaMatrix: useGrpMdaOpt === 0 ? mediaMatrix : null,
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
      size={840}
      closable={{ placement: 'end' }}
      destroyOnHidden
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
        <Form form={form} layout="vertical" requiredMark className="agent-master-compact-form">
          {/* 무스크롤 목표: 이 드로어 폼에 한정한 여백 축소(전역 antd 미오버라이드) */}
          <style>{`
            .agent-master-compact-form .ant-form-item { margin-bottom: 8px; }
            .agent-master-compact-form .ant-form-item-label { padding-bottom: 1px; }
            .agent-master-compact-form .ant-tabs-body-holder { padding-top: 2px; }
            /* 미디어 옵션 탭: 공용 AgentMediaCards 비수정, 이 드로어 한정 카드 간격/패딩만 축소 */
            .agent-master-media-compact .flex.flex-col.gap-2 { gap: 4px; }
            .agent-master-media-compact .flex.flex-col.gap-2 > div > button { padding-top: 4px; padding-bottom: 4px; }
            .agent-master-media-compact .flex.flex-col.gap-2 > div > .border-t { padding-top: 8px; padding-bottom: 8px; }
            .agent-master-media-compact .flex.flex-col.gap-2 > div > .border-t.grid { row-gap: 8px; }
            .agent-master-media-compact > h3 { margin-top: 0; margin-bottom: 4px; }
            .agent-master-media-compact > .ant-form-item { margin-bottom: 4px; }
          `}</style>
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '기본정보',
                children: (
                  <div>
                    <SectionTitle>소속</SectionTitle>
                    <Row gutter={16}>
                      {/* 테넌트 선택은 운영자 모드에서만 노출(대상 테넌트 지정). 일반 콘솔은 자기 테넌트 고정 → 숨김 필드로 값만 유지. */}
                      {operatorMode ? (
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
                      ) : (
                        <Form.Item name="tenantId" hidden>
                          <Input />
                        </Form.Item>
                      )}
                      <Col span={operatorMode ? 12 : 24}>
                        <Form.Item label="상담그룹" name="groupId" rules={[{ required: true, message: '상담그룹을 선택하세요' }]}>
                          <Select
                            options={groupOptions}
                            placeholder={selectedTenantId ? '상담그룹 선택' : '테넌트를 먼저 선택하세요'}
                            disabled={!selectedTenantId}
                            showSearch
                            optionFilterProp="label"
                            onChange={(v: number) => {
                              // SWAT IPR20S4010 L419-430 정합: 그룹 선택 시 해당 그룹의 oscomId 자동설정
                              const grpOscomId = groupOscomMap.get(v);
                              form.setFieldsValue({ oscomId: grpOscomId != null && grpOscomId > 0 ? grpOscomId : undefined });
                            }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>기본정보</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="로그인 ID"
                          name="agentLoginId"
                          rules={[
                            { required: true, message: '로그인 ID를 입력하세요' },
                            { min: 3, message: '3자 이상 입력하세요' },
                            { max: 20, message: '20자까지 입력 가능합니다' },
                            { pattern: /^[0-9a-zA-Z\-_.]+$/, message: '영문, 숫자, -, _, . 만 입력 가능합니다' },
                          ]}
                        >
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
                        {/* agent-003: SWAT IPR20S4010 oscomId 콤보 정합 — 그룹 선택 시 자동채움, 직접 변경도 허용 */}
                        <Form.Item label="아웃소싱업체" name="oscomId">
                          <Select options={oscomOptions} placeholder="업체 선택 (없음=비워두기)" showSearch allowClear optionFilterProp="label" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>상태</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        {/* agent-004: SWAT radio 정합 — Select 에서 Radio 로 변환 */}
                        <Form.Item label="활성화" name="activateYn" rules={[{ required: true }]}>
                          <Radio.Group options={ACTIVATE_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="퇴사 여부" name="retireYn">
                          <Radio.Group options={RETIRE_OPTIONS} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>인증</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label={isEdit ? '비밀번호 (변경 시 입력)' : pwdRequired ? '비밀번호' : '비밀번호 (선택)'}
                          name="password"
                          rules={isEdit ? [] : pwdRequired ? [{ required: true, message: '비밀번호를 입력하세요' }] : []}
                        >
                          <Input.Password autoComplete="new-password" placeholder={isEdit ? '미입력 시 유지' : pwdRequired ? '' : '미입력 시 비밀번호 없음'} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="암호화 방식">
                          <ReadOnly text="SHA-512" hint={pwdRequired ? '(시스템 고정)' : '(비밀번호 미사용 시 해싱 안 함)'} />
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
                key: 'media',
                label: '미디어 옵션',
                children: (
                  <div className="agent-master-media-compact">
                    <SectionTitle>미디어 옵션 방식</SectionTitle>
                    {/* SWAT IPR20S4010 L2922-2930 정합: 개별/그룹 라디오 */}
                    <Form.Item name="useGrpMdaOpt">
                      <Radio.Group options={USE_GRP_MDA_OPT_OPTIONS} />
                    </Form.Item>
                    <Form.Item noStyle dependencies={['useGrpMdaOpt']}>
                      {({ getFieldValue }) => {
                        const useGrp = getFieldValue('useGrpMdaOpt') === 1;
                        return (
                          <>
                            {useGrp && (
                              <div className="text-sm text-gray-500 mb-4 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                                그룹 미디어 옵션을 사용합니다. 소속 상담그룹의 미디어 설정이 적용됩니다.
                              </div>
                            )}
                            <AgentMediaCards value={mediaMatrix} onChange={setMediaMatrix} disabled={useGrp} />
                          </>
                        );
                      }}
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: 'cti',
                label: 'CTI 옵션',
                // SWAT IPR20S4010 L769-775 정합: 신규 등록 모드에서는 최초 저장 전까지 CTI 탭 비활성
                disabled: !isEdit,
                children: (
                  <div>
                    <SectionTitle>노드</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="노드">
                          <ReadOnly text={detail?.nodeName ?? '(자동 배정)'} hint="테넌트 소속 노드에 자동 배정됩니다" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="DR 노드">
                          <ReadOnly text={detail?.backUpNodeName ?? '(미사용)'} hint="DR(이중화) 노드에 자동 배정됩니다" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>PBX 로그인 ID (ADN)</SectionTitle>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item label="PBX 로그인 ID">
                          <ReadOnly text={detail?.pbxLoginId ?? '— 미할당'} hint='"상담사 ADN 설정" 화면에서 자동 채번할 수 있습니다' />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>운영</SectionTitle>
                    <Row gutter={16}>
                      <Col span={12}>
                        {/* agent-004: SWAT radio 정합 */}
                        <Form.Item label="감청 사용" name="monitorSvc">
                          <Radio.Group options={ON_OFF_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="코칭 사용" name="coachingSvc">
                          <Radio.Group options={ON_OFF_OPTIONS} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <SectionTitle>스킬 배정</SectionTitle>
                    {/* 기본정보 탭 무스크롤 위해 "주 업무 스킬"을 여유 큰 CTI 탭(edit 전용)으로 이관.
                        Form.Item name/검증/disabled 동일 — create 모드는 기존대로 masterCtiqId 기본 0 전송. */}
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="주 업무스킬(통계용)" name="masterCtiqId">
                          <Select
                            options={masterSkillOptions}
                            placeholder={selectedTenantId ? '스킬셋 선택' : '테넌트를 먼저 선택하세요'}
                            disabled={!selectedTenantId}
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        {/* agent-005: SWAT poUseGrpSkill radio — useGrpSkill 항상 0 전송 버그 수정 */}
                        <Form.Item name="useGrpSkill" label="스킬 배정 방식">
                          <Radio.Group options={USE_GRP_SKILL_OPTIONS} />
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

function SectionTitle({ children, marginTop = 4 }: { children: React.ReactNode; marginTop?: number }) {
  return (
    <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5" style={{ marginTop }}>
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
