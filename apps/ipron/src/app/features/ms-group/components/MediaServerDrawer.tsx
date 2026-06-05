/**
 * 미디어서버 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * AS-IS 3 tabs:
 * Tab 1 기본정보: 이름(required, max 128), 채널(required, >0), 노드(disabled), IP버전(default IPv4), IP(required), 포트(required, default 9500), WAN IP
 * Tab 2 NAT설정: 외부IP
 * Tab 3 부가정보: 블록(ON/OFF, default OFF), 확장옵션(max 127)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Modal, Row, Select, Switch } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMediaServer, useDeleteMediaServer, useUpdateMediaServer } from '../hooks/useMsGroupQueries';
import { IP_VERSION_OPTIONS, type MediaServer, type MediaServerCreateRequest } from '../types';

export interface MediaServerDrawerRef {
  open: (data?: MediaServer, nodeId?: number) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
  onClose?: () => void;
}

const MediaServerDrawer = forwardRef<MediaServerDrawerRef, Props>(({ onSuccess, onClose: onCloseProp }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<MediaServer | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const isEditMode = !!editData;

  const ipVersion = Form.useWatch('ipVersion', form) as string | undefined;

  // IPv4 정규식 (SWAT ourPattern('ipv4') 기준)
  const IPV4_PATTERN = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  // IPv6 정규식 (RFC 5952, 압축 표기 포함)
  const IPV6_PATTERN =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d)|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?\d)?\d)\.){3}(25[0-5]|(2[0-4]|1?\d)?\d))$/;

  const ipAddrRules = [
    { required: true, message: 'IP 주소는 필수입니다' },
    {
      validator(_r: unknown, value: string) {
        if (!value) return Promise.resolve();
        const pattern = ipVersion === '6' ? IPV6_PATTERN : IPV4_PATTERN;
        const label = ipVersion === '6' ? 'IPv6' : 'IPv4';
        if (!pattern.test(value)) {
          return Promise.reject(new Error(`${label} 주소 형식이 올바르지 않습니다`));
        }
        return Promise.resolve();
      },
    },
  ];

  useImperativeHandle(ref, () => ({
    open: (data?: MediaServer, initNodeId?: number) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setNodeId(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        mediaServerName: editData.mediaServerName,
        totalChannel: editData.totalChannel,
        ipVersion: editData.ipVersion ?? '4',
        ipAddr: editData.ipAddr,
        portNo: editData.portNo,
        natIpAddr: editData.natIpAddr ?? '',
        externalIpAddr: editData.externalIpAddr ?? '',
        blockYn: editData.blockYn ?? '0',
        extOptions: editData.extOptions ?? '',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createMediaServer, isPending: isCreating } = useCreateMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어서버가 등록되었습니다.');
        closeDrawer();
        onSuccess();
      },
    },
  });

  const { mutate: updateMediaServer, isPending: isUpdating } = useUpdateMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어서버가 수정되었습니다.');
        closeDrawer();
        onSuccess();
      },
    },
  });

  const { mutate: deleteMediaServer, isPending: isDeleting } = useDeleteMediaServer({
    mutationOptions: {
      onSuccess: () => {
        toast.success('미디어서버가 삭제되었습니다.');
        closeDrawer();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating || isDeleting;

  const closeDrawer = useCallback(() => {
    setVisible(false);
    setEditData(null);
    setNodeId(null);
    form.resetFields();
    onCloseProp?.();
  }, [form, onCloseProp]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (!nodeId) return;

      const payload: MediaServerCreateRequest = {
        mediaServerName: values.mediaServerName,
        nodeId: nodeId,
        totalChannel: values.totalChannel,
        ipVersion: values.ipVersion,
        ipAddr: values.ipAddr,
        portNo: values.portNo,
        natIpAddr: values.natIpAddr || null,
        externalIpAddr: values.externalIpAddr || null,
        blockYn: values.blockYn,
        extOptions: values.extOptions || null,
      };

      if (isEditMode && editData) {
        updateMediaServer({ id: editData.mediaServerId, data: payload });
      } else {
        createMediaServer(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, createMediaServer, updateMediaServer]);

  const handleDelete = useCallback(() => {
    if (!editData) return;
    Modal.confirm({
      title: '미디어서버 삭제',
      content: `"${editData.mediaServerName}" 미디어서버를 삭제하시겠습니까?\nMS그룹에 할당되어 있으면 삭제할 수 없습니다.`,
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: () => deleteMediaServer({ id: editData.mediaServerId }),
    });
  }, [editData, deleteMediaServer]);

  return (
    <Drawer
      title={isEditMode ? '미디어서버 수정' : '미디어서버 등록'}
      open={visible}
      onClose={closeDrawer}
      styles={{ wrapper: { width: 420 } }}
      footer={
        <div className="flex justify-between">
          <div>
            {isEditMode && (
              <Button danger onClick={handleDelete} loading={isDeleting}>
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={closeDrawer}>취소</Button>
            <Button type="primary" onClick={handleSubmit} loading={isPending}>
              {isEditMode ? '수정' : '등록'}
            </Button>
          </div>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ipVersion: '4',
          portNo: 9500,
          totalChannel: 100,
          blockYn: '0',
          natIpAddr: '',
          externalIpAddr: '',
          extOptions: '',
        }}
      >
        {/* 기본정보 */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">기본정보</h4>

        <Form.Item label="노드">
          <Input value={nodeId ? `Node ${nodeId}` : ''} disabled />
        </Form.Item>

        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              name="mediaServerName"
              label="MS 이름"
              required
              rules={[
                { required: true, message: 'MS 이름은 필수입니다' },
                { max: 128, message: 'MS 이름은 128자 이내여야 합니다' },
              ]}
            >
              <Input placeholder="미디어서버명" maxLength={128} />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item
              name="totalChannel"
              label="최대 채널"
              required
              rules={[
                { required: true, message: '필수' },
                { type: 'number', min: 1, message: '1 이상' },
              ]}
            >
              <InputNumber min={1} className="!w-full" placeholder="100" />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="ipVersion" label="IP 버전">
              <Select options={[...IP_VERSION_OPTIONS]} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="ipAddr" label="IP 주소" required rules={ipAddrRules} dependencies={['ipVersion']}>
              <Input placeholder={ipVersion === '6' ? '::1' : '0.0.0.0'} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="portNo"
              label="포트 번호"
              required
              rules={[
                { required: true, message: '포트 번호는 필수입니다' },
                { type: 'number', min: 1, max: 65535, message: '유효한 포트 범위: 1~65535' },
              ]}
            >
              <InputNumber min={1} max={65535} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        {/* NAT 설정 */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-2 pb-2 border-b border-gray-200">NAT 설정</h4>

        <Form.Item
          name="natIpAddr"
          label="외부 IP"
          rules={[
            { max: 128, message: '외부 IP는 128자 이내여야 합니다' },
            { pattern: /^$|^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/, message: 'NAT IP 주소 형식이 올바르지 않습니다' },
          ]}
        >
          <Input placeholder="NAT IP 주소" maxLength={128} />
        </Form.Item>

        <Form.Item name="externalIpAddr" label="External IP" rules={[{ max: 128, message: 'External IP는 128자 이내여야 합니다' }]}>
          <Input placeholder="External IP 주소" maxLength={128} />
        </Form.Item>

        {/* 부가정보 */}
        <h4 className="text-sm font-semibold text-gray-700 mb-3 mt-2 pb-2 border-b border-gray-200">부가정보</h4>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="blockYn"
              label="블록"
              valuePropName="checked"
              getValueFromEvent={(checked: boolean) => (checked ? '1' : '0')}
              getValueProps={(value: string) => ({ checked: value === '1' })}
            >
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="extOptions" label="확장옵션" rules={[{ max: 127, message: '확장옵션은 127자 이내여야 합니다' }]}>
              <Input placeholder="확장옵션" maxLength={127} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

MediaServerDrawer.displayName = 'MediaServerDrawer';
export default MediaServerDrawer;
