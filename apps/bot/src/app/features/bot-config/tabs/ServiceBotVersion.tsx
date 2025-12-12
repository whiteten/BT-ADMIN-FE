import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Col, Drawer, Form, type FormProps, Input, Row, Select } from 'antd';
import { Log } from '@/log';

import {
  serviceBotQueryKeys,
  useCreateServiceBotVersion,
  useDeleteServiceBotVersion,
  useGetServiceBotVersion,
  useGetServiceBotVersions,
  useUpdateServiceBotVersion,
} from '../hooks/useServiceBotQueries';
import type { ServiceBotVersionCreateDatas, ServiceBotVersionListItem, ServiceBotVersionUpdateDatas } from '../types';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const columnDefs: ColDef<ServiceBotVersionListItem>[] = [
  { headerName: 'ID', field: 'serviceId', hide: true },
  { headerName: '버전', field: 'serviceVer' },
  { headerName: '버전명', field: 'versionName' },
  { headerName: '변경내용', field: 'versionDesc' },
  { headerName: '작업자', field: 'workUser' },
  { headerName: '작업일시', field: 'workTime' },
];

/**
 * Bot 버전 등록/수정 Drawer
 * @param open - 드로어 열림 여부
 * @param onClose - 드로어 닫기 함수
 * @param serviceVer - 선택된 서비스 버전
 */
interface BotVersionDrawerProps {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  serviceVer?: string;
}

function BotVersionDrawer({ open, onClose, serviceId, serviceVer }: BotVersionDrawerProps) {
  const title = serviceVer ? '버전 수정' : '버전 추가';
  const [form] = Form.useForm();
  const { TextArea } = Input;
  const queryClient = useQueryClient();

  const { data: serviceBotVersion, isFetching } = useGetServiceBotVersion({
    params: { serviceId, serviceVer },
    queryOptions: { enabled: !!serviceId && !!serviceVer && open },
  });

  const { mutate: createServiceBotVersion, isPending: isCreating } = useCreateServiceBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: serviceBotQueryKeys.getServiceBotVersions({ serviceId }).queryKey });
        onClose();
      },
    },
  });

  const { mutate: updateServiceBotVersion, isPending: isUpdating } = useUpdateServiceBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: serviceBotQueryKeys.getServiceBotVersions({ serviceId }).queryKey });
        onClose();
      },
    },
  });

  const { mutate: deleteServiceBotVersion, isPending: isDeleting } = useDeleteServiceBotVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: serviceBotQueryKeys.getServiceBotVersions({ serviceId }).queryKey });
        onClose();
      },
    },
  });

  useEffect(() => {
    if (!serviceBotVersion) return;
    form.setFieldsValue({
      serviceVer: serviceBotVersion.serviceVer,
      versionName: serviceBotVersion.versionName,
      versionDesc: serviceBotVersion.versionDesc,
    });
  }, [serviceBotVersion, form]);

  const onFinish: FormProps<ServiceBotVersionCreateDatas | ServiceBotVersionUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (serviceVer) {
      const { serviceVer: _, ...valuesOmitServiceVer } = values as ServiceBotVersionUpdateDatas;
      updateServiceBotVersion({ params: { serviceId, serviceVer }, data: valuesOmitServiceVer as ServiceBotVersionUpdateDatas });
    } else {
      createServiceBotVersion({ params: { serviceId }, data: values as ServiceBotVersionCreateDatas });
    }
  };

  const onFinishFailed: FormProps<ServiceBotVersionCreateDatas | ServiceBotVersionUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const handleDeleteBtn = () => {
    Log.debug('handleDeleteBtn');
    deleteServiceBotVersion({ params: { serviceId, serviceVer } });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={onClose}>
        취소
      </Button>
      {serviceVer && (
        <Button variant="solid" color="red" onClick={handleDeleteBtn} loading={isFetching || isUpdating || isDeleting}>
          삭제
        </Button>
      )}
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isFetching || isCreating || isUpdating || isDeleting}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={onClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <Form form={form} initialValues={{ serviceVer: '', versionName: '', versionDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
          <Row>
            <Col span={24}>
              <Form.Item name="serviceVer" label="버전" required hasFeedback rules={[{ required: true, message: '버전을 입력하세요.' }]}>
                <Input placeholder="버전을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="versionName" label="버전명" required hasFeedback rules={[{ required: true, message: '작업자를 입력하세요.' }]}>
                <Input placeholder="버전명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="versionDesc" label="변경내용">
                <TextArea rows={4} placeholder="변경 내용을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}
    </Drawer>
  );
}

export default function ServiceBotVersion() {
  const { serviceId } = useParams();
  const { gridOptions } = useAggridOptions();
  const [rowData, setRowData] = useState<ServiceBotVersionListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<ServiceBotVersionListItem | undefined>(undefined);
  const [filterColumn, setFilterColumn] = useState('version');
  const [searchValue, setSearchValue] = useState('');

  const { data: versionList, isFetching: isFetchingVersionList } = useGetServiceBotVersions({ params: { serviceId } });

  const filteredList = useMemo(() => {
    if (!versionList) return [];
    if (!searchValue.trim()) return versionList;
    const keyword = searchValue.toLowerCase();
    return versionList.filter((version) => {
      const value = version[filterColumn as keyof typeof version];
      return String(value).toLowerCase().includes(keyword);
    });
  }, [versionList, filterColumn, searchValue]);

  useEffect(() => {
    setRowData(filteredList ?? []);
  }, [filteredList]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };
  const handleClickAddVersion = () => {
    setSelectedRowData(undefined);
    setOpen(true);
  };
  const handleCloseDrawer = () => {
    setOpen(false);
  };
  const handleRowDoubleClicked = (e: RowDoubleClickedEvent<ServiceBotVersionListItem>) => {
    const selectedRowData = e.data;
    Log.debug('handleRowDoubleClicked', selectedRowData);
    setSelectedRowData(selectedRowData);
    setOpen(true);
  };
  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="version"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '버전', value: 'version' },
              { label: '버전명', value: 'versionName' },
              { label: '변경내용', value: 'versionDesc' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
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
        <AgGridReact<ServiceBotVersionListItem> {...{ rowData, columnDefs, gridOptions }} loading={isFetchingVersionList} onRowDoubleClicked={handleRowDoubleClicked} />
      </div>
      <BotVersionDrawer open={open} onClose={handleCloseDrawer} serviceId={selectedRowData?.serviceId ?? ''} serviceVer={selectedRowData?.serviceVer} />
    </div>
  );
}
