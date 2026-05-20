import { Button, Collapse, Form, Input, Select } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import OutputVariableNotice from './OutputVariableNotice';
import type { FlowNode } from '../../types';

interface DatabaseSearchPropertiesProps {
  node: FlowNode;
}

const DB_TYPE_OPTIONS = [
  { label: 'Oracle', value: 'oracle' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MSSQL', value: 'mssql' },
];

/**
 * 데이터베이스 검색 노드 properties.
 * AS-IS 데이터 구조:
 *  - `dbConnection: { dbType, ip, port, username, password, database, isVerified }`
 *  - `query: string`
 *  - `queryParam: [{name, value}, ...]`
 *
 * 연결 검증 버튼은 BE 의 test endpoint 합의 후 후속 단계. 현재는 raw 저장만.
 */
export default function DatabaseSearchProperties({ node }: DatabaseSearchPropertiesProps) {
  return (
    <Collapse
      defaultActiveKey={['connection', 'query', 'output']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={[
        {
          key: 'connection',
          label: <span className="text-sm font-semibold text-gray-800">DB 연결 정보</span>,
          children: (
            <>
              <Form.Item name={['data', 'dbConnection', 'dbType']} label="DB 종류" initialValue="oracle" rules={[{ required: true, message: 'DB 종류를 선택해 주세요.' }]}>
                <Select options={DB_TYPE_OPTIONS} />
              </Form.Item>
              <div className="grid grid-cols-3 gap-2">
                <Form.Item name={['data', 'dbConnection', 'ip']} label="IP" className="col-span-2" rules={[{ required: true, message: 'IP 를 입력해 주세요.' }]}>
                  <Input placeholder="127.0.0.1" />
                </Form.Item>
                <Form.Item name={['data', 'dbConnection', 'port']} label="Port" rules={[{ required: true, message: 'Port 를 입력해 주세요.' }]}>
                  <Input placeholder="1521" />
                </Form.Item>
              </div>
              <Form.Item name={['data', 'dbConnection', 'database']} label="Database" rules={[{ required: true, message: 'Database 이름을 입력해 주세요.' }]}>
                <Input placeholder="ORCLPDB" />
              </Form.Item>
              <Form.Item name={['data', 'dbConnection', 'username']} label="Username" rules={[{ required: true, message: '계정을 입력해 주세요.' }]}>
                <Input placeholder="system" autoComplete="off" />
              </Form.Item>
              <Form.Item name={['data', 'dbConnection', 'password']} label="Password" rules={[{ required: true, message: '비밀번호를 입력해 주세요.' }]}>
                <Input.Password placeholder="••••••••" autoComplete="new-password" />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'query',
          label: <span className="text-sm font-semibold text-gray-800">쿼리</span>,
          children: (
            <>
              <Form.Item
                name={['data', 'query']}
                label="SQL"
                extra="파라미터는 :name 형식. 아래 파라미터 목록과 매칭됩니다."
                rules={[{ required: true, message: '실행할 쿼리를 입력해 주세요.' }]}
              >
                <Input.TextArea
                  placeholder="SELECT * FROM ... WHERE col = :name"
                  autoSize={{ minRows: 4, maxRows: 12 }}
                  style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', fontSize: 13 }}
                />
              </Form.Item>
              <Form.List name={['data', 'queryParam']}>
                {(fields, { add, remove }) => (
                  <div className="flex flex-col gap-1.5">
                    {fields.length > 0 && (
                      <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-gray-500">
                        <span className="flex-1">파라미터명</span>
                        <span className="flex-1">값</span>
                        <span className="w-6" />
                      </div>
                    )}
                    {fields.map(({ key, name, ...rest }) => (
                      <div key={key} className="flex items-start gap-2">
                        <Form.Item {...rest} name={[name, 'name']} className="flex-1 !mb-0" rules={[{ required: true, message: '필수' }]}>
                          <Input size="small" placeholder="name" />
                        </Form.Item>
                        <Form.Item {...rest} name={[name, 'value']} className="flex-1 !mb-0">
                          <Input size="small" placeholder="값 또는 {변수}" />
                        </Form.Item>
                        <Button size="small" type="text" icon={<Trash2 size={12} className="text-red-500" />} onClick={() => remove(name)} />
                      </div>
                    ))}
                    <Button block size="small" type="dashed" icon={<Plus size={12} />} onClick={() => add({ name: '', value: '' })}>
                      파라미터 추가
                    </Button>
                  </div>
                )}
              </Form.List>
            </>
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
              description="쿼리 결과 (JSON 문자열)"
            />
          ),
        },
      ]}
    />
  );
}
