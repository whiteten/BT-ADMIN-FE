import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { Minus, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { toolQueryKeys, useCreateTool, useDeleteTool, useUpdateTool } from '../hooks/useToolQueries';
import type { ToolCreateDatas, ToolItem } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface ToolDrawerRef {
  open: (params: { groupId: string; tool?: ToolItem }) => void;
  close: () => void;
}

interface DrawerState {
  groupId: string;
  tool: ToolItem | null;
}

interface ParamRow {
  paramName: string;
  paramType: string;
  paramIn: 'body' | 'path';
}

interface FormValues {
  toolName: string;
  toolUrl: string;
  method: string;
  description?: string;
  headers?: string;
  parameters?: ParamRow[];
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const PARAM_TYPES = ['str', 'int', 'bool', 'date'];
const DEFAULT_POST_HEADERS = '{"Content-Type":"application/json; charset=utf-8","Authorization":"Bearer token"}';

const PARAM_IN_OPTIONS = [
  { label: 'Body', value: 'body' },
  { label: 'Path', value: 'path' },
];

const ToolDrawer = forwardRef<ToolDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const [open, setOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<DrawerState>({ groupId: '', tool: null });
  const [descExpanded, setDescExpanded] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!drawerState.tool;

  const { mutate: createTool, isPending: isCreating } = useCreateTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('도구가 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getTools({ groupId: drawerState.groupId }).queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('createTool failed', error),
    },
  });

  const { mutate: updateTool, isPending: isUpdating } = useUpdateTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('도구가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getTools({ groupId: drawerState.groupId }).queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('updateTool failed', error),
    },
  });

  const { mutate: deleteTool, isPending: isDeleting } = useDeleteTool({
    mutationOptions: {
      onSuccess: () => {
        toast.success('도구가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getTools({ groupId: drawerState.groupId }).queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('deleteTool failed', error),
    },
  });

  useImperativeHandle(ref, () => ({
    open: ({ groupId, tool }) => {
      setDrawerState({ groupId, tool: tool ?? null });
      if (tool) {
        const mergedParams: ParamRow[] = [
          ...(tool.parameters ?? []).map((p) => ({ paramName: p.paramName, paramType: p.paramType, paramIn: 'body' as const })),
          ...(tool.pathParams ?? []).map((p) => ({ paramName: p.paramName, paramType: p.paramType, paramIn: 'path' as const })),
        ];
        form.setFieldsValue({
          toolName: tool.toolName,
          toolUrl: tool.toolUrl,
          method: tool.method,
          description: tool.description ?? undefined,
          headers: tool.headers,
          parameters: mergedParams,
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
    setDrawerState({ groupId: '', tool: null });
    setDescExpanded(false);
  };

  const onValuesChange = (changedValues: Partial<FormValues>) => {
    if ('method' in changedValues && changedValues.method === 'POST') {
      const currentHeaders = form.getFieldValue('headers') as string | undefined;
      if (!currentHeaders?.trim()) {
        form.setFieldValue('headers', DEFAULT_POST_HEADERS);
      }
    }
  };

  const onFinish = (values: FormValues) => {
    let headersStr = values.headers?.trim() ?? '{}';
    try {
      JSON.parse(headersStr);
    } catch {
      headersStr = '{}';
    }

    const allParams = values.parameters ?? [];
    const data: ToolCreateDatas = {
      toolName: values.toolName,
      toolUrl: values.toolUrl,
      method: values.method,
      description: values.description,
      headers: headersStr,
      parameters: allParams.filter((p) => p.paramIn === 'body').map((p, i) => ({ paramName: p.paramName, paramType: p.paramType, paramIn: 'body', seq: i + 1 })),
      pathParams: allParams.filter((p) => p.paramIn === 'path').map((p, i) => ({ paramName: p.paramName, paramType: p.paramType, seq: i + 1 })),
      groupId: drawerState.groupId,
    };

    if (isEdit && drawerState.tool) {
      updateTool({ params: { toolId: drawerState.tool.toolId }, data });
    } else {
      createTool(data);
    }
  };

  const handleDelete = () => {
    const tool = drawerState.tool;
    if (!tool) return;
    modal.confirm.delete({
      onOk: () => deleteTool({ toolId: tool.toolId }),
    });
  };

  return (
    <Drawer
      title={isEdit ? '도구 수정' : '도구 생성'}
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
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onValuesChange}>
        <Form.Item name="toolName" label="도구명" required rules={[{ required: true, message: '도구명을 입력해 주세요.' }]}>
          <Input placeholder="도구명을 입력하세요." />
        </Form.Item>
        <div className="flex gap-3">
          <Form.Item name="method" label="Method" required rules={[{ required: true, message: 'Method를 선택해 주세요.' }]} style={{ width: 120 }}>
            <Select options={HTTP_METHODS.map((m) => ({ label: m, value: m }))} placeholder="선택" />
          </Form.Item>
          <Form.Item name="toolUrl" label="URL" required rules={[{ required: true, message: 'URL을 입력해 주세요.' }]} className="flex-1">
            <Input placeholder="https://api.example.com/endpoint" />
          </Form.Item>
        </div>
        <Form.Item
          name="description"
          label={
            <div className="flex items-center gap-2">
              <span>설명</span>
              <button type="button" className="text-xs text-blue-500 hover:text-blue-700" onClick={() => setDescExpanded((v) => !v)}>
                {descExpanded ? '접기' : '전체보기'}
              </button>
            </div>
          }
        >
          <Input.TextArea placeholder="도구에 대한 설명을 입력하세요." autoSize={descExpanded ? { minRows: 3 } : { minRows: 3, maxRows: 5 }} />
        </Form.Item>
        <Form.Item name="headers" label="Headers (JSON)" extra={`예: ${DEFAULT_POST_HEADERS}`}>
          <Input.TextArea placeholder={DEFAULT_POST_HEADERS} autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>

        {/* 파라미터 */}
        <Form.List name="parameters">
          {(fields, { add, remove }) => (
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">파라미터</span>
                <Button size="small" icon={<Plus className="size-3" />} onClick={() => add({ paramType: 'str', paramIn: 'body' })}>
                  추가
                </Button>
              </div>
              {fields.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-200 rounded-lg">파라미터가 없습니다.</p>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 bg-gray-100 border-b border-gray-200" style={{ height: 32 }}>
                    <span className="flex-1 text-xs font-medium text-gray-500">파라미터명</span>
                    <span className="text-xs font-medium text-gray-500" style={{ width: 80 }}>
                      타입
                    </span>
                    <span className="text-xs font-medium text-gray-500" style={{ width: 108 }}>
                      위치
                    </span>
                    <span style={{ width: 24 }} />
                  </div>
                  <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 260 }}>
                    {fields.map(({ key, name, ...restField }) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 px-3 border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50 transition-colors"
                        style={{ height: 36 }}
                      >
                        <div className="flex-1 flex items-center">
                          <Form.Item noStyle {...restField} name={[name, 'paramName']} rules={[{ required: true, message: '이름 필수' }]}>
                            <Input placeholder="파라미터명" size="small" variant="borderless" className="w-full" />
                          </Form.Item>
                        </div>
                        <div className="flex items-center" style={{ width: 80 }}>
                          <Form.Item noStyle {...restField} name={[name, 'paramType']}>
                            <Select size="small" variant="borderless" style={{ width: 80 }} options={PARAM_TYPES.map((t) => ({ label: t, value: t }))} />
                          </Form.Item>
                        </div>
                        <div className="flex items-center" style={{ width: 108 }}>
                          <Form.Item noStyle {...restField} name={[name, 'paramIn']}>
                            <Select size="small" variant="borderless" style={{ width: 108 }} options={PARAM_IN_OPTIONS} />
                          </Form.Item>
                        </div>
                        <Button size="small" variant="text" color="danger" icon={<Minus className="size-3" />} onClick={() => remove(name)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
});

ToolDrawer.displayName = 'ToolDrawer';
export default ToolDrawer;
