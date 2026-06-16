/**
 * ADN 등록/수정 페이지 (AS-IS SWAT IPR20S2023_Info).
 *
 * Layout: 좌측 폼 + 우측 Summary Panel (320px)
 * 필드:
 *  - 테넌트 ID / ADN 번호 (3~8자리 숫자) — 등록 시만 입력
 *  - MD5 인증 (Switch) — 설정 시 ID + 비밀번호
 *  - 상담원 기본 상태 (Select)
 *  - 그룹발신번호용 그룹DN ID
 */
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { Lock, Network } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useCreateAdn, useGetAdnDetail, useUpdateAdn } from '../../features/adn/hooks/useAdnQueries';
import type { AdnCreateRequest, AdnDefaultStateCode, AdnUpdateRequest, ExtAuthtypeCode } from '../../features/adn/types';
import { ADN_DFT_STATE_OPTIONS, EXT_AUTHTYPE_OPTIONS, getAdnDftStateName, getDnStatusName } from '../../features/adn/utils/adnEnums';
import { useGetDnProfileTenants } from '../../features/dn-profile/hooks/useDnProfileQueries';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: 'ADN', path: '/ipron/adn' }];

interface AdnFormValues {
  tenantId: number;
  dnNo: string;
  md5Auth: number;
  md5Authid?: string;
  md5Authpwd?: string;
  adnDftState: AdnDefaultStateCode;
  origGrpdnId?: number | null;
  /** 내선 IP 인증 유형. '1'=고정IP, '2'=동적IP, undefined=해당없음. */
  extAuthtype?: ExtAuthtypeCode | null;
  ipv4Address?: string;
  ipv6Address?: string;
  extIpUpdate?: number | null;
}

