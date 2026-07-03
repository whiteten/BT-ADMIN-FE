import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { Minus, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { dataProviderQueryKeys, useCreateDbTool, useDeleteDbTool, useGetDbConnectionList, useUpdateDbTool } from '../hooks/useDataProviderQueries';
import { type DbTool, type DbToolCreateDatas, type DbToolParam, PARAM_TYPE_OPTIONS } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface DbToolDrawerRef {
  open: (params?: { tool?: DbTool }) => void;
  close: () => void;
}

interface ParamRow {
  paramName: string;
  paramType: number;
  paramDescription?: string;
}

interface FormValues {
  toolName: string;
  toolDescription: string;
  dbConnId: string;
  sqlSentence: string;
  parameters?: ParamRow[];
}

const DbToolDrawer = forwardRef<DbToolDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<DbTool | null>(null);
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!tool;

  // DB 접속정보 셀렉트 옵션 — 큰 size 로 전체 조회.
  const { data: connections = [] } = useGetDbConnectionList({ params: { size: 1000 } });
  const connectionOptions = connections.map((c) => ({ label: c.connName, value: c.connId }));

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: dataProviderQueryKeys.getDbToolList({ size: 1000 }).queryKey });

  const { mutate: createTool, isPending: isCreating } = useCreateDbTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 질의도구가 생성되었습니다.');
        invalidateList();
        handleClose();
      },
      onError: (error) => Log.warn('createDbTool failed', error),
    },
  });

  const { mutate: updateTool, isPending: isUpdating } = useUpdateDbTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 질의도구가 수정되었습니다.');
        invalidateList();
        handleClose();
      },
      onError: (error) => Log.warn('updateDbTool failed', error),
    },
  });

  const { mutate: deleteTool, isPending: isDeleting } = useDeleteDbTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DB 질의도구가 삭제되었습니다.');
        invalidateList();
        handleClose();
      },
      onError: (error) => Log.warn('deleteDbTool failed', error),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => {
      const t = params?.tool ?? null;
      setTool(t);
      if (t) {
        form.setFieldsValue({
          toolName: t.toolName,
          toolDescription: t.toolDescription,
          dbConnId: t.dbConnId,
          sqlSentence: t.sqlSentence,
          parameters: (t.parameters ?? []).map((p) => ({
            paramName: p.paramName,
            paramType: p.paramType,
            paramDescription: p.paramDescription ?? undefined,
          })),
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
    setTool(null);
  };

  const onFinish = (values: FormValues) => {
    const parameters: DbToolParam[] = (values.parameters ?? []).map((p, i) => ({
      paramName: p.paramName,
      paramType: p.paramType,
      paramDescription: p.paramDescription?.trim() ? p.paramDescription.trim() : undefined,
      seq: i + 1,
    }));

    const data: DbToolCreateDatas = {
      toolName: values.toolName,
      toolDescription: values.toolDescription,
      dbConnId: values.dbConnId,
      sqlSentence: values.sqlSentence,
      parameters,
    };

    if (isEdit && tool) {
      updateTool({ params: { toolId: tool.toolId }, data });
    } else {
      createTool(data);
    }
  };

  const onFinishFailed = () => {
    toast.error('입력값을 확인해 주세요.');
  };

  const handleDelete = () => {
    if (!tool) return;
    modal.confirm.delete({
      onOk: () => deleteTool({ toolId: tool.toolId }),
    });
  };

  return (
    <Drawer
      title={isEdit ? 'DB 질의도구 수정' : 'DB 질의도구 등록'}
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 640 } }}
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
        <Form.Item name="toolName" label="도구명" required rules={[{ required: true, message: '도구명을 입력해 주세요.' }]}>
          <Input placeholder="도구명을 입력하세요." />
        </Form.Item>
        <Form.Item name="dbConnId" label="DB 접속정보" required rules={[{ required: true, message: 'DB 접속정보를 선택해 주세요.' }]}>
          <Select options={connectionOptions} placeholder="DB 접속정보를 선택하세요." showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item name="toolDescription" label="설명" required rules={[{ required: true, message: '설명을 입력해 주세요.' }]}>
          <Input.TextArea placeholder="도구에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
        </Form.Item>
        <Form.Item
          name="sqlSentence"
          label="SQL 질의문"
          required
          rules={[{ required: true, message: 'SQL 질의문을 입력해 주세요.' }]}
          extra="예: select * from t where name like %CustName%"
        >
          <Input.TextArea placeholder="SQL 질의문을 입력하세요." autoSize={{ minRows: 4, maxRows: 8 }} />
        </Form.Item>

        {/* 파라미터 (반복) */}
        <Form.List name="parameters">
          {(fields, { add, remove }) => (
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">파라미터</span>
                <Button size="small" icon={<Plus className="size-3" />} onClick={() => add({ paramType: PARAM_TYPE_OPTIONS[0].value })}>
                  추가
                </Button>
              </div>
              {fields.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-200 rounded-lg">파라미터가 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <Form.Item noStyle {...restField} name={[name, 'paramName']} rules={[{ required: true, message: '파라미터명 필수' }]}>
                          <Input placeholder="파라미터명" size="small" className="flex-1" />
                        </Form.Item>
                        <Form.Item noStyle {...restField} name={[name, 'paramType']} rules={[{ required: true, message: '타입 필수' }]}>
                          <Select size="small" style={{ width: 120 }} options={PARAM_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))} placeholder="타입" />
                        </Form.Item>
                        <Button size="small" variant="text" color="danger" icon={<Minus className="size-3" />} onClick={() => remove(name)} />
                      </div>
                      <Form.Item noStyle {...restField} name={[name, 'paramDescription']}>
                        <Input.TextArea placeholder="파라미터 설명 (선택)" size="small" autoSize={{ minRows: 1, maxRows: 3 }} />
                      </Form.Item>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
});

DbToolDrawer.displayName = 'DbToolDrawer';
export default DbToolDrawer;
