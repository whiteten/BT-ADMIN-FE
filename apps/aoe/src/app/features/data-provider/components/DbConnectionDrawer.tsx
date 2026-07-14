import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, InputNumber, Select, Switch } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { dataProviderQueryKeys, useCreateDbConnection, useDeleteDbConnection, useGetDbToolList, useUpdateDbConnection } from '../hooks/useDataProviderQueries';
import { ACCESS_TYPE_OPTIONS, ACTIVE_YN, DBMS_TYPE_OPTIONS, type DbConnection, type DbConnectionCreateDatas } from '../types';
import { getDbConnectionDeleteConfirmOptions } from '../utils/dbConnectionDeleteConfirm';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface DbConnectionDrawerRef {
  open: (params?: { connection?: DbConnection }) => void;
  close: () => void;
}

interface FormValues {
  connName: string;
  dbmsType: number;
  ipaddr1: string;
  ipaddr2?: string;
  port: number;
  accessType: number;
  dataSource: string;
  userId: string;
  userPasswd?: string;
  activeYn: boolean;
}

const DbConnectionDrawer = forwardRef<DbConnectionDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const [open, setOpen] = useState(false);
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!connection;

  // 삭제 확인 시 이 접속정보를 참조하는 질의도구 건수 안내용. DbToolTab 과 동일 params 로 캐시 공유.
  const { data: dbTools = [] } = useGetDbToolList({ params: { size: 1000 }, queryOptions: { enabled: open && isEdit } });

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbConnectionList().queryKey });

  const { mutate: createConnection, isPending: isCreating } = useCreateDbConnection({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 접속정보가 생성되었습니다.');
        invalidateList();
        handleClose();
      },
      onError: (error) => Log.warn('createDbConnection failed', error),
    },
  });

  const { mutate: updateConnection, isPending: isUpdating } = useUpdateDbConnection({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 접속정보가 수정되었습니다.');
        invalidateList();
        handleClose();
      },
      onError: (error) => Log.warn('updateDbConnection failed', error),
    },
  });

  const { mutate: deleteConnection, isPending: isDeleting } = useDeleteDbConnection({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 접속정보가 삭제되었습니다.');
        invalidateList();
        // BE가 참조 중인 질의도구를 연쇄 삭제하므로 도구 목록도 갱신 (DbToolTab/DbToolDrawer 와 동일 params 키)
        queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('deleteDbConnection failed', error),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => {
      const conn = params?.connection ?? null;
      setConnection(conn);
      if (conn) {
        form.setFieldsValue({
          connName: conn.connName,
          dbmsType: conn.dbmsType,
          ipaddr1: conn.ipaddr1,
          ipaddr2: conn.ipaddr2 ?? undefined,
          port: conn.port,
          accessType: conn.accessType,
          dataSource: conn.dataSource,
          userId: conn.userId,
          // 비밀번호는 서버가 항상 null 로 내려주므로 폼에 채우지 않는다.
          userPasswd: undefined,
          activeYn: (conn.activeYn ?? ACTIVE_YN.ACTIVE) === ACTIVE_YN.ACTIVE,
        });
      } else {
        form.resetFields();
      }
      setOpen(true);
    },
    close: handleClose,
  }));

  const handleClose = () => {
    setOpen(false);
    form.resetFields();
    setConnection(null);
  };

  const onFinish = (values: FormValues) => {
    const data: DbConnectionCreateDatas = {
      connName: values.connName,
      dbmsType: values.dbmsType,
      ipaddr1: values.ipaddr1,
      ipaddr2: values.ipaddr2?.trim() ? values.ipaddr2.trim() : undefined,
      port: values.port,
      accessType: values.accessType,
      dataSource: values.dataSource,
      userId: values.userId,
      // 수정 시 비밀번호를 비우면 기존 값 유지 → 빈 값은 전송하지 않는다.
      userPasswd: values.userPasswd?.trim() ? values.userPasswd.trim() : undefined,
      activeYn: values.activeYn ? ACTIVE_YN.ACTIVE : ACTIVE_YN.INACTIVE,
    };

    if (isEdit && connection) {
      updateConnection({ params: { connId: connection.connId }, data });
    } else {
      createConnection(data);
    }
  };

  const onFinishFailed = () => {
    toast.error('입력값을 확인해 주세요.');
  };

  const handleDelete = () => {
    if (!connection) return;
    const usedCount = dbTools.filter((tool) => tool.dbConnId === connection.connId).length;
    modal.confirm.delete({
      options: getDbConnectionDeleteConfirmOptions(usedCount),
      onOk: () => deleteConnection({ connId: connection.connId }),
    });
  };

  return (
    <Drawer
      title={isEdit ? 'DB 접속정보 수정' : 'DB 접속정보 등록'}
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 560 } }}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-between">
          {isEdit && (
            <Button color="danger" variant="solid" loading={isDeleting} onClick={handleDelete}>
              삭제
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" loading={isCreating || isUpdating} onClick={() => form.submit()}>
              저장
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <Form.Item name="connName" label="접속명" required rules={[{ required: true, message: '접속명을 입력해 주세요.' }]}>
          <Input placeholder="접속명을 입력하세요." />
        </Form.Item>
        <Form.Item name="dbmsType" label="DBMS 종류" required rules={[{ required: true, message: 'DBMS 종류를 선택해 주세요.' }]}>
          <Select options={DBMS_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))} placeholder="선택" />
        </Form.Item>
        <div className="flex gap-3">
          <Form.Item name="ipaddr1" label="Primary IP" required rules={[{ required: true, message: 'Primary IP를 입력해 주세요.' }]} className="flex-1">
            <Input placeholder="예: 192.168.0.1" />
          </Form.Item>
          <Form.Item name="port" label="포트" required rules={[{ required: true, message: '포트를 입력해 주세요.' }]} style={{ width: 140 }}>
            <InputNumber placeholder="1521" min={1} max={65535} className="w-full" />
          </Form.Item>
        </div>
        <Form.Item name="ipaddr2" label="Secondary IP">
          <Input placeholder="예: 192.168.0.2 (선택)" />
        </Form.Item>
        <div className="flex gap-3">
          <Form.Item name="accessType" label="접속 방식" required rules={[{ required: true, message: '접속 방식을 선택해 주세요.' }]} style={{ width: 180 }}>
            <Select options={ACCESS_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))} placeholder="선택" />
          </Form.Item>
          <Form.Item name="dataSource" label="Data Source" required rules={[{ required: true, message: 'Data Source를 입력해 주세요.' }]} className="flex-1">
            <Input placeholder="SID 또는 Service Name" />
          </Form.Item>
        </div>
        <Form.Item name="userId" label="접속 계정" required rules={[{ required: true, message: '접속 계정을 입력해 주세요.' }]}>
          <Input placeholder="접속 계정을 입력하세요." autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="userPasswd"
          label="비밀번호"
          required={!isEdit}
          rules={isEdit ? [] : [{ required: true, message: '비밀번호를 입력해 주세요.' }]}
          extra={isEdit ? '변경 시에만 입력하세요. 비워두면 기존 비밀번호가 유지됩니다.' : undefined}
        >
          <Input.Password placeholder={isEdit ? '변경 시에만 입력' : '비밀번호를 입력하세요.'} autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="activeYn" label="활성 여부" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="활성" unCheckedChildren="비활성" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

DbConnectionDrawer.displayName = 'DbConnectionDrawer';
export default DbConnectionDrawer;
