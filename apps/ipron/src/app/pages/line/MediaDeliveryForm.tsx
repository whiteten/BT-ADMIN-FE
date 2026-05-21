/**
 * 미디어전달 등록/수정 폼 페이지 — 발신라우트 패턴
 * Steps 스테퍼 + 좌측 폼 + 우측 요약 사이드바
 *
 * Step 1: 기본정보 (이름, 벤더, Transport, RTP, HA, 음성보안, IP버전, A/B장비 IP/포트)
 * Step 2: 부가정보 (A/B장비 상태체크, Block, 확장옵션)
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Divider, Form, Input, InputNumber, Radio, Row, Select, Steps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { mediaDeliveryQueryKeys, useCreateMdItem, useDeleteMdItem, useGetMdItemDetail, useUpdateMdItem } from '../../features/media-delivery/hooks/useMediaDeliveryQueries';
import {
  BLOCK_YN_OPTIONS,
  CHECK_TYPE_LABELS,
  CHECK_TYPE_OPTIONS,
  HA_TYPE_LABELS,
  HA_TYPE_OPTIONS,
  IP_VERSION_OPTIONS,
  MD_ITEM_INITIAL_VALUES,
  MD_STATE_LABELS,
  MD_VENDOR_LABELS,
  MD_VENDOR_OPTIONS,
  type MdItemCreateRequest,
  RTP_TRANS_TYPE_LABELS,
  RTP_TRANS_TYPE_OPTIONS,
  SRTP_YN_LABELS,
  SRTP_YN_OPTIONS,
  TRANSPORT_TYPE_LABELS,
  TRANSPORT_TYPE_OPTIONS,
} from '../../features/media-delivery/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const FORM_STEPS = [{ title: '기본정보' }, { title: '부가정보' }];

export default function MediaDeliveryForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const modal = useModal();
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formValues, setFormValues] = useState<any>(null);

  const editId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const initGrpId = searchParams.get('grpId') ? Number(searchParams.get('grpId')) : null;
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const isEditMode = !!editId;
  const isLastStep = currentStep === FORM_STEPS.length - 1;

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: itemDetail, isFetching } = useGetMdItemDetail({
    params: editId ? { id: editId } : undefined,
    queryOptions: { enabled: !!editId },
  });

  // ─── Populate form on edit ────────────────────────────────────────────────
  useEffect(() => {
    if (itemDetail && isEditMode) {
      const vals = {
        mediaDeliveryName: itemDetail.mediaDeliveryName,
        mediaDeliveryVendor: itemDetail.mediaDeliveryVendor,
        transportType: itemDetail.transportType,
        rtpTransType: itemDetail.rtpTransType,
        haType: itemDetail.haType,
        srtpYn: itemDetail.srtpYn,
        ipVersion: itemDetail.ipVersion,
        ipAddr1: itemDetail.ipAddr1,
        portNo1: itemDetail.portNo1,
        ipAddr2: itemDetail.ipAddr2 ?? '',
        portNo2: itemDetail.portNo2,
        checkType1: itemDetail.checkType1 ?? 2,
        chkInterval1: itemDetail.chkInterval1 ?? 60,
        failCnt1: itemDetail.failCnt1 ?? 3,
        blockYn1: itemDetail.blockYn1 ?? 0,
        extOptions1: itemDetail.extOptions1 ?? '',
        checkType2: itemDetail.checkType2 ?? 2,
        chkInterval2: itemDetail.chkInterval2 ?? 60,
        failCnt2: itemDetail.failCnt2 ?? 3,
        blockYn2: itemDetail.blockYn2 ?? 0,
        extOptions2: itemDetail.extOptions2 ?? '',
      };
      form.setFieldsValue(vals);
      setFormValues(vals);
    }
  }, [itemDetail, isEditMode, form]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: createMdItem, isPending: isCreating } = useCreateMdItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달이 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: mediaDeliveryQueryKeys.getMdGrps().queryKey });
        navigateBack();
      },
    },
  });

  const { mutate: updateMdItem, isPending: isUpdating } = useUpdateMdItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: mediaDeliveryQueryKeys.getMdGrps().queryKey });
        navigateBack();
      },
    },
  });

  const { mutate: deleteMdItem, isPending: isDeleting } = useDeleteMdItem({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어전달이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: mediaDeliveryQueryKeys.getMdGrps().queryKey });
        navigateBack();
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const navigateBack = () => {
    const nodeId = itemDetail?.nodeId ?? initNodeId;
    const grpId = itemDetail?.mediaDeliveryGrpId ?? initGrpId;
    const params = new URLSearchParams();
    if (nodeId) params.set('nodeId', String(nodeId));
    if (grpId) params.set('grpId', String(grpId));
    const qs = params.toString();
    navigate(`/ipron/line/media-delivery${qs ? `?${qs}` : ''}`);
  };

  const handleNext = async () => {
    try {
      await form.validateFields(['mediaDeliveryName', 'transportType', 'ipVersion', 'srtpYn', 'ipAddr1', 'portNo1']);
      setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
    } catch {
      /* validation failed */
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const grpId = isEditMode ? itemDetail!.mediaDeliveryGrpId : initGrpId!;
      const nodeId = isEditMode ? itemDetail!.nodeId : initNodeId!;

      const payload: MdItemCreateRequest = {
        mediaDeliveryGrpId: grpId,
        nodeId,
        mediaDeliveryName: values.mediaDeliveryName,
        mediaDeliveryVendor: values.mediaDeliveryVendor,
        transportType: values.transportType,
        rtpTransType: values.rtpTransType,
        haType: values.haType,
        srtpYn: values.srtpYn,
        ipVersion: values.ipVersion,
        ipAddr1: values.ipAddr1,
        portNo1: values.portNo1,
        ipAddr2: values.ipAddr2 || null,
        portNo2: values.portNo2 || null,
        checkType1: values.checkType1,
        chkInterval1: values.chkInterval1,
        failCnt1: values.failCnt1,
        blockYn1: values.blockYn1,
        extOptions1: values.extOptions1 || null,
        checkType2: values.checkType2,
        chkInterval2: values.chkInterval2,
        failCnt2: values.failCnt2,
        blockYn2: values.blockYn2,
        extOptions2: values.extOptions2 || null,
      };

      if (isEditMode && editId) {
        updateMdItem({ id: editId, data: payload });
      } else {
        createMdItem(payload);
      }
    } catch {
      setCurrentStep(0);
    }
  };

  const handleDelete = () => {
    if (!editId || !itemDetail) return;
    modal.confirm.execute({
      onOk: () => deleteMdItem({ id: editId }),
      options: {
        title: '미디어전달 삭제',
        content: `"${itemDetail.mediaDeliveryName}"을(를) 삭제하시겠습니까?`,
      },
    });
  };

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([{ title: 'IPRON' }, { title: '회선관리' }, { title: '미디어전달관리', href: '../media-delivery' }, { title: isEditMode ? '수정' : '등록' }]);
    return () => clearBreadcrumb();
  }, [isEditMode, setBreadcrumb, clearBreadcrumb]);

  const displayValue = (v: unknown) => (v !== null && v !== undefined && v !== '' ? String(v) : <span className="text-gray-300">-</span>);

  // ─── 우측 요약 패널 ─────────────────────────────────────────────────────────
  function renderFormSummary() {
    const v = formValues ?? MD_ITEM_INITIAL_VALUES;
    return (
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">1. 기본정보</div>
          <SummaryRow label="이름" value={displayValue(v.mediaDeliveryName)} />
          <SummaryRow label="벤더" value={displayValue(MD_VENDOR_LABELS[v.mediaDeliveryVendor] ?? v.mediaDeliveryVendor)} />
          <SummaryRow label="Transport" value={displayValue(TRANSPORT_TYPE_LABELS[v.transportType] ?? v.transportType)} />
          <SummaryRow label="RTP전송" value={displayValue(RTP_TRANS_TYPE_LABELS[v.rtpTransType] ?? v.rtpTransType)} />
          <SummaryRow label="HA형상" value={displayValue(HA_TYPE_LABELS[v.haType] ?? v.haType)} />
          <SummaryRow label="음성보안" value={displayValue(SRTP_YN_LABELS[v.srtpYn] ?? v.srtpYn)} />
          <SummaryRow label="IP버전" value={displayValue(v.ipVersion === 4 ? 'IPv4' : v.ipVersion === 6 ? 'IPv6' : v.ipVersion)} />
          <SummaryRow label="A장비 IP" value={displayValue(v.ipAddr1)} />
          <SummaryRow label="A장비 포트" value={displayValue(v.portNo1)} />
          <SummaryRow label="B장비 IP" value={displayValue(v.ipAddr2)} />
          <SummaryRow label="B장비 포트" value={displayValue(v.portNo2)} />
        </div>
        <Divider className="!my-3" />
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. 부가정보</div>
          <SummaryRow label="A 상태체크" value={displayValue(CHECK_TYPE_LABELS[v.checkType1] ?? v.checkType1)} />
          <SummaryRow label="A 체크주기" value={displayValue(v.chkInterval1 ? `${v.chkInterval1}초` : null)} />
          <SummaryRow label="A 실패Count" value={displayValue(v.failCnt1)} />
          <SummaryRow label="A Block" value={displayValue(v.blockYn1 === 1 ? 'ON' : 'OFF')} />
          <SummaryRow label="B 상태체크" value={displayValue(CHECK_TYPE_LABELS[v.checkType2] ?? v.checkType2)} />
          <SummaryRow label="B 체크주기" value={displayValue(v.chkInterval2 ? `${v.chkInterval2}초` : null)} />
          <SummaryRow label="B 실패Count" value={displayValue(v.failCnt2)} />
          <SummaryRow label="B Block" value={displayValue(v.blockYn2 === 1 ? 'ON' : 'OFF')} />
        </div>
      </div>
    );
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={navigateBack}>
            취소
          </Button>
        </Col>
        {isEditMode && (
          <Col>
            <Button variant="solid" color="danger" onClick={handleDelete} loading={isDeleting}>
              삭제
            </Button>
          </Col>
        )}
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={() => setCurrentStep((prev) => prev - 1)}>
              이전
            </Button>
          </Col>
        )}
        {!isLastStep && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {isLastStep && (
          <Col>
            <Button variant="solid" color="primary" onClick={handleSubmit} loading={isPending}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Steps bar */}
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps
          current={currentStep}
          items={FORM_STEPS.map((s) => ({ title: s.title }))}
          size="small"
          className="max-w-10/12 min-w-1/3"
          style={{ width: `${FORM_STEPS.length * 250}px` }}
          responsive={false}
        />
      </div>

      {/* Main (left: form, right: summary) */}
      <div className="flex w-full flex-1 min-h-0 gap-4">
        {/* Left form */}
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          {isFetching && isEditMode ? (
            <div className="flex items-center justify-center w-full h-full">
              <FallbackSpinner />
            </div>
          ) : (
            <>
              <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
                <Form form={form} initialValues={MD_ITEM_INITIAL_VALUES} layout="vertical" onValuesChange={(_, allValues) => setFormValues(allValues)}>
                  {/* ── Step 1: 기본정보 ── */}
                  <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">기본정보</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item
                          name="mediaDeliveryName"
                          label="이름"
                          required
                          hasFeedback
                          rules={[
                            { required: true, message: '이름은 필수입니다' },
                            { max: 128, message: '128자 이내' },
                          ]}
                        >
                          <Input placeholder="미디어전달 이름" maxLength={128} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="mediaDeliveryVendor" label="벤더">
                          <Select options={[...MD_VENDOR_OPTIONS]} placeholder="벤더 선택" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="transportType" label="Transport타입" required rules={[{ required: true, message: 'Transport타입은 필수입니다' }]}>
                          <Select options={[...TRANSPORT_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="rtpTransType" label="RTP전송타입">
                          <Select options={[...RTP_TRANS_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="haType" label="HA형상">
                          <Select options={[...HA_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="srtpYn" label="음성보안" required rules={[{ required: true, message: '음성보안은 필수입니다' }]}>
                          <Select options={[...SRTP_YN_OPTIONS]} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="ipVersion" label="IP버전" required rules={[{ required: true, message: 'IP버전은 필수입니다' }]}>
                          <Select options={[...IP_VERSION_OPTIONS]} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-4">장비 IP / 포트</h4>
                    <Row gutter={20}>
                      <Col span={8}>
                        <Form.Item name="ipAddr1" label="A장비 IP" required hasFeedback rules={[{ required: true, message: 'A장비 IP는 필수입니다' }]}>
                          <Input placeholder="192.168.1.100" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name="portNo1"
                          label="A포트"
                          required
                          rules={[
                            { required: true, message: '필수' },
                            { type: 'number', min: 1, max: 65535, message: '1~65535' },
                          ]}
                        >
                          <InputNumber className="!w-full" min={1} max={65535} placeholder="5060" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="ipAddr2" label="B장비 IP">
                          <Input placeholder="192.168.1.101 (HA시)" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="portNo2" label="B포트" rules={[{ type: 'number', min: 1, max: 65535, message: '1~65535' }]}>
                          <InputNumber className="!w-full" min={1} max={65535} placeholder="5060" />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* 상태 표시 (수정 시) */}
                    {isEditMode && itemDetail && (
                      <Row gutter={20}>
                        <Col span={12}>
                          <Form.Item label="A장비 상태">{renderState(itemDetail.redisState1)}</Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="B장비 상태">{renderState(itemDetail.redisState2)}</Form.Item>
                        </Col>
                      </Row>
                    )}
                  </div>

                  {/* ── Step 2: 부가정보 ── */}
                  <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">A장비 부가정보</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="checkType1" label="상태체크 타입">
                          <Select options={[...CHECK_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="chkInterval1" label="체크 주기(초)" rules={[{ type: 'number', min: 1, max: 9999, message: '1~9999' }]}>
                          <InputNumber className="!w-full" min={1} max={9999} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="failCnt1" label="최대 실패 Count" rules={[{ type: 'number', min: 0, max: 999, message: '0~999' }]}>
                          <InputNumber className="!w-full" min={0} max={999} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="blockYn1" label="Block 여부">
                          <Radio.Group>
                            {BLOCK_YN_OPTIONS.map((o) => (
                              <Radio key={o.value} value={o.value}>
                                {o.label}
                              </Radio>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={12}>
                        <Form.Item name="extOptions1" label="확장 옵션" rules={[{ max: 128, message: '128자 이내' }]}>
                          <Input placeholder="확장 옵션 (선택)" maxLength={128} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 mt-4">B장비 부가정보</h4>
                    <Row gutter={20}>
                      <Col span={6}>
                        <Form.Item name="checkType2" label="상태체크 타입">
                          <Select options={[...CHECK_TYPE_OPTIONS]} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="chkInterval2" label="체크 주기(초)" rules={[{ type: 'number', min: 1, max: 9999, message: '1~9999' }]}>
                          <InputNumber className="!w-full" min={1} max={9999} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="failCnt2" label="최대 실패 Count" rules={[{ type: 'number', min: 0, max: 999, message: '0~999' }]}>
                          <InputNumber className="!w-full" min={0} max={999} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="blockYn2" label="Block 여부">
                          <Radio.Group>
                            {BLOCK_YN_OPTIONS.map((o) => (
                              <Radio key={o.value} value={o.value}>
                                {o.label}
                              </Radio>
                            ))}
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={20}>
                      <Col span={12}>
                        <Form.Item name="extOptions2" label="확장 옵션" rules={[{ max: 128, message: '128자 이내' }]}>
                          <Input placeholder="확장 옵션 (선택)" maxLength={128} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </Form>
              </div>
              <div className="w-full px-7 pb-7">{renderFooter()}</div>
            </>
          )}
        </div>

        {/* Right summary panel */}
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}

// ─── 상태 표시 헬퍼 ──────────────────────────────────────────────────────────
function renderState(state: number | null | undefined) {
  if (state != null && MD_STATE_LABELS[state]) {
    const s = MD_STATE_LABELS[state];
    return <span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span>;
  }
  return <span className="text-gray-300">-</span>;
}

// ─── 요약 행 컴포넌트 ─────────────────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 w-[120px] shrink-0">{label}</span>
      <span className="text-gray-800 font-medium flex-1">{value}</span>
    </div>
  );
}
