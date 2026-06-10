/**
 * BSR 그룹 등록/수정 Drawer (2탭 구조).
 *
 * 탭1 기본정보: BSR그룹명(필수/100), 설명(필수/256), BSR메소드(필수), 활성화, 정렬순서, 대기상담원 큐분배, 대기상담원 라우팅 우선, 서비스레벨(초 min:20)
 * 탭2 지역번호 라우팅: 라우팅 우선여부(라디오) + 17개 GDN 콤보
 *   - 신규 생성 시 탭2 disabled (SWAT 정합)
 *   - 지역번호 라우팅 우선여부=0 시 17개 Select 비활성화
 *   - 각 Select 옵션: 해당 BSR 그룹의 CTI큐 목록(ctiqId=value, gdnName=label)
 *     SWAT gdnListInBsrGroup: bsrDistributeYn=0인 CTI큐의 gdnId→gdnName 매핑
 */
import { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Radio, Select, Tabs } from 'antd';
import { bsrCtiqMappingApi } from '../../bsr-ctiq-mapping/api/bsrCtiqMappingApi';
import { AREACODE_FIELDS, BSR_METHOD_OPTIONS, type BsrGroupCreateRequest, type BsrGroupResponse, type BsrGroupUpdateRequest } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  group?: BsrGroupResponse | null;
  defaultTenantId?: number | null;
  onCancel: () => void;
  onSubmit: (req: BsrGroupCreateRequest | BsrGroupUpdateRequest) => void;
  loading?: boolean;
}

interface CtiqOption {
  value: string; // ctiqId (문자열로 저장 — SWAT 정합)
  label: string; // gdnName
}

