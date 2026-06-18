import { Collapse, Form, Input, Radio, Select } from 'antd';
import { useAuthStore } from '@/shared-store';
import OutputVariableNotice from './OutputVariableNotice';
import { useGetKnowledges } from '../../../agent-config/hooks/useKnowledgeQueries';
import type { KnowledgeListItem } from '../../../agent-config/types';
import type { FlowNode } from '../../types';

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

interface RagConfigFilter {
  id?: string;
  metadataId?: string;
  field: string;
  dtype: 'string' | 'number' | 'time';
  op: string;
  value: string;
}

interface RagConfigItem {
  tenantId: string;
  collection: string;
  documentId: string;
  documentName: string;
  topK: number;
  logic: string;
  filters: RagConfigFilter[];
}

interface RagConfigSelectProps {
  value?: RagConfigItem[];
  onChange?: (value: RagConfigItem[]) => void;
  knowledges: KnowledgeListItem[];
  isLoading?: boolean;
  tenantId: string;
}

/**
 * rag_config 배열을 Select(multi) UI 로 노출하는 controlled 컴포넌트.
 * - 선택된 documentId 들의 multi select 로 그리되, 실제 form value 는 RagConfigItem[]
 * - 새로 추가되는 item 은 knowledge list 응답의 tenantId/collection/topK 로 채우고 fallback 적용
 * - 이미 선택돼 있던 item 은 기존 row 보존 (topK/logic/filters 등 사용자 편집값 유지)
 */
const RagConfigSelect = ({ value, onChange, knowledges, isLoading, tenantId }: RagConfigSelectProps) => {
  const rows = value ?? [];
  const selectedIds = rows.map((r) => r.documentId);

  // 목록(knowledges) 로딩 전에는 options 가 비어 antd Select 가 선택값(ID)을 그대로 라벨로 노출한다.
  // 노드에 이미 저장된 documentName 으로 폴백 옵션을 만들어 ID 플래시 없이 즉시 이름을 표시한다. (A2AProperties 패턴)
  const baseOptions = knowledges.map((k) => ({ label: k.documentName, value: k.documentId }));
  const fallbackOptions = rows.filter((r) => !knowledges.some((k) => k.documentId === r.documentId)).map((r) => ({ label: r.documentName || r.documentId, value: r.documentId }));
  const options = [...fallbackOptions, ...baseOptions];

  const handleChange = (ids: string[]) => {
    const next: RagConfigItem[] = ids.map((id) => {
      const existing = rows.find((r) => r.documentId === id);
      if (existing) return existing;
      const k = knowledges.find((kn) => kn.documentId === id);
      return {
        tenantId,
        collection: k?.option?.collection ?? '',
        documentId: id,
        documentName: k?.documentName ?? '',
        topK: k?.option?.topK ?? 3,
        logic: 'AND',
        filters: [],
      };
    });
    onChange?.(next);
  };

  return (
    <Select
      mode="multiple"
      showSearch
      loading={isLoading}
      placeholder="문서를 선택하세요."
      value={selectedIds}
      onChange={handleChange}
      options={options}
      maxTagCount="responsive"
      filterOption={(input, option) =>
        String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
    />
  );
};

interface KnowledgeSearchPropertiesProps {
  node: FlowNode;
}

export default function KnowledgeSearchProperties({ node }: KnowledgeSearchPropertiesProps) {
  const form = Form.useFormInstance();
  // 패널을 다시 열거나 노드를 옮겨다닐 때마다 재요청하지 않도록 캐싱(5분).
  const { data: knowledges = [], isLoading } = useGetKnowledges({
    queryOptions: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  });
  const userInfo = useAuthStore((s) => s.userInfo);
  const tenantId = userInfo?.tenant ?? '';

  const useMetadataFilter = (Form.useWatch(['data', 'use_metadata_filter'], form) as boolean | undefined) ?? false;
  const useAccessPermission = (Form.useWatch(['data', 'use_access_permission'], form) as boolean | undefined) ?? false;

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
            <Form.Item name={['data', 'rag_config']} label="지식 문서" extra="검색 조건/Top K 등은 각 문서에 설정된 값을 사용합니다.">
              <RagConfigSelect knowledges={knowledges} isLoading={isLoading} tenantId={tenantId} />
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
            <OutputVariableNotice
              nodeId={node.nodeId}
              nodeLabel={node.nodeLabel}
              nodeKind={node.nodeKind}
              outputVariable={node.data?.output_variable as string | undefined}
              dataType="string"
              description="검색된 지식"
            />
          ),
        },
      ]}
    />
  );
}
