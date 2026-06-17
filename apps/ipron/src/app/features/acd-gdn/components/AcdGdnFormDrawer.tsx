/**
 * ACD 그룹DN 등록/수정 드로어.
 *
 * 탭 기본정보 (소속 + 그룹DN)
 * 탭 번호·접근설정 (Global DN/채널제한/접근코드 프로파일/DR 접근코드 프로파일)
 * 탭 호분배 / ACD / 헌팅 (호분배/ACD + 헌팅)
 * 탭 멘트 (8단계)
 * 탭 라우팅 정책 (블록/장애/Busy DNIS + 블록/종료 옵션)
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Tabs } from 'antd';
import { toast } from '@/shared-util';
import { acdGdnApi } from '../api/acdGdnApi';
import { useCreateAcdGdn, useGetAcdGdnAccessCodeProfileOptions, useGetAcdGdnMentOptions, useGetAcdGdnSkillsetOptions, useUpdateAcdGdn } from '../hooks/useAcdGdnQueries';
import {
  ACD_TYPE_OPTIONS,
  CALL_CLOSE_TYPE_OPTIONS,
  type GdnCreateRequest,
  type GdnResponse,
  type GdnUpdateRequest,
  HUNTING_TYPE_OPTIONS,
  ROUTING_KIND_OPTIONS,
  YN_OPTIONS,
} from '../types';

interface AcdGdnFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  detail?: GdnResponse | null;
  defaultTenantId?: number | null;
  defaultNodeId?: number | null;
  tenantOptions?: { value: number; label: string }[];
  /** 유한 집합 자원 — Select 선택용 노드 옵션 (DnForm:nodeOptions 패턴 정합) */
  nodeOptions?: { value: number; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  tenantId?: number;
  nodeId?: number;
  gdnNo?: string;
  gdnName?: string;

  backUpNodeId?: number | null;
  globalDnYn?: number;

  acdYn?: number;
  acdType?: number;
  routingKind?: number;
  skillsetId?: number | null;
  maxWaitcnt?: number;
  maxWaittime?: number;

  huntingYn?: number;
  huntingType?: number;
  huntWaitTime?: number;

  blockYn?: number;
  closeType?: number | null;
  blockRoutingDnis?: string;
  errorRoutingDnis?: string;
  busyRoutingDnis?: string;

  aniNo?: string;
  channelLimitCount?: number | null;
  // 갭2: 접근코드 프로파일
  accessCodeProfileId?: number | null;
  drAccessCodeProfileId?: number | null;

  // 멘트 8개 (INIT/WAIT/CLOSE/CONN/HOLD/CO_CONN/CO_HOLD/BLOCK)
  initMent?: number | null;
  waitMent?: number | null;
  closeMent?: number | null;
  connMent?: number | null;
  holdMent?: number | null;
  coConnMent?: number | null;
  coHoldMent?: number | null;
  blockMent?: number | null;
}