export default function BsrGroupFormDrawer({ open, mode, group, defaultTenantId, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [areacodeYn, setAreacodeYn] = useState(0);

  // 지역번호 라우팅 탭 콤보 옵션 (edit 모드, 해당 BSR 그룹의 CTI큐 목록)
  const [ctiqOptions, setCtiqOptions] = useState<CtiqOption[]>([]);

  // BSR 그룹 열릴 때 CTI큐 옵션 로드 (edit + 탭2 진입 시)
  useEffect(() => {
    if (!open || mode !== 'edit' || !group) {
      setCtiqOptions([]);
      return;
    }
    // BSR 그룹의 tenantId로 CTI큐 목록 조회 — gdnName을 레이블로, ctiqId를 값으로 사용
    // SWAT gdnListInBsrGroup: bsrDistributeYn=0 필터 (배분 전용 제외)
    const tenantId = group.tenantId;
    if (!tenantId) {
      setCtiqOptions([]);
      return;
    }
    void bsrCtiqMappingApi
      .getList(group.bsrGroupId, tenantId)
      .then((items) => {
        const opts: CtiqOption[] = items
          .filter((item) => item.bsrDistributeYn === 0 && item.gdnName)
          .map((item) => ({
            value: String(item.ctiqId),
            label: item.gdnName ?? '-',
          }));
        setCtiqOptions(opts);
      })
      .catch(() => setCtiqOptions([]));
  }, [open, mode, group]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('basic');
    if (mode === 'edit' && group) {
      const values: Record<string, unknown> = {
        tenantId: group.tenantId,
        bsrGroupName: group.bsrGroupName ?? '',
        bsrGroupDesc: group.bsrGroupDesc ?? '',
        bsrMethod: group.bsrMethod ?? undefined,
        activateYn: group.activateYn ?? 1,
        readyAgentRoutingYn: group.readyAgentRoutingYn ?? 1,
        readyAgentQueueRoutingYn: group.readyAgentQueueRoutingYn ?? 0,
        sortSeq: group.sortSeq ?? 1,
        serviceLevelTime: group.serviceLevelTime ?? 20,
        areacodeRoutingYn: group.areacodeRoutingYn ?? 0,
      };
      for (const f of AREACODE_FIELDS) {
        // 저장된 값은 ctiqId(문자열) — 그대로 Set
        values[f.key] = (group as unknown as Record<string, unknown>)[f.key] ?? undefined;
      }
      form.setFieldsValue(values);
      setAreacodeYn(group.areacodeRoutingYn ?? 0);
    } else {
      form.resetFields();
      form.setFieldsValue({
        tenantId: defaultTenantId ?? undefined,
        activateYn: 1,
        readyAgentRoutingYn: 1,
        readyAgentQueueRoutingYn: 0,
        sortSeq: 1,
        serviceLevelTime: 20,
        areacodeRoutingYn: 0,
      });
      setAreacodeYn(0);
    }
  }, [open, mode, group, defaultTenantId, form]);

  const handleFinish = (values: Record<string, unknown>) => {
    const req: BsrGroupCreateRequest = {
      tenantId: values.tenantId as number,
      bsrGroupName: values.bsrGroupName as string,
      bsrGroupDesc: values.bsrGroupDesc as string,
      bsrMethod: values.bsrMethod as string,
      activateYn: values.activateYn as number,
      readyAgentRoutingYn: values.readyAgentRoutingYn as number,
      readyAgentQueueRoutingYn: values.readyAgentQueueRoutingYn as number,
      sortSeq: values.sortSeq as number,
      serviceLevelTime: values.serviceLevelTime as number,
      areacodeRoutingYn: values.areacodeRoutingYn as number,
    };
    if (mode === 'edit') {
      for (const f of AREACODE_FIELDS) {
        // ctiqId 문자열 또는 null 저장
        (req as unknown as Record<string, unknown>)[f.key] = (values[f.key] as string | undefined) ?? null;
      }
    }
    onSubmit(req);
  };

  return (
    <Drawer
      title={mode === 'create' ? 'BSR 그룹 등록' : 'BSR 그룹 수정'}
      open={open}
      onClose={onCancel}
      width={700}
      closable={{ placement: 'end' }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            저장
          </Button>
        </div>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'basic',
              label: '기본정보',
              children: (
                <>
                  <Form.Item name="tenantId" label="테넌트 ID" hidden>
                    <InputNumber />
                  </Form.Item>

                  <Form.Item
                    name="bsrGroupName"
                    label="BSR 그룹명"
                    rules={[
                      { required: true, message: 'BSR 그룹명은 필수입니다' },
                      { max: 100, message: '최대 100자입니다' },
                    ]}
                  >
                    <Input placeholder="BSR 그룹명 입력" maxLength={100} />
                  </Form.Item>

                  <Form.Item
                    name="bsrGroupDesc"
                    label="BSR 그룹 설명"
                    rules={[
                      { required: true, message: '설명은 필수입니다' },
                      { max: 256, message: '최대 256자입니다' },
                    ]}
                  >
                    <Input.TextArea placeholder="설명 입력" maxLength={256} rows={3} />
                  </Form.Item>

                  <Form.Item name="bsrMethod" label="BSR 그룹 메소드" rules={[{ required: true, message: 'BSR 메소드는 필수입니다' }]}>
                    <Select placeholder="BSR 메소드 선택" options={BSR_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
                  </Form.Item>

                  <Form.Item name="activateYn" label="활성화여부">
                    <Radio.Group>
                      <Radio value={1}>활성</Radio>
                      <Radio value={0}>비활성</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item name="sortSeq" label="정렬순서">
                    <InputNumber min={1} max={999999} style={{ width: 120 }} />
                  </Form.Item>

                  <Form.Item name="readyAgentQueueRoutingYn" label="대기상담원 큐 분배여부">
                    <Radio.Group>
                      <Radio value={1}>설정</Radio>
                      <Radio value={0}>해제</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item name="readyAgentRoutingYn" label="대기상담원 라우팅 우선여부">
                    <Radio.Group>
                      <Radio value={1}>설정</Radio>
                      <Radio value={0}>해제</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item name="serviceLevelTime" label="서비스레벨 기준시간 (초)">
                    <InputNumber min={20} max={999999} style={{ width: 120 }} addonAfter="초" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'areacode',
              label: '지역번호 라우팅',
              disabled: mode === 'create',
              children: (
                <>
                  <Form.Item name="areacodeRoutingYn" label="지역번호 라우팅 우선여부">
                    <Radio.Group onChange={(e) => setAreacodeYn(e.target.value as number)}>
                      <Radio value={1}>설정</Radio>
                      <Radio value={0}>해제</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <div className="text-xs text-gray-400 mb-3">각 지역의 라우팅 CTI큐를 선택합니다 (BSR 분배 미사용 CTI큐만 표시).</div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {AREACODE_FIELDS.map((f) => (
                      <Form.Item key={f.key} name={f.key} label={f.label} className="mb-3">
                        <Select
                          placeholder={areacodeYn === 1 ? '지역 CTI큐 선택' : ''}
                          disabled={areacodeYn !== 1}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          options={ctiqOptions}
                          style={{ width: '100%' }}
                          notFoundContent={ctiqOptions.length === 0 ? <span className="text-xs text-gray-400">배정된 CTI큐가 없습니다</span> : undefined}
                        />
                      </Form.Item>
                    ))}
                  </div>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Drawer>
  );
}
