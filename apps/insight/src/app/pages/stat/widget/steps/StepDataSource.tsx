import { Checkbox, Empty, Tag } from 'antd';
import { useGetDatasourceList } from '../../../../features/stat/hooks/useStatQueries';

interface Props {
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
}

export default function StepDataSource({ selectedKeys, onSelectedKeysChange }: Props) {
  const { data: datasources = [], isLoading } = useGetDatasourceList({});

  const selectDatasource = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectedKeysChange([]);
    } else {
      onSelectedKeysChange([key]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-1">데이터소스 선택</h3>
        <p className="text-sm text-gray-500 mb-4">섹션에서 사용할 VIEW 데이터소스를 하나 선택하세요.</p>
        {isLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : datasources.length === 0 ? (
          <Empty description="등록된 데이터소스가 없습니다" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {datasources.map((ds) => {
              const isSelected = selectedKeys.includes(ds.datasourceKey);
              return (
                <div
                  key={ds.datasourceKey}
                  className={`cursor-pointer rounded border p-3 transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-400'}`}
                  onClick={() => selectDatasource(ds.datasourceKey)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ds.datasourceName}</span>
                        <Tag color="blue" className="text-xs">
                          VIEW
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">{ds.datasourceKey}</div>
                      {ds.availableUnits?.length > 0 && <div className="text-xs text-gray-400 mt-1">{ds.availableUnits.join(' / ')}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        [{ds.productCode}] {ds.fields?.length || 0}개 필드
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2 text-sm text-gray-500">{selectedKeys.length > 0 ? `선택됨: ${selectedKeys[0]}` : '선택 없음'}</div>
      </div>
    </div>
  );
}
