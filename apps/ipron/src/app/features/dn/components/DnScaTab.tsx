/**
 * DN SCA (Shared Call Appearance) 탭.
 * AS-IS IPR20S2020_Sca.jsp 리뉴얼.
 *
 * UI:
 *   - 카드형 목록 (선택 → 아래 상세 패널 갱신)
 *   - "새 SCA" 추가 카드
 *   - 카드 더블클릭 → 우측 편집 Drawer
 *   - 카드 버튼: [수정] [삭제]
 *   - 저장/취소 버튼은 Drawer 하단 footer
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Switch, Tag, Tooltip } from 'antd';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateDnSca, useDeleteDnSca, useGetDnOptions, useGetDnScaList, useUpdateDnSca } from '../hooks/useDnQueries';
import { DN_SCA_INITIAL_VALUES, type DnScaRequest, type DnScaResponse } from '../types';
import { TRANSPORT_TYPE_OPTIONS } from '../utils/dnEnums';

const IP_VERSION_OPTIONS = [
  { label: 'IPv4', value: 4 },
  { label: 'IPv6', value: 6 },
];

const AUTH_TYPE_OPTIONS = [
  { label: '고정 IP', value: 1 },
  { label: '동적 IP', value: 2 },
];

const LINE_TYPE_OPTIONS = [
  { label: 'Private', value: 1 },
  { label: 'Shared', value: 2 },
];

const REGI_STATUS_LABELS: Record<number, string> = {
  0: '언레지',
  1: '레지',
};

interface DnScaTabProps {
  dnId: number;
  nodeId: number | null;
  tenantId: number | null;
}

export default function DnScaTab({ dnId, nodeId, tenantId }: DnScaTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<DnScaResponse | null>(null);
  const [selected, setSelected] = useState<DnScaResponse | null>(null);
  const [form] = Form.useForm<DnScaRequest>();

  // ── queries ──
  const { data: scaList = [], refetch } = useGetDnScaList(dnId);
  const { data: options } = useGetDnOptions(nodeId && tenantId ? { nodeId, tenantId } : null);

  // SCA 목록 변경 시 선택된 SCA 동기화
  useEffect(() => {
    if (!selected) return;
    const updated = scaList.find((s) => s.scaId === selected.scaId);
    if (updated && updated !== selected) setSelected(updated);
    if (!updated) setSelected(null);
  }, [scaList, selected]);

  // ── mutations ──
  const createMut = useCreateDnSca({
    mutationOptions: {
      onSuccess: (d: unknown) => {
        toast.success('SCA가 등록되었습니다');
        setDrawerOpen(false);
        setSelected(d as DnScaResponse);
        void refetch();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '등록 실패'),
    },
  });
  const updateMut = useUpdateDnSca({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SCA가 수정되었습니다');
        setDrawerOpen(false);
        void refetch();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '수정 실패'),
    },
  });
  const deleteMut = useDeleteDnSca({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SCA가 삭제되었습니다');
        void refetch();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '삭제 실패'),
    },
  });

  // 단말기 타입 옵션 (dn options 재사용)
  const deviceTypeOptions = useMemo(
    () =>
      (options?.deviceTypes ?? []).map((d: any) => ({
        label: d.deviceName ?? d.name ?? String(d.deviceType ?? d.id),
        value: d.deviceType ?? d.id,
      })),
    [options],
  );

  const deviceTypeNameOf = (type: number | null) => (type == null ? '-' : (deviceTypeOptions.find((o) => o.value === type)?.label ?? String(type)));

  // ── SCA 편집 Drawer 열릴 때 폼 초기화 ──
  useEffect(() => {
    if (!drawerOpen) return;
    if (editing) {
      form.setFieldsValue({
        regiNo: editing.regiNo,
        deviceType: editing.deviceType ?? 0,
        mobileYn: editing.mobileYn ?? 0,
        lineType: editing.lineType ?? 1,
        regiStatus: editing.regiStatus ?? 0,
        transNum: editing.transNum ?? '',
        authType: editing.authType ?? 2,
        ipVersion: editing.ipVersion ?? 4,
        ipv4Address: editing.ipv4Address ?? '',
        ipv6Address: editing.ipv6Address ?? '',
        portNo: editing.portNo ?? 5060,
        transportType: editing.transportType ?? 1,
        md5UseYn: editing.md5UseYn ?? 0,
        md5Authid: editing.md5Authid ?? '',
        md5Authpwd: '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue(DN_SCA_INITIAL_VALUES);
    }
  }, [drawerOpen, editing, form]);

  // ── handlers ──
  const handleNewSca = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const handleEdit = (row: DnScaResponse) => {
    setEditing(row);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      updateMut.mutate({ dnId, scaId: editing.scaId, data: values });
    } else {
      createMut.mutate({ dnId, data: values });
    }
  };

  // 조건부 validation watch
  const authType = Form.useWatch('authType', form);
  const ipVersion = Form.useWatch('ipVersion', form);
  const mobileYn = Form.useWatch('mobileYn', form);
  const md5UseYn = Form.useWatch('md5UseYn', form);

  const transportLabel = (v: number | null) => TRANSPORT_TYPE_OPTIONS.find((o) => Number(o.value) === v)?.label ?? '-';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          SCA (Shared Call Appearance)
          <span className="ml-2 text-xs text-gray-400">{scaList.length}개</span>
        </h4>
      </div>

      {/* SCA 카드 목록 */}
      <div className="flex flex-wrap gap-3">
        {scaList.map((sca) => {
          const isActive = selected?.scaId === sca.scaId;
          const ipText = sca.ipVersion === 6 ? sca.ipv6Address || '-' : sca.ipv4Address || '-';
          return (
            <div
              key={sca.scaId}
              onClick={() => setSelected(sca)}
              onDoubleClick={() => handleEdit(sca)}
              className={`w-[240px] bg-white border rounded-lg p-3.5 flex flex-col transition cursor-pointer ${
                isActive ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 truncate">{sca.regiNo}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">{deviceTypeNameOf(sca.deviceType)}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Tooltip title="수정">
                    <button
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(sca);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip title="삭제">
                    <button
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        Modal.confirm({
                          title: 'SCA 삭제',
                          content: `등록 ID "${sca.regiNo}"을(를) 삭제합니다.`,
                          okType: 'danger',
                          onOk: () => deleteMut.mutate({ dnId, scaId: sca.scaId }),
                        });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                <Tag color={sca.regiStatus === 1 ? 'blue' : 'default'}>{REGI_STATUS_LABELS[sca.regiStatus ?? 0] ?? '-'}</Tag>
                <Tag>{transportLabel(sca.transportType ?? null)}</Tag>
                {sca.md5UseYn === 1 && <Tag color="purple">MD5</Tag>}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                <span className="text-gray-400">IP: </span>
                <span className="text-gray-700 font-mono">
                  {ipText}
                  {sca.portNo ? `:${sca.portNo}` : ''}
                </span>
              </div>
            </div>
          );
        })}

        {/* 빈 카드 (추가) */}
        <button
          onClick={handleNewSca}
          className="w-[240px] min-h-[110px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#405189] hover:text-[#405189] hover:bg-blue-50/30 transition"
        >
          <Plus size={20} />
          <span className="text-xs">새 SCA 추가</span>
        </button>
      </div>

      {/* ─── 상세 정보 패널 ─── */}
      <div>
        <div className="flex items-center gap-2 py-3">
          <h5 className="text-sm font-semibold text-gray-700">상세 정보</h5>
          {selected ? (
            <span className="text-xs text-gray-500">
              등록 ID <span className="font-medium text-gray-700">{selected.regiNo}</span>
            </span>
          ) : (
            <span className="text-xs text-gray-400">카드를 선택하세요</span>
          )}
        </div>
        {selected ? (
          <div className="grid grid-cols-3 gap-4 text-xs">
            <DetailSection title="기본정보">
              <DetailRow label="등록 ID" value={selected.regiNo} />
              <DetailRow label="장치 타입" value={deviceTypeNameOf(selected.deviceType)} />
              <DetailRow label="이동전화" value={selected.mobileYn === 1 ? '설정' : '해제'} />
              <DetailRow label="라인 타입" value={LINE_TYPE_OPTIONS.find((o) => o.value === selected.lineType)?.label ?? '-'} />
              <DetailRow label="등록 상태" value={REGI_STATUS_LABELS[selected.regiStatus ?? 0] ?? '-'} />
            </DetailSection>

            <DetailSection title="네트워크">
              <DetailRow label="IP 유형" value={AUTH_TYPE_OPTIONS.find((o) => o.value === selected.authType)?.label ?? '-'} />
              <DetailRow label="IP 버전" value={IP_VERSION_OPTIONS.find((o) => o.value === selected.ipVersion)?.label ?? '-'} />
              <DetailRow label="IPv4 주소" value={selected.ipv4Address || '-'} mono />
              <DetailRow label="IPv6 주소" value={selected.ipv6Address || '-'} mono />
              <DetailRow label="포트" value={selected.portNo ?? '-'} mono />
              <DetailRow label="전송 유형" value={transportLabel(selected.transportType ?? null)} />
            </DetailSection>

            <DetailSection title="인증 / 기타">
              <DetailRow label="MD5 사용" value={selected.md5UseYn === 1 ? '설정' : '해제'} />
              <DetailRow label="인증 ID" value={selected.md5Authid || '-'} />
              <DetailRow label="미등록 착신전환" value={selected.transNum || '-'} />
              <DetailRow label="등록 상태 시간(초)" value={selected.regiSec ?? 0} />
            </DetailSection>
          </div>
        ) : (
          <div className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-md">카드를 선택하면 상세 정보가 표시됩니다.</div>
        )}
      </div>

      {/* ─── SCA 편집 Drawer ─── */}
      <Drawer
        title={editing ? `SCA 수정 — ${editing.regiNo}` : '새 SCA 등록'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        placement="right"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDrawerOpen(false)}>취소</Button>
            <Button type="primary" onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>
              {editing ? '수정' : '등록'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" initialValues={DN_SCA_INITIAL_VALUES}>
          <Form.Item
            label="등록 ID"
            name="regiNo"
            rules={[
              { required: true, message: '등록 ID는 필수입니다' },
              { max: 32, message: '32자 이내' },
              { pattern: /^[A-Za-z0-9_]*$/, message: '영문/숫자/밑줄만 허용' },
            ]}
          >
            <Input placeholder="예: sip-line-01" disabled={!!editing} />
          </Form.Item>

          <Form.Item label="단말기 타입" name="deviceType" rules={[{ required: true, message: '단말기 타입을 선택하세요' }]}>
            <Select placeholder="선택" options={deviceTypeOptions} showSearch optionFilterProp="label" />
          </Form.Item>

          <div className="grid grid-cols-3 gap-3">
            <Form.Item label="이동전화" name="mobileYn" valuePropName="checked" getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}>
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
            <Form.Item label="MD5 인증" name="md5UseYn" valuePropName="checked" getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}>
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
            <Form.Item label="라인 타입" name="lineType">
              <Radio.Group>
                {LINE_TYPE_OPTIONS.map((o) => (
                  <Radio key={o.value} value={o.value}>
                    {o.label}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          </div>

          <Form.Item label="등록상태" name="regiStatus">
            <Select
              options={Object.entries(REGI_STATUS_LABELS).map(([v, l]) => ({
                label: l,
                value: Number(v),
              }))}
            />
          </Form.Item>

          <Form.Item label="미등록 착신전환 번호" name="transNum" rules={[{ max: 48, message: '48자 이내' }]}>
            <Input placeholder="이동전화 '설정'일 때 입력" maxLength={48} disabled={mobileYn !== 1} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="IP 유형" name="authType">
              <Radio.Group>
                {AUTH_TYPE_OPTIONS.map((o) => (
                  <Radio key={o.value} value={o.value}>
                    {o.label}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item label="IP 버전" name="ipVersion">
              <Select options={IP_VERSION_OPTIONS} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              label="IPv4 주소"
              name="ipv4Address"
              rules={[{ max: 40, message: '40자 이내' }, ...(ipVersion === 4 && authType === 1 ? [{ required: true, message: 'IPv4 주소는 필수입니다' }] : [])]}
            >
              <Input placeholder="0.0.0.0" disabled={ipVersion !== 4} />
            </Form.Item>
            <Form.Item
              label="IPv6 주소"
              name="ipv6Address"
              rules={[{ max: 200, message: '200자 이내' }, ...(ipVersion === 6 && authType === 1 ? [{ required: true, message: 'IPv6 주소는 필수입니다' }] : [])]}
            >
              <Input placeholder="::" disabled={ipVersion !== 6} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="포트" name="portNo">
              <InputNumber min={0} max={65535} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="전송 유형" name="transportType">
              <Select
                options={TRANSPORT_TYPE_OPTIONS.map((o) => ({
                  label: o.label,
                  value: Number(o.value),
                }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              label="인증 ID"
              name="md5Authid"
              rules={[{ max: 32, message: '32자 이내' }, ...(md5UseYn === 1 ? [{ required: true, message: 'MD5 사용 시 인증 ID 필수' }] : [])]}
            >
              <Input disabled={md5UseYn !== 1} />
            </Form.Item>
            <Form.Item
              label="인증 비밀번호"
              name="md5Authpwd"
              rules={[{ max: 16, message: '16자 이내' }, ...(!editing && md5UseYn === 1 ? [{ required: true, message: 'MD5 사용 시 비밀번호 필수' }] : [])]}
              extra={editing ? '입력 시에만 재암호화 저장됩니다' : undefined}
            >
              <Input.Password disabled={md5UseYn !== 1} maxLength={16} />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

// ── 상세 패널 helpers ─────────────────────────────────────────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-100">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-gray-400 w-[96px] flex-shrink-0">{label}</span>
      <span className={`text-gray-700 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
