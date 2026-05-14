import { Empty, Select, Tag } from 'antd';
import { useGetDatasourceList } from '../../../../features/stat/hooks/useStatQueries';

interface Props {
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
}

export default function StepDataSource({ selectedKeys, onSelectedKeysChange }: Props) {
  const { data: datasources = [], isLoading } = useGetDatasourceList({});
  const selectedKey = selectedKeys[0] ?? undefined;
  const selectedDs = datasources.find((ds) => ds.datasourceKey === selectedKey);

  const options = datasources.map((ds) => ({
    value: ds.datasourceKey,
    label: `[${ds.productCode}] ${ds.datasourceName}`,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold mb-1">데이터소스 선택</h3>
        <p className="text-[12px] text-gray-500 mb-3">섹션에서 사용할 VIEW 데이터소스를 하나 선택하세요.</p>
        {!isLoading && datasources.length === 0 ? (
          <Empty description="등록된 데이터소스가 없습니다" />
        ) : (
          <Select
            showSearch
            allowClear
            loading={isLoading}
            placeholder="이름 또는 키로 검색..."
            value={selectedKey}
            onChange={(val) => onSelectedKeysChange(val ? [val] : [])}
            options={options}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) || (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            style={{ width: '100%' }}
            notFoundContent={<Empty description="검색 결과 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          />
        )}
      </div>
      {selectedDs && (
        <div className="rounded border border-blue-200 bg-blue-50/50 p-3 text-[12px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{selectedDs.datasourceName}</span>
            <Tag color="blue" className="text-[10px]">
              VIEW
            </Tag>
          </div>
          <div className="font-mono text-gray-500">{selectedDs.datasourceKey}</div>
          {selectedDs.availableUnits?.length > 0 && <div className="mt-1 text-gray-400">{selectedDs.availableUnits.join(' / ')}</div>}
          <div className="mt-1 text-gray-400">[{selectedDs.productCode}]</div>
        </div>
      )}
    </div>
  );
}
