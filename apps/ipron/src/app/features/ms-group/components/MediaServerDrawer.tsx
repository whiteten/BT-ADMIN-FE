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
import { Button, Col, Drawer, Form, Input, InputNumber, Modal, Row, Select, Tabs } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMediaServer, useDeleteMediaServer, useUpdateMediaServer } from '../hooks/useMsGroupQueries';
import { BLOCK_YN_OPTIONS, IP_VERSION_OPTIONS, type MediaServer, type MediaServerCreateRequest } from '../types/msGroup.types';

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
  const [activeTab, setActiveTab] = useState('basic');

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: MediaServer, initNodeId?: number) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setActiveTab('basic');
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

  const tabItems = [
    {
      key: 'basic',
      label: '기본정보',
      children: (
        <>
          <Form.Item label="노드">
            <Input value={nodeId ? `Node ${nodeId}` : ''} disabled />
          </Form.Item>

          <Form.Item
            name="mediaServerName"
            label="MS 이름"
            required
            rules={[
              { required: true, message: 'MS 이름은 필수입니다' },
              { max: 128, message: 'MS 이름은 128자 이내여야 합니다' },
            ]}
          >
            <Input placeholder="미디어서버명을 입력하세요" maxLength={128} />
          </Form.Item>

          <Form.Item
            name="totalChannel"
            label="최대 채널"
            required
            rules={[
              { required: true, message: '최대 채널은 필수입니다' },
              { type: 'number', min: 1, message: '최대 채널은 1 이상이어야 합니다' },
            ]}
          >
            <InputNumber min={1} className="!w-full" placeholder="100" />
          </Form.Item>

          <Form.Item name="ipVersion" label="IP 버전">
            <Select options={[...IP_VERSION_OPTIONS]} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="ipAddr"
                label="IP 주소"
                required
                rules={[
                  { required: true, message: 'IP 주소는 필수입니다' },
                  { pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/, message: 'IP 주소 형식이 올바르지 않습니다' },
                ]}
              >
                <Input placeholder="0.0.0.0" />
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
        </>
      ),
    },
    {
      key: 'nat',
      label: 'NAT설정',
      children: (
        <>
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
        </>
      ),
    },
    {
      key: 'extra',
      label: '부가정보',
      children: (
        <>
          <Form.Item name="blockYn" label="블록">
            <Select options={[...BLOCK_YN_OPTIONS]} />
          </Form.Item>

          <Form.Item name="extOptions" label="확장옵션" rules={[{ max: 127, message: '확장옵션은 127자 이내여야 합니다' }]}>
            <Input placeholder="확장옵션" maxLength={127} count={{ show: true, max: 127 }} />
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <Drawer
      title={isEditMode ? '미디어서버 수정' : '미디어서버 등록'}
      open={visible}
      onClose={closeDrawer}
      width={420}
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
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </Drawer>
  );
});

MediaServerDrawer.displayName = 'MediaServerDrawer';
export default MediaServerDrawer;