export default function AcdGdnFormDrawer({ open, mode, detail, defaultTenantId, defaultNodeId, tenantOptions = [], nodeOptions = [], onClose, onSaved }: AcdGdnFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = mode === 'edit';
  // 갭6: DR 노드 선택 시 globalDnYn 자동=1 + 비활성 (SWAT doDrNode_OnSelect 정합)
  const [globalDnDisabled, setGlobalDnDisabled] = useState(false);

  const initial: FormValues = useMemo(() => {
    if (isEdit && detail) {
      return {
        tenantId: detail.tenantId ?? undefined,
        nodeId: detail.nodeId ?? undefined,
        gdnNo: detail.gdnNo,
        gdnName: detail.gdnName,
        backUpNodeId: detail.backUpNodeId,
        globalDnYn: detail.globalDnYn ?? 0,
        acdYn: detail.acdYn ?? 1,
        acdType: detail.acdType ?? 1,
        routingKind: detail.routingKind ?? 1,
        skillsetId: detail.skillsetId,
        maxWaitcnt: detail.maxWaitcnt ?? 0,
        maxWaittime: detail.maxWaittime ?? 0,
        huntingYn: detail.huntingYn ?? 0,
        huntingType: detail.huntingType ?? 1,
        huntWaitTime: detail.huntWaitTime ?? 10,
        blockYn: detail.blockYn ?? 0,
        closeType: detail.closeType,
        blockRoutingDnis: detail.blockRoutingDnis ?? '',
        errorRoutingDnis: detail.errorRoutingDnis ?? '',
        busyRoutingDnis: detail.busyRoutingDnis ?? '',
        aniNo: detail.aniNo ?? '',
        channelLimitCount: detail.channelLimitCount,
        accessCodeProfileId: detail.accessCodeProfileId ?? null,
        drAccessCodeProfileId: detail.drAccessCodeProfileId ?? null,
        initMent: detail.initMent,
        waitMent: detail.waitMent,
        closeMent: detail.closeMent,
        connMent: detail.connMent,
        holdMent: detail.holdMent,
        coConnMent: detail.coConnMent,
        coHoldMent: detail.coHoldMent,
        blockMent: detail.blockMent,
      };
    }
    return {
      tenantId: defaultTenantId ?? undefined,
      nodeId: defaultNodeId ?? undefined,
      globalDnYn: 0,
      acdYn: 1,
      acdType: 1,
      routingKind: 1,
      maxWaitcnt: 50,
      maxWaittime: 60,
      huntingYn: 0,
      huntingType: 1,
      huntWaitTime: 10,
      blockYn: 0,
    };
  }, [isEdit, detail, defaultTenantId, defaultNodeId]);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(initial);
      // 갭6: 초기 backUpNodeId 가 있으면 globalDnYn 비활성화
      const initBackUp = initial.backUpNodeId;
      setGlobalDnDisabled(initBackUp != null && initBackUp !== 0);
    }
  }, [open, form, initial]);

  const routingKind = Form.useWatch('routingKind', form);
  const acdType = Form.useWatch('acdType', form);
  const tenantId = Form.useWatch('tenantId', form);
  const nodeId = Form.useWatch('nodeId', form);
  const backUpNodeId = Form.useWatch('backUpNodeId', form);
  const isDirectRouting = routingKind === 4;
  const isSkillType = acdType === 3;

  // 멘트/스킬셋 콤보 옵션 — 테넌트 변경 시 자동 재조회 (IMPL-BE §③)
  const { data: mentOptions = [] } = useGetAcdGdnMentOptions(tenantId ?? null, nodeId ?? null);
  const { data: skillsetOptions = [] } = useGetAcdGdnSkillsetOptions(tenantId ?? null);
  const mentSelectOptions = useMemo(() => [{ value: 0, label: '(미사용)' }, ...mentOptions.map((m) => ({ value: m.id, label: m.name }))], [mentOptions]);
  const skillsetSelectOptions = useMemo(() => [{ value: 0, label: '(미사용)' }, ...skillsetOptions.map((s) => ({ value: s.id, label: s.name }))], [skillsetOptions]);
  // 갭2: 접근코드 프로파일 콤보 — nodeId 기준 (노드 변경 시 자동 재조회)
  const { data: accessCodeProfileOptions = [] } = useGetAcdGdnAccessCodeProfileOptions(nodeId ?? null);
  const accessCodeProfileSelectOptions = useMemo(
    () => [{ value: 0, label: '(미사용)' }, ...accessCodeProfileOptions.map((p) => ({ value: p.id, label: p.name }))],
    [accessCodeProfileOptions],
  );

  const { mutate: createGdn, isPending: isCreating } = useCreateAcdGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN 이 등록되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateGdn, isPending: isUpdating } = useUpdateAcdGdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹DN 이 수정되었습니다');
        onSaved();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // ─── 클라이언트 검증 (IMPL-BE §② — BE 도 400 으로 막지만 UX 즉시 피드백) ──
      const effectiveNodeId = isEdit ? (detail?.nodeId ?? null) : (values.nodeId ?? null);
      const buNode = values.backUpNodeId;
      if (effectiveNodeId != null && buNode != null && buNode !== 0 && Number(buNode) === Number(effectiveNodeId)) {
        toast.error('그룹DN 노드와 DR(백업) 노드를 동일한 노드로 설정할 수 없습니다');
        return;
      }

      // ─── 그룹DN 번호 중복 검증 (IMPL-BE §① — nodeId 단위 GDN+DN+SIP cross-check) ──
      if (!isEdit && effectiveNodeId != null && values.gdnNo) {
        try {
          const dup = await acdGdnApi.duplicateCheck({ nodeId: Number(effectiveNodeId), gdnNo: values.gdnNo });
          if (dup) {
            toast.error('동일 노드에 이미 사용 중인 번호입니다 (DN/SIP 트렁크 포함)');
            return;
          }
        } catch {
          // duplicate-check 실패는 등록 진행 (BE 가 최종 차단)
        }
      }

      if (isEdit && detail) {
        const body: GdnUpdateRequest = {
          gdnName: values.gdnName!,
          backUpNodeId: values.backUpNodeId ?? null,
          globalDnYn: values.globalDnYn ?? 0,
          acdYn: values.acdYn!,
          acdType: values.acdType!,
          routingKind: values.routingKind!,
          skillsetId: values.skillsetId ?? null,
          maxWaitcnt: values.maxWaitcnt ?? 0,
          maxWaittime: values.maxWaittime ?? 0,
          huntingYn: values.huntingYn ?? 0,
          huntingType: values.huntingType ?? null,
          huntWaitTime: values.huntWaitTime ?? null,
          initMent: values.initMent ?? null,
          waitMent: values.waitMent ?? null,
          closeMent: values.closeMent ?? null,
          connMent: values.connMent ?? null,
          holdMent: values.holdMent ?? null,
          coConnMent: values.coConnMent ?? null,
          coHoldMent: values.coHoldMent ?? null,
          blockMent: values.blockMent ?? null,
          blockYn: values.blockYn ?? 0,
          closeType: values.closeType ?? null,
          blockRoutingDnis: values.blockRoutingDnis ?? '',
          errorRoutingDnis: values.errorRoutingDnis ?? '',
          busyRoutingDnis: values.busyRoutingDnis ?? '',
          aniNo: values.aniNo ?? '',
          channelLimitCount: values.channelLimitCount ?? null,
          accessCodeProfileId: values.accessCodeProfileId ?? null,
          drAccessCodeProfileId: values.drAccessCodeProfileId ?? null,
        };
        updateGdn({ id: detail.gdnId, body });
      } else {
        const body: GdnCreateRequest = {
          tenantId: values.tenantId!,
          nodeId: values.nodeId!,
          gdnNo: values.gdnNo!,
          gdnName: values.gdnName!,
          backUpNodeId: values.backUpNodeId ?? null,
          globalDnYn: values.globalDnYn ?? 0,
          acdYn: values.acdYn!,
          acdType: values.acdType!,
          routingKind: values.routingKind!,
          skillsetId: values.skillsetId ?? null,
          maxWaitcnt: values.maxWaitcnt ?? 0,
          maxWaittime: values.maxWaittime ?? 0,
          huntingYn: values.huntingYn ?? 0,
          huntingType: values.huntingType ?? null,
          huntWaitTime: values.huntWaitTime ?? null,
          initMent: values.initMent ?? null,
          waitMent: values.waitMent ?? null,
          closeMent: values.closeMent ?? null,
          connMent: values.connMent ?? null,
          holdMent: values.holdMent ?? null,
          coConnMent: values.coConnMent ?? null,
          coHoldMent: values.coHoldMent ?? null,
          blockMent: values.blockMent ?? null,
          blockYn: values.blockYn ?? 0,
          closeType: values.closeType ?? null,
          blockRoutingDnis: values.blockRoutingDnis,
          errorRoutingDnis: values.errorRoutingDnis,
          busyRoutingDnis: values.busyRoutingDnis,
          aniNo: values.aniNo,
          channelLimitCount: values.channelLimitCount,
          accessCodeProfileId: values.accessCodeProfileId ?? null,
          drAccessCodeProfileId: values.drAccessCodeProfileId ?? null,
        };
        createGdn(body);
      }
    } catch {
      // validation error — antd shows inline
    }
  };

  const tabItems = [
    {
      key: 'basic',
      label: '기본정보',
      children: (
        <div className="space-y-4">
          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">소속</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <Form.Item label="테넌트" name="tenantId" rules={[{ required: true, message: '테넌트 필수' }]}>
                <Select options={tenantOptions} disabled={isEdit} placeholder="테넌트 선택" />
              </Form.Item>
              <Form.Item label="노드" name="nodeId" rules={[{ required: true, message: '노드는 필수입니다' }]}>
                {/* NUM-001: 유한 집합 자원 — InputNumber 대신 Select (DnForm:969 nodeOptions 패턴 정합) */}
                <Select options={nodeOptions} disabled={isEdit} placeholder="노드 선택" showSearch optionFilterProp="label" />
              </Form.Item>
              <Form.Item
                label="DR 노드"
                name="backUpNodeId"
                validateStatus={
                  backUpNodeId != null &&
                  Number(backUpNodeId) !== 0 &&
                  (isEdit ? detail?.nodeId : nodeId) != null &&
                  Number(backUpNodeId) === Number(isEdit ? detail?.nodeId : nodeId)
                    ? 'error'
                    : undefined
                }
                help={
                  backUpNodeId != null &&
                  Number(backUpNodeId) !== 0 &&
                  (isEdit ? detail?.nodeId : nodeId) != null &&
                  Number(backUpNodeId) === Number(isEdit ? detail?.nodeId : nodeId)
                    ? '그룹DN 노드와 DR 노드를 동일하게 설정할 수 없습니다'
                    : undefined
                }
              >
                {/* 갭6: DR 노드 선택 시 globalDnYn 자동=1 + 비활성 (SWAT doDrNode_OnSelect) */}
                <Select
                  options={[{ value: 0, label: '(없음)' }, ...nodeOptions]}
                  placeholder="(없음)"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  onChange={(val) => {
                    if (val != null && val !== 0) {
                      form.setFieldValue('globalDnYn', 1);
                      setGlobalDnDisabled(true);
                    } else {
                      setGlobalDnDisabled(false);
                    }
                  }}
                />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">그룹DN</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <Form.Item label="그룹DN 번호" name="gdnNo" rules={[{ required: true, min: 3, max: 16, message: '그룹DN 번호는 3~16자 필수입니다' }]}>
                <Input disabled={isEdit} placeholder="3~16자" maxLength={16} />
              </Form.Item>
              <Form.Item label="그룹DN 이름" name="gdnName" rules={[{ required: true, max: 100, message: '그룹DN 이름은 1~100자 필수입니다' }]}>
                <Input maxLength={100} />
              </Form.Item>
              <Form.Item label="발신 대표번호" name="aniNo">
                <Input maxLength={48} placeholder="예: 021234567" />
              </Form.Item>
            </div>
          </section>
        </div>
      ),
    },
    {
      key: 'number',
      label: '번호·접근설정',
      children: (
        <div className="space-y-4">
          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">번호 · 접근 설정</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              {/* 갭6: DR 노드 있으면 비활성 (SWAT doDrNode_OnSelect 정합) */}
              <Form.Item label="Global DN" name="globalDnYn">
                <Select options={YN_OPTIONS} disabled={globalDnDisabled} />
              </Form.Item>
              <Form.Item label="채널 제한" name="channelLimitCount">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="(미지정)" />
              </Form.Item>
              {/* 빈 셀(3열 정렬용) */}
              <div />
              {/* 갭2: 접근코드 프로파일 콤보 (SWAT IPR20S3010.jsp:863-876, nodeId 기준) */}
              <Form.Item label="접근코드 프로파일" name="accessCodeProfileId" tooltip="메인 노드 기준 접근코드 프로파일">
                <Select options={accessCodeProfileSelectOptions} placeholder="(미사용)" showSearch optionFilterProp="label" allowClear />
              </Form.Item>
              <Form.Item label="DR 접근코드 프로파일" name="drAccessCodeProfileId" tooltip="DR 노드 기준 접근코드 프로파일">
                <Select options={accessCodeProfileSelectOptions} placeholder="(미사용)" showSearch optionFilterProp="label" allowClear />
              </Form.Item>
            </div>
          </section>
        </div>
      ),
    },
    {
      key: 'acd',
      label: '호분배 / ACD / 헌팅',
      children: (
        <div className="space-y-4">
          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">호분배 / ACD</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <Form.Item label="호분배 여부" name="acdYn" rules={[{ required: true }]}>
                <Select options={YN_OPTIONS} />
              </Form.Item>
              <Form.Item label="ACD 타입" name="acdType" rules={[{ required: true }]}>
                {/* SWAT doUpdate 진입 전 ACD_TYPE 콤보 disabled 처리 정합 — 수정 모드에서 변경 불가 */}
                <Select options={ACD_TYPE_OPTIONS} disabled={isEdit} />
              </Form.Item>
              <Form.Item label="라우팅 스킬셋" name="skillsetId" tooltip="ACD 타입 = Skill 일 때만 사용">
                <Select
                  options={skillsetSelectOptions}
                  disabled={!isSkillType}
                  placeholder={isSkillType ? '스킬셋 선택' : '(ACD 타입 = Skill 시 활성)'}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </Form.Item>
              <Form.Item label="라우팅 기준" name="routingKind" rules={[{ required: true }]}>
                <Select options={ROUTING_KIND_OPTIONS} />
              </Form.Item>
              {/* 갭4: 라우팅기준≠직접(4)일 때 필수 (SWAT getJsValidation 정합), 기본값 50/60 */}
              <Form.Item
                label="최대 대기호"
                name="maxWaitcnt"
                rules={[
                  { type: 'number', min: 0, max: 1000, message: '0~1000 범위 입력' },
                  {
                    validator: (_, value) => {
                      if (!isDirectRouting && (value == null || value === '')) {
                        return Promise.reject(new Error('라우팅기준≠직접 시 필수'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={1000} disabled={isDirectRouting} />
              </Form.Item>
              <Form.Item
                label="최대 대기시간(s)"
                name="maxWaittime"
                rules={[
                  { type: 'number', min: 0, max: 3600, message: '0~3600 범위 입력' },
                  {
                    validator: (_, value) => {
                      if (!isDirectRouting && (value == null || value === '')) {
                        return Promise.reject(new Error('라우팅기준≠직접 시 필수'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={3600} disabled={isDirectRouting} />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">헌팅</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <Form.Item label="헌팅 여부" name="huntingYn">
                <Select options={YN_OPTIONS} disabled={isDirectRouting} />
              </Form.Item>
              <Form.Item label="헌팅 타입" name="huntingType">
                <Select options={HUNTING_TYPE_OPTIONS} disabled={isDirectRouting} />
              </Form.Item>
              <Form.Item label="헌팅 최대대기(s)" name="huntWaitTime" rules={[{ type: 'number', min: 0, max: 3600 }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={3600} disabled={isDirectRouting} />
              </Form.Item>
            </div>
          </section>
        </div>
      ),
    },
    {
      key: 'ments',
      label: '멘트 (8단계)',
      children: (
        <div className="space-y-4">
          {isDirectRouting && (
            <div className="bg-amber-50 border-l-[3px] border-amber-500 px-3 py-2 text-xs text-amber-700">라우팅기준=직접 — 대기/종료 멘트는 자동 비활성됩니다.</div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item label="초기 멘트" name="initMent" tooltip="접속 직후 1회 재생">
              <Select options={mentSelectOptions} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="대기 멘트" name="waitMent" tooltip="상담사 배정 대기 중 반복 — 라우팅=직접 시 비활성">
              <Select options={mentSelectOptions} disabled={isDirectRouting} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="종료 멘트" name="closeMent" tooltip="최대대기시간 초과 시 — 라우팅=직접 시 비활성">
              <Select options={mentSelectOptions} disabled={isDirectRouting} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="블록 멘트" name="blockMent" tooltip="블록 여부=설정 + 종료 도달 시 재생">
              <Select options={mentSelectOptions} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="기본 연결 멘트" name="connMent" tooltip="상담사 연결 직전 (녹취 안내 등)">
              <Select options={mentSelectOptions} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="기본 보류 멘트" name="holdMent" tooltip="상담사 보류(HOLD) 시 재생">
              <Select options={mentSelectOptions} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="국선 호 연결 멘트" name="coConnMent" tooltip="국선 연결 직전">
              <Select options={mentSelectOptions} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
            <Form.Item label="국선 호 보류 멘트" name="coHoldMent" tooltip="국선 보류(HOLD) 시">
              <Select options={mentSelectOptions} showSearch optionFilterProp="label" allowClear placeholder="(미사용)" />
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      key: 'routing',
      label: '라우팅 정책',
      children: (
        <div className="space-y-4">
          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">라우팅 번호 (각 상황별, 24자)</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <Form.Item label="블록 시 라우팅" name="blockRoutingDnis" tooltip="블록 여부=설정 + 종료방법 도달 시 → 블록멘트 재생 후 이 번호로 라우팅" rules={[{ max: 24 }]}>
                <Input maxLength={24} className="font-mono" placeholder="(없으면 비워두세요)" />
              </Form.Item>
              <Form.Item label="장애 시 라우팅" name="errorRoutingDnis" tooltip="노드/스킬셋 장애, 멤버 DN 전체 미응답 시 → 즉시 이 번호로 라우팅" rules={[{ max: 24 }]}>
                <Input maxLength={24} className="font-mono" placeholder="(없으면 비워두세요)" />
              </Form.Item>
              <Form.Item
                label="통화량 초과 시 라우팅"
                name="busyRoutingDnis"
                tooltip="최대대기호 또는 최대대기시간 초과 시 → 종료멘트 재생 후 이 번호로 라우팅"
                rules={[{ max: 24 }]}
              >
                <Input maxLength={24} className="font-mono" placeholder="(없으면 비워두세요)" />
              </Form.Item>
            </div>
          </section>

          <section>
            <h4 className="text-xs text-gray-500 font-semibold mb-2 pb-1 border-b border-dashed border-gray-200">블록 / 종료 옵션</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              <Form.Item label="블록 여부" name="blockYn">
                <Select options={YN_OPTIONS} />
              </Form.Item>
              {/* 갭5: CALL_CLOSE_TYPE 코드 콤보 (SWAT bTag:code classCd='CALL_CLOSE_TYPE' 정합) */}
              <Form.Item label="종료 방법" name="closeType">
                <Select options={[{ value: null, label: '(미지정)' }, ...CALL_CLOSE_TYPE_OPTIONS]} allowClear placeholder="종료 방법 선택" />
              </Form.Item>
            </div>
          </section>
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={isEdit ? `그룹DN 수정 — ${detail?.gdnNo ?? ''}` : '그룹DN 등록'}
      width={880}
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isCreating || isUpdating}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={initial}>
        <Tabs items={tabItems} />
      </Form>
    </Drawer>
  );
}
