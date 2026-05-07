import { Collapse, Form, Input, Radio, Select } from 'antd';
import { useGetKnowledges } from '../../../agent-config/hooks/useKnowledgeQueries';

const PERMISSION_LEVEL_OPTIONS = [
  { label: 'ADMIN', value: '1' },
  { label: 'MANAGER', value: '2' },
  { label: 'USER', value: '3' },
  { label: 'GUEST', value: '4' },
];

const TOGGLE_OPTIONS = [
  { label: '사용안함', value: false },
  { label: '설정', value: true },
];

export default function KnowledgeSearchProperties() {
  const form = Form.useFormInstance();
  const { data: knowledges = [], isLoading } = useGetKnowledges();

  const useMetadataFilter = (Form.useWatch(['data', 'use_metadata_filter'], form) as boolean | undefined) ?? false;
  const useAccessPermission = (Form.useWatch(['data', 'use_access_permission'], form) as boolean | undefined) ?? false;

  const knowledgeOptions = knowledges.map((k) => ({
    label: k.documentName,
    value: k.documentId,
  }));

  return (
    <Collapse
      defaultActiveKey={['rag', 'metadata', 'permission', 'output']}
      ghost
      expandIconPosition="end"
      className="aoe-properties-collapse"
      items={[
        {
          key: 'basic',
          label: <span className="text-sm font-semibold text-gray-800">기본 정보</span>,
          children: (
            <>
              <Form.Item name="nodeLabel" label="노드 이름" rules={[{ max: 100, message: '100자 이내여야 합니다.' }]}>
                <Input placeholder="지식검색" />
              </Form.Item>
              <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이내여야 합니다.' }]}>
                <Input.TextArea placeholder="노드에 대한 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
            </>
          ),
        },
        {
          key: 'rag',
          label: <span className="text-sm font-semibold text-gray-800">참조할 지식 문서</span>,
          children: (
            <Form.Item name={['data', 'documentIds']} label="지식 문서" extra="검색 조건/Top K 등은 각 문서에 설정된 값을 사용합니다.">
              <Select
                mode="multiple"
                showSearch
                loading={isLoading}
                placeholder="문서를 선택하세요."
                options={knowledgeOptions}
                maxTagCount="responsive"
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          ),
        },
        {
          key: 'metadata',
          label: <span className="text-sm font-semibold text-gray-800">메타데이터 필터링</span>,
          children: (
            <>
              <Form.Item name={['data', 'use_metadata_filter']} initialValue={false}>
                <Radio.Group options={TOGGLE_OPTIONS} />
              </Form.Item>
              {useMetadataFilter && <p className="text-xs text-gray-400 -mt-2">메타데이터 필터 상세 설정은 후속 단계에서 지원 예정입니다.</p>}
            </>
          ),
        },
        {
          key: 'permission',
          label: <span className="text-sm font-semibold text-gray-800">접근권한 관리</span>,
          children: (
            <>
              <Form.Item name={['data', 'use_access_permission']} initialValue={false}>
                <Radio.Group options={TOGGLE_OPTIONS} />
              </Form.Item>
              {useAccessPermission && (
                <Form.Item name={['data', 'access_permission_level']} label="허용 권한 레벨" initialValue="1">
                  <Select options={PERMISSION_LEVEL_OPTIONS} />
                </Form.Item>
              )}
            </>
          ),
        },
        {
          key: 'output',
          label: <span className="text-sm font-semibold text-gray-800">출력</span>,
          children: (
            <Form.Item
              name={['data', 'outputVariable']}
              label="출력 변수명"
              extra="다음 노드에서 {변수명}_result 로 참조"
              rules={[{ pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '영문/숫자/언더스코어만, 숫자로 시작 불가' }]}
            >
              <Input placeholder="knowledge_result" />
            </Form.Item>
          ),
        },
      ]}
    />
  );
}