export default function AdnForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultTenantId = searchParams.get('tenantId') ? Number(searchParams.get('tenantId')) : undefined;

  const isEditMode = !!id;
  const dnId = id ? Number(id) : undefined;

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb([...breadcrumb, { title: isEditMode ? '수정' : '등록', path: isEditMode && id ? `/ipron/adn/${id}/edit` : '/ipron/adn/create' }]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb, isEditMode, id]);

  const [form] = Form.useForm<AdnFormValues>();
  const { data: detail } = useGetAdnDetail(dnId);
  // 모든 활성 테넌트 목록 — DN 내선관리(DnProfileForm)와 동일 hook 재사용
  const { data: allTenants = [] } = useGetDnProfileTenants();

  const tenantOptions = useMemo(() => allTenants.map((t) => ({ value: t.tenantId, label: t.tenantName ?? String(t.tenantId) })), [allTenants]);

  // detail 로딩 시 초기값 세팅
  useEffect(() => {
    if (isEditMode && detail) {
      form.setFieldsValue({
        tenantId: detail.tenantId,
        dnNo: detail.dnNo,
        md5Auth: detail.md5Auth ?? 0,
        md5Authid: detail.md5Authid ?? undefined,
        md5Authpwd: undefined,
        adnDftState: (detail.adnDftState ?? '1') as AdnDefaultStateCode,
        origGrpdnId: detail.origGrpdnId ?? undefined,
        extAuthtype: (detail.extAuthtype ?? null) as ExtAuthtypeCode | null,
        ipv4Address: detail.ipv4Address ?? undefined,
        ipv6Address: detail.ipv6Address ?? undefined,
        extIpUpdate: detail.extIpUpdate ?? null,
      });
    } else if (!isEditMode) {
      form.setFieldsValue({
        tenantId: defaultTenantId,
        md5Auth: 0,
        adnDftState: '1' as AdnDefaultStateCode,
        extAuthtype: null,
      });
    }
  }, [form, isEditMode, detail, defaultTenantId]);

  const md5Auth = Form.useWatch('md5Auth', form);
  const watchedTenantId = Form.useWatch('tenantId', form);
  const watchedDnNo = Form.useWatch('dnNo', form);
  const watchedAdnDftState = Form.useWatch('adnDftState', form);
  const watchedExtAuthtype = Form.useWatch('extAuthtype', form) as ExtAuthtypeCode | null | undefined;

  const { mutate: createAdn, isPending: isCreating } = useCreateAdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('ADN 이 등록되었습니다');
        navigate('/ipron/adn');
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateAdn, isPending: isUpdating } = useUpdateAdn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('ADN 이 수정되었습니다');
        navigate('/ipron/adn');
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
      if (isEditMode && dnId) {
        const body: AdnUpdateRequest = {
          md5Auth: values.md5Auth,
          md5Authid: values.md5Authid,
          md5Authpwd: values.md5Authpwd,
          adnDftState: values.adnDftState,
          origGrpdnId: values.origGrpdnId ?? null,
          extAuthtype: values.extAuthtype ?? null,
          ipv4Address: values.ipv4Address,
          ipv6Address: values.ipv6Address,
          extIpUpdate: values.extIpUpdate ?? null,
        };
        updateAdn({ id: dnId, body });
      } else {
        const body: AdnCreateRequest = {
          tenantId: values.tenantId,
          dnNo: values.dnNo,
          md5Auth: values.md5Auth,
          md5Authid: values.md5Authid,
          md5Authpwd: values.md5Authpwd,
          adnDftState: values.adnDftState,
          origGrpdnId: values.origGrpdnId ?? null,
          extAuthtype: values.extAuthtype ?? null,
          ipv4Address: values.ipv4Address,
          ipv6Address: values.ipv6Address,
          extIpUpdate: values.extIpUpdate ?? null,
        };
        createAdn(body);
      }
    } catch {
      /* antd validation 자동 표시 */
    }
  };

  const handleCancel = () => navigate('/ipron/adn');

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Row gutter={16} className="flex-1 min-h-0">
        <Col flex="auto" className="min-w-0">
          <Card title={isEditMode ? `ADN 수정 — ${detail?.dnNo ?? id}` : 'ADN 등록'} className="!h-full" styles={{ body: { padding: 24 } }}>
            <Form form={form} layout="vertical" requiredMark>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="테넌트" name="tenantId" rules={[{ required: true, message: '테넌트를 선택하세요' }]}>
                    {isEditMode || tenantOptions.length === 0 ? (
                      <InputNumber style={{ width: '100%' }} disabled={isEditMode} placeholder="테넌트 ID" min={1} />
                    ) : (
                      <Select options={tenantOptions} placeholder="테넌트 선택" />
                    )}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="ADN 번호"
                    name="dnNo"
                    rules={[
                      { required: true, message: 'ADN 번호를 입력하세요' },
                      { pattern: /^\d{3,8}$/, message: '3~8자리 숫자' },
                    ]}
                  >
                    <Input placeholder="예: 8001" disabled={isEditMode} maxLength={8} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="상담원 기본 상태" name="adnDftState" rules={[{ required: true }]}>
                    <Select options={ADN_DFT_STATE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="그룹발신번호용 그룹DN ID (선택)" name="origGrpdnId">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="없으면 비워두세요" />
                  </Form.Item>
                </Col>
              </Row>

              <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">MD5 인증</span>
                  </div>
                  <Form.Item
                    name="md5Auth"
                    valuePropName="checked"
                    noStyle
                    getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                    getValueProps={(value: number) => ({ checked: value === 1 })}
                  >
                    <Switch />
                  </Form.Item>
                </div>

                {md5Auth === 1 && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="인증 아이디"
                        name="md5Authid"
                        rules={[
                          { required: true, message: '인증 아이디를 입력하세요' },
                          { max: 32, message: '32자 이내' },
                        ]}
                      >
                        <Input maxLength={32} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label={isEditMode ? '인증 비밀번호 (변경 시 입력)' : '인증 비밀번호'}
                        name="md5Authpwd"
                        rules={
                          isEditMode
                            ? [{ min: 8, max: 64, message: '8~64자' }]
                            : [
                                { required: true, message: '비밀번호를 입력하세요' },
                                { min: 8, max: 64, message: '8~64자' },
                              ]
                        }
                      >
                        <Input.Password autoComplete="new-password" maxLength={64} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </div>

              {/*
                내선 IP 인증 (AS-IS IPR20S2023 changeExtAuthType).
                고정 IP('1') 선택 시 IPv4(+IPv6) 입력 활성·필수, 동적 IP('2') 선택 시 extIpUpdate 토글 활성.
              */}
              <div className="mt-4 rounded-md border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="size-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">내선 IP 인증</span>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="인증 유형" name="extAuthtype">
                      <Select allowClear placeholder="미설정" options={EXT_AUTHTYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
                    </Form.Item>
                  </Col>
                </Row>

                {watchedExtAuthtype === '1' && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="IPv4 주소"
                        name="ipv4Address"
                        rules={[
                          { required: true, message: 'IPv4 주소를 입력하세요' },
                          { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IPv4 형식으로 입력하세요 (예: 192.168.0.10)' },
                          { max: 40, message: '40자 이내' },
                        ]}
                      >
                        <Input placeholder="예: 192.168.0.10" maxLength={40} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="IPv6 주소 (선택)" name="ipv6Address" rules={[{ max: 200, message: '200자 이내' }]}>
                        <Input placeholder="예: 2001:db8::1" maxLength={200} />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {watchedExtAuthtype === '2' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">IP 갱신 허용 (동적 IP)</span>
                    <Form.Item
                      name="extIpUpdate"
                      valuePropName="checked"
                      noStyle
                      getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}
                      getValueProps={(value: number | null | undefined) => ({ checked: value === 1 })}
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                )}
              </div>
            </Form>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
              <Button onClick={handleCancel}>취소</Button>
              <Button type="primary" loading={isCreating || isUpdating} onClick={handleSubmit}>
                {isEditMode ? '수정' : '등록'}
              </Button>
            </div>
          </Card>
        </Col>

        <Col flex="320px" className="hidden lg:block">
          <Card title="요약" className="!h-full" styles={{ body: { padding: 16 } }}>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-500">테넌트</dt>
                <dd className="font-medium">{tenantOptions.find((t) => t.value === watchedTenantId)?.label ?? watchedTenantId ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">ADN 번호</dt>
                <dd className="font-mono font-semibold">{watchedDnNo || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">DN 유형</dt>
                <dd>ADN (상담 내선)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">초기 상태</dt>
                <dd>{getDnStatusName('9')} (등록 시)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">기본 상태</dt>
                <dd>{getAdnDftStateName(watchedAdnDftState)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">MD5 인증</dt>
                <dd className={md5Auth === 1 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>{md5Auth === 1 ? '설정' : '해제'}</dd>
              </div>
            </dl>
            <div className="mt-6 text-[12px] text-gray-400 leading-relaxed">등록 시 노드/단말유형/내선프로파일은 기본값으로 설정됩니다.</div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
