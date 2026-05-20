import { Button, Collapse, Form, Input, InputNumber, Radio, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import OutputVariableNotice from './OutputVariableNotice';
import type { FlowNode } from '../../types';

interface HttpPropertiesProps {
  node: FlowNode;
}

const METHOD_OPTIONS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

const BODY_MODE_OPTIONS = [
  { label: 'none', value: 'none' },
  { label: 'JSON', value: 'json' },
  { label: 'Raw', value: 'raw' },
];

const AUTH_TYPE_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Basic', value: 'basic' },
  { label: 'Bearer', value: 'bearer' },
  { label: 'Custom Header', value: 'custom' },
];

interface KvRowFieldProps {
  listName: string;
}

/** name/value 페어 리스트 (queryParams / headers 공용) */
const KvList = ({ listName }: KvRowFieldProps) => (
  <Form.List name={['data', 'httpConfig', listName]}>
    {(fields, { add, remove }) => (
      <div className="flex flex-col gap-1.5">
        {fields.length > 0 && (
          <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-gray-500">
            <span className="flex-1">name</span>
            <span className="flex-1">value</span>
            <span className="w-6" />
          </div>
        )}
        {fields.map(({ key, name, ...rest }) => (
          <div key={key} className="flex items-start gap-2">
            <Form.Item {...rest} name={[name, 'name']} className="flex-1 !mb-0" rules={[{ required: true, message: '필수' }]}>
              <Input size="small" placeholder="name" />
            </Form.Item>
            <Form.Item {...rest} name={[name, 'value']} className="flex-1 !mb-0">
              <Input size="small" placeholder="value 또는 {변수}" />
            </Form.Item>
            <Button size="small" type="text" icon={<Trash2 size={12} className="text-red-500" />} onClick={() => remove(name)} />
          </div>
        ))}
        <Button block size="small" type="dashed" icon={<Plus size={12} />} onClick={() => add({ name: '', value: '' })}>
          추가
        </Button>
      </div>
    )}
  </Form.List>
);

/**
 * HTTP 요청 노드 properties.
 * AS-IS 데이터 구조 (핵심 필드):
 *  - `httpConfig.method`, `httpConfig.baseUrl`, `httpConfig.path`
 *  - `httpConfig.queryParams: [{name, value}]`, `httpConfig.headers: [{name, value}]`
 *  - `httpConfig.body: { mode: 'none'|'json'|'raw', json: object, raw: string }`
 *  - `httpConfig.auth: { type, username, password, token, customHeader }`
 *  - `httpConfig.timeoutMs: number`
 *
 * retry/form-body 등 옵션은 후속 단계.
 */
export default function HttpProperties({ node }: HttpPropertiesProps) {
  const form = Form.useFormInstance();
  const bodyMode = (Form.useWatch(['data', 'httpConfig', 'body', 'mode'], form) as string | undefined) ?? 'none';
  const authType = (Form.useWatch(['data', 'httpConfig', 'auth', 'type'], form) as string | undefined) ?? 'none';

  return (
    <Collapse
      defaultActiveKey={['request', 'headers', 'body', 'auth', 'advanced', 'output']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={[
        {
          key: 'request',
          label: <span className="text-sm font-semibold text-gray-800">요청</span>,
          children: (
            <>
              <div className="grid grid-cols-4 gap-2">
                <Form.Item name={['data', 'httpConfig', 'method']} label="Method" initialValue="GET" rules={[{ required: true }]}>
                  <Select options={METHOD_OPTIONS} />
                </Form.Item>
                <Form.Item name={['data', 'httpConfig', 'baseUrl']} label="Base URL" className="col-span-3" rules={[{ required: true, message: 'Base URL 을 입력해 주세요.' }]}>
                  <Input placeholder="https://api.example.com" />
                </Form.Item>
              </div>
              <Form.Item name={['data', 'httpConfig', 'path']} label="Path" extra="변수 사용 시 {변수} 형식">
                <Input placeholder="/v1/users/{userId}" />
              </Form.Item>
              <Form.Item label="Query Params" className="!mb-0">
                <KvList listName="queryParams" />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'headers',
          label: <span className="text-sm font-semibold text-gray-800">Headers</span>,
          children: <KvList listName="headers" />,
        },
        {
          key: 'body',
          label: <span className="text-sm font-semibold text-gray-800">Body</span>,
          children: (
            <>
              <Form.Item name={['data', 'httpConfig', 'body', 'mode']} initialValue="none">
                <Radio.Group options={BODY_MODE_OPTIONS} />
              </Form.Item>
              {bodyMode === 'json' && (
                <Form.Item name={['data', 'httpConfig', 'body', 'raw']} label="JSON 본문" extra="유효한 JSON 형식으로 입력 (변수: {변수})">
                  <Input.TextArea
                    placeholder='{ "key": "{userInput_result}" }'
                    autoSize={{ minRows: 4, maxRows: 14 }}
                    style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', fontSize: 13 }}
                  />
                </Form.Item>
              )}
              {bodyMode === 'raw' && (
                <Form.Item name={['data', 'httpConfig', 'body', 'raw']} label="Raw 본문">
                  <Input.TextArea
                    placeholder="raw text"
                    autoSize={{ minRows: 4, maxRows: 14 }}
                    style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', fontSize: 13 }}
                  />
                </Form.Item>
              )}
            </>
          ),
        },
        {
          key: 'auth',
          label: <span className="text-sm font-semibold text-gray-800">인증</span>,
          children: (
            <>
              <Form.Item name={['data', 'httpConfig', 'auth', 'type']} initialValue="none">
                <Radio.Group options={AUTH_TYPE_OPTIONS} />
              </Form.Item>
              {authType === 'basic' && (
                <>
                  <Form.Item name={['data', 'httpConfig', 'auth', 'username']} label="Username">
                    <Input placeholder="user" autoComplete="off" />
                  </Form.Item>
                  <Form.Item name={['data', 'httpConfig', 'auth', 'password']} label="Password">
                    <Input.Password placeholder="••••••••" autoComplete="new-password" />
                  </Form.Item>
                </>
              )}
              {authType === 'bearer' && (
                <Form.Item name={['data', 'httpConfig', 'auth', 'token']} label="Token">
                  <Input.Password placeholder="Bearer 토큰" autoComplete="off" />
                </Form.Item>
              )}
              {authType === 'custom' && (
                <Form.Item name={['data', 'httpConfig', 'auth', 'customHeader']} label="Custom Header" extra="예: X-API-Key: {token}">
                  <Input placeholder="Header-Name: value" />
                </Form.Item>
              )}
            </>
          ),
        },
        {
          key: 'advanced',
          label: <span className="text-sm font-semibold text-gray-800">고급</span>,
          children: (
            <Form.Item name={['data', 'httpConfig', 'timeoutMs']} label="Timeout (ms)" initialValue={5000}>
              <InputNumber min={100} max={120000} step={500} className="!w-full" />
            </Form.Item>
          ),
        },
        {
          key: 'output',
          label: <span className="text-sm font-semibold text-gray-800">출력</span>,
          children: (
            <OutputVariableNotice
              nodeId={node.nodeId}
              nodeLabel={node.nodeLabel}
              nodeKind={node.nodeKind}
              outputVariable={node.data?.output_variable as string | undefined}
              dataType="string"
              description="응답 본문 (string)"
            />
          ),
        },
      ]}
    />
  );
}
