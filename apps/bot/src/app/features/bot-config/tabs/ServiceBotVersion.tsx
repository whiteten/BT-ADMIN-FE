import { useEffect, useState } from 'react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Col, Drawer, Form, type FormProps, Input, Row, Select } from 'antd';
import { Log } from '@/log';
import type { ServiceBotVersionCreateRequest, ServiceBotVersionListItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<ServiceBotVersionListItem>[] = [
  { headerName: 'ID', field: 'serviceId', hide: true },
  { headerName: '버전', field: 'serviceVer' },
  { headerName: '변경내용', field: 'versionDesc' },
  { headerName: '작업자', field: 'workUser' },
  { headerName: '작업일시', field: 'workTime' },
];

const sampleRowData: ServiceBotVersionListItem[] = Array.from({ length: 50 }).map((_, index) => ({
  serviceId: `bot-${index + 1}`,
  serviceVer: `1.0.${index}`,
  versionDesc: `버전 1.0.${index} 변경내용`,
  workUser: '홍길동',
  workTime: '2025-01-01 12:00:00',
}));

/**
 * Bot 버전 등록/수정 Drawer
 * @param open - 드로어 열림 여부
 * @param onClose - 드로어 닫기 함수
 * @param serviceVer - 선택된 서비스 버전
 */
function BotVersionDrawer({ open, onClose, serviceVer }: { open: boolean; onClose: () => void; serviceVer: string | null }) {
  const title = serviceVer ? '버전 수정' : '버전 추가';
  const [form] = Form.useForm();
  const { TextArea } = Input;

  const onFinish: FormProps<ServiceBotVersionCreateRequest>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    onClose();
  };

  const onFinishFailed: FormProps<ServiceBotVersionCreateRequest>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    Log.debug('handleDeleteBtn');
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={onClose}>
        취소
      </Button>
      {serviceVer && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn}>
        저장
      </Button>
    </div>
  );

  // TODO: serviceVer 있을 경우, API 조회 후 form data 변경

  useEffect(() => {
    form.setFieldsValue({
      serviceVer: serviceVer ?? '',
      versionDesc: '',
    });
  }, [serviceVer, form]);

  return (
    <Drawer open={open} onClose={onClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ serviceVer: '', versionDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item name="serviceVer" label="버전" required hasFeedback rules={[{ required: true, message: '버전을 입력하세요.' }]}>
              <Input placeholder="버전을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="versionDesc" label="설명" required hasFeedback rules={[{ required: true, message: '버전 설명을 입력하세요.' }]}>
              <TextArea rows={4} placeholder="버전 설명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}

export default function ServiceBotVersion() {
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<ServiceBotVersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedServiceVer, setSelectedServiceVer] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRowData(sampleRowData);
      setLoading(false);
    }, 2000);
  }, []);
  const handleClickAddVersion = () => {
    setSelectedServiceVer(null);
    setOpen(true);
  };
  const handleCloseDrawer = () => {
    setOpen(false);
  };
  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<ServiceBotVersionListItem>) => {
    if (!e.data?.serviceVer) return;
    const serviceVer = e.data?.serviceVer;
    Log.debug('handleRowDoubleClicked', serviceVer);
    setSelectedServiceVer(serviceVer);
    setOpen(true);
  };
  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="version"
            options={[
              { label: '버전', value: 'version' },
              { label: '변경내용', value: 'changeContent' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="solid" onClick={handleClickAddVersion}>
            버전추가
          </Button>
          <Button variant="solid">대화편집</Button>
          <Button variant="solid" color="primary">
            배포
          </Button>
          <Button variant="solid" color="cyan">
            배포설정
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<ServiceBotVersionListItem> {...{ rowData, columnDefs, gridOptions, loading }} onRowDoubleClicked={handleRowDoubleClicked} />
      </div>
      <BotVersionDrawer open={open} onClose={handleCloseDrawer} serviceVer={selectedServiceVer} />
    </div>
  );
}
