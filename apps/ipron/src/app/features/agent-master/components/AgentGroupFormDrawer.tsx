/**
 * 상담그룹 등록/수정 우측 슬라이드 Drawer (목업 정합 — agent-master.html "④ 상담그룹 추가/수정 drawer-2").
 *
 * 트리 액션에서 호출:
 *   - 트리 하단 "+ 최상위 그룹 추가" → mode='create', priorGrpId 없음
 *   - 노드 [⋮] → 하위 그룹 추가 → mode='create', priorGrpId=노드ID, tenantId=노드 테넌트
 *   - 노드 [⋮] → 그룹 수정 → mode='edit', groupId=노드ID
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Spin, Tabs } from 'antd';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateAgentGroup, useDeleteAgentGroup, useGetAgentGroupDetail, useGetAgentGroupTree, useGetAgentTenants, useUpdateAgentGroup } from '../hooks/useAgentMasterQueries';
import type { AgentGroupCreateRequest, AgentGroupNode, AgentGroupUpdateRequest, AgentMediaMatrix as Matrix } from '../types';
import AgentMediaCards from './AgentMediaCards';
import { ACTIVATE_OPTIONS, GRP_ANI_OPTIONS } from '../constants/codes';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FormValues {
  tenantId?: number;
  priorGrpId?: number;
  groupName?: string;
  grpAniNo?: string;
  grpAniYn?: number;
  oscomId?: number;
  activateYn?: number;
}

interface AgentGroupFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  groupId?: number; // edit 시
  initialTenantId?: number; // create 시 기본 테넌트
  initialPriorGrpId?: number; // create 시 상위 그룹 (하위 추가 컨텍스트)
  onClose: () => void;
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

export default function AgentGroupFormDrawer({ open, mode, groupId, initialTenantId, initialPriorGrpId, onClose }: AgentGroupFormDrawerProps) {
  const isEdit = mode === 'edit';
  const modal = useModal();

  const [form] = Form.useForm<FormValues>();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();

  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({});
  const { data: detail, isLoading: detailLoading } = useGetAgentGroupDetail(isEdit ? groupId : null);

  const { mutate: createGroup, isPending: creating } = useCreateAgentGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('상담그룹이 등록되었습니다');
        onClose();
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
        onClose();
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
        onClose();
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '삭제 실패';
        toast.error(msg);
      },
    },
  });

  // open 시 초기화
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setMatrix(null);
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
      const init: FormValues = { activateYn: 1, grpAniYn: 0 };
      if (initialTenantId) {
        init.tenantId = initialTenantId;
        setSelectedTenantId(initialTenantId);
      }
      if (initialPriorGrpId) init.priorGrpId = initialPriorGrpId;
      form.setFieldsValue(init);
    }
  }, [open, isEdit, detail, form, initialTenantId, initialPriorGrpId]);

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

  const submitting = creating || updating;

  return (
    <Drawer
      title={isEdit ? `상담그룹 수정 — ${detail?.groupName ?? ''}` : '상담그룹 등록'}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          {isEdit && (
            <Button danger icon={<Trash2 className="size-3.5" />} loading={deleting} onClick={handleDelete} className="!mr-auto">
              삭제
            </Button>
          )}
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
                          <Select options={ACTIVATE_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="아웃소싱업체" name="oscomId">
                          <InputNumber style={{ width: '100%' }} min={0} placeholder="0 = 없음" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="그룹 발신 사용" name="grpAniYn">
                          <Select options={GRP_ANI_OPTIONS} />
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
                  <div>
                    <div className="text-[12px] text-gray-500 mb-3">상담사 등록 시 "그룹 미디어 옵션 사용" (USE_GRP_MDA_OPT=1) 선택 시 이 값이 상속됩니다.</div>
                    <AgentMediaCards value={matrix} onChange={setMatrix} />
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
