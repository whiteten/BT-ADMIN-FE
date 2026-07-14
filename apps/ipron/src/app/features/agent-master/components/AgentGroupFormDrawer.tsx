/**
 * 상담그룹 등록/수정 우측 슬라이드 Drawer.
 *
 * 트리 액션에서 호출:
 *   - 트리 하단 "+ 최상위 그룹 추가" → mode='create', priorGrpId 없음
 *   - 노드 [⋮] → 하위 그룹 추가 → mode='create', priorGrpId=노드ID, tenantId=노드 테넌트
 *   - 노드 [⋮] → 그룹 수정 → mode='edit', groupId=노드ID
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Spin, Tabs } from 'antd';
import { Trash2 } from 'lucide-react';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { ACTIVATE_OPTIONS, GRP_ANI_OPTIONS, MEDIA_KEY_LABELS, MEDIA_OPTION_BOUNDS } from '../constants/codes';
import {
  useCreateAgentGroup,
  useDeleteAgentGroup,
  useGetAgentGroupDetail,
  useGetAgentGroupTree,
  useGetAgentTenants,
  useGetOscoms,
  useUpdateAgentGroup,
} from '../hooks/useAgentMasterQueries';
import type { AgentGroupCreateRequest, AgentGroupNode, AgentGroupUpdateRequest, AgentMediaOption, AgentMediaMatrix as Matrix } from '../types';
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
  // 운영자 모드에서만 "테넌트" 선택 노출. 일반 콘솔은 로그인(활성) 테넌트로 고정 → 숨김.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });

  const [form] = Form.useForm<FormValues>();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();

  const { data: tenantStats = [] } = useGetAgentTenants();
  const { data: groupTree = [] } = useGetAgentGroupTree({});
  const { data: oscoms = [] } = useGetOscoms();
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
      // 일반 모드: 로그인 테넌트로 고정(부모 전달값 우선, 없으면 활성 테넌트 폴백).
      const createTenantId = initialTenantId ?? (operatorMode ? undefined : (activeTenantId ?? undefined));
      if (createTenantId) {
        init.tenantId = createTenantId;
        setSelectedTenantId(createTenantId);
      }
      if (initialPriorGrpId) init.priorGrpId = initialPriorGrpId;
      form.setFieldsValue(init);
    }
  }, [open, isEdit, detail, form, initialTenantId, initialPriorGrpId, operatorMode, activeTenantId]);

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

  // 아웃소싱업체(oscom) 옵션. SWAT 정합: cbCreate("#poOscomId","oscom",...) — 업체 마스터 콤보.
  // 업체 마스터 엔드포인트(GET /api/ipron/oscoms, useGetOscoms) 결과를 소스로 사용. 라벨은 oscomName(폴백만 `업체 {id}`).
  // 수정 모드에서 현재 바인딩된 oscomId 가 마스터 목록에 없으면(비활성/삭제 업체) 콤보가 빈칸이 되지 않도록 보강 추가.
  const oscomOptions = useMemo(() => {
    const opts = oscoms.map((o) => ({ value: o.oscomId, label: o.oscomName || `업체 ${o.oscomId}` }));
    const editId = detail?.oscomId;
    if (isEdit && editId != null && editId > 0 && !opts.some((o) => o.value === editId)) {
      // detail 응답엔 oscomName 이 없으므로(마스터 목록이 이름 SoT) ID 폴백 라벨만 사용.
      opts.push({ value: editId, label: `업체 ${editId}` });
    }
    return opts;
  }, [oscoms, detail, isEdit]);

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
        // 레거시 IPR20S4060 정합: 그룹 미디어옵션 수정 시 같은 그룹옵션을 쓰는 모든 상담사에 적용됨을 경고.
        modal.confirm.execute({
          onOk: () => updateGroup({ id: groupId, body }),
          options: {
            title: '상담그룹 미디어옵션 수정',
            content: '상담그룹의 미디어옵션 수정 시 같은 그룹 미디어 옵션을 사용하는 모든 상담사에게 수정된 미디어옵션이 적용됩니다. 수정하시겠습니까?',
          },
        });
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
      closable={{ placement: 'end' }}
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
                label: '기본정보',
                children: (
                  <div>
                    <SectionTitle>소속</SectionTitle>
                    <Row gutter={16}>
                      {operatorMode ? (
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
                      ) : (
                        /* 일반 콘솔 — 테넌트 숨김(로그인 테넌트 고정). 값만 유지. */
                        <Form.Item name="tenantId" hidden rules={[{ required: true, message: '테넌트를 선택하세요' }]}>
                          <InputNumber />
                        </Form.Item>
                      )}
                      <Col span={operatorMode ? 12 : 24}>
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
                          <Select options={oscomOptions} placeholder="업체 선택 (없음=비워두기)" showSearch allowClear optionFilterProp="label" />
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
                label: '미디어 옵션',
                children: (
                  <div>
                    <div className="text-[12px] text-gray-500 mb-3">상담사 등록 시 "그룹 미디어 옵션 사용"을 선택하면 이 그룹의 미디어 설정값이 상담사에게 상속됩니다.</div>
                    <MediaOptionEditor value={matrix} onChange={setMatrix} />
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

/**
 * 그룹 미디어옵션 단일선택 에디터.
 *
 * 8개 미디어 세로 아코디언(동시 펼침→1569px) 대신, 좌측 미디어 리스트(단일선택) +
 * 우측 선택된 1개 미디어 상세 패널 구조로 전환해 세로 스크롤 0 을 보장한다.
 * 우측 그리드 "미디어 관리" 탭의 단일 미디어 Select 패턴과 일관.
 *
 * 그룹 편집 전용이므로 자동수락(autoansUse)은 노출하지 않는다(레거시 그룹 팝업엔 없고
 * AgentGroup.*AutoansUse 가 @Transient 라 저장 시 소실 — 기존 hideAutoAns 규칙 동일).
 * matrix 키/값 형태는 그대로 유지 — API/타입/검증 로직 변경 없음.
 */

const MEDIA_KEYS = ['voip', 'chat', 'videoVoice', 'videoChat', 'email', 'fax', 'mvoip', 'sms'] as const;
type MediaKey = (typeof MEDIA_KEYS)[number];

const DEFAULT_MEDIA_OPT: AgentMediaOption = {
  use: false,
  autoansUse: false,
  autoanswerMode: 0,
  autoanswerTime: 2,
  util: 1,
  max: 1,
  afctime: 30,
};

function ensureMediaOpt(o: AgentMediaOption | null | undefined): AgentMediaOption {
  return o ?? { ...DEFAULT_MEDIA_OPT };
}

function MediaOptionEditor({ value, onChange }: { value: Matrix | null | undefined; onChange: (next: Matrix) => void }) {
  // 활성 8종 matrix 구성 (null 셀은 기본값으로 보강) — 비-null 레코드로 보관해 셀 접근을 단순화
  const matrix = useMemo(() => {
    const m = {} as Record<MediaKey, AgentMediaOption>;
    for (const key of MEDIA_KEYS) m[key] = ensureMediaOpt(value?.[key]);
    return m;
  }, [value]);

  const [selected, setSelected] = useState<MediaKey>('voip');
  const cell = matrix[selected];

  const setCell = (patch: Partial<AgentMediaOption>) => {
    onChange({ ...matrix, [selected]: { ...matrix[selected], ...patch } });
  };

  return (
    <div className="flex gap-3">
      {/* 좌측: 미디어 단일선택 리스트 */}
      <div className="w-[150px] flex-shrink-0 flex flex-col gap-1 border-r border-gray-100 pr-2">
        {MEDIA_KEYS.map((key) => {
          const on = !!matrix[key].use;
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`w-full flex items-center gap-2 px-2.5 h-8 rounded text-left text-[13px] transition-colors ${
                active ? 'bg-[#eef1fb] text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={`size-1.5 rounded-full flex-shrink-0 ${on ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="truncate">{MEDIA_KEY_LABELS[key] ?? key}</span>
            </button>
          );
        })}
      </div>

      {/* 우측: 선택된 미디어 상세 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] font-semibold text-gray-800">{MEDIA_KEY_LABELS[selected] ?? selected}</span>
          <span
            className={`inline-flex items-center px-2 h-[20px] rounded text-[11px] font-medium leading-none ${
              cell.use ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-600 bg-gray-50 border border-gray-200'
            }`}
          >
            {cell.use ? '사용' : '미사용'}
          </span>
        </div>
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <MediaField label="사용 여부">
              <Select
                size="small"
                style={{ width: '100%' }}
                value={cell.use ? 1 : 0}
                onChange={(v) => setCell({ use: v === 1 })}
                options={[
                  { value: 1, label: '사용' },
                  { value: 0, label: '미사용' },
                ]}
              />
            </MediaField>
          </Col>
          <Col span={12}>
            <MediaField label="자동 응답 모드">
              <Select
                size="small"
                style={{ width: '100%' }}
                value={cell.autoanswerMode ?? 0}
                onChange={(v) => {
                  // SWAT IPR20S4010 L577-581 정합: mode=0(수동)이면 time 비활성 + 0 리셋
                  setCell({ autoanswerMode: v, ...(v === 0 ? { autoanswerTime: 0 } : {}) });
                }}
                options={[
                  { value: 0, label: '수동' },
                  { value: 1, label: '자동' },
                ]}
              />
            </MediaField>
          </Col>
          <Col span={12}>
            <MediaField label="자동 응답 시간(초)">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                min={MEDIA_OPTION_BOUNDS.autoanswerTime.min}
                max={MEDIA_OPTION_BOUNDS.autoanswerTime.max}
                value={cell.autoanswerTime ?? 2}
                disabled={cell.autoanswerMode === 0}
                onChange={(v) => setCell({ autoanswerTime: typeof v === 'number' ? v : 2 })}
              />
            </MediaField>
          </Col>
          <Col span={12}>
            <MediaField label="가중치 (UTIL)">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                min={MEDIA_OPTION_BOUNDS.util.min}
                max={MEDIA_OPTION_BOUNDS.util.max}
                value={cell.util ?? 1}
                onChange={(v) => setCell({ util: typeof v === 'number' ? v : 1 })}
              />
            </MediaField>
          </Col>
          <Col span={12}>
            <MediaField label="동시 최대 (MAX)">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                min={MEDIA_OPTION_BOUNDS.max.min}
                max={MEDIA_OPTION_BOUNDS.max.max}
                value={cell.max ?? 1}
                onChange={(v) => setCell({ max: typeof v === 'number' ? v : 1 })}
              />
            </MediaField>
          </Col>
          <Col span={12}>
            <MediaField label="후처리 (AFC, 초)">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                min={MEDIA_OPTION_BOUNDS.afctime.min}
                max={MEDIA_OPTION_BOUNDS.afctime.max}
                value={cell.afctime ?? 30}
                onChange={(v) => setCell({ afctime: typeof v === 'number' ? v : 30 })}
              />
            </MediaField>
          </Col>
        </Row>
      </div>
    </div>
  );
}

function MediaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-gray-500">{label}</label>
      {children}
    </div>
  );
}
