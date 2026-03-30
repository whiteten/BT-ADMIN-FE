import { Button, Card, Checkbox, Empty, Select, Tag } from 'antd';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { useGetDatasourceList } from '../../../features/datasource/hooks/useDatasourceQueries';

interface JoinCondition {
  leftDatasourceKey: string;
  leftFieldName: string;
  rightDatasourceKey: string;
  rightFieldName: string;
  joinType: string;
  sortOrder: number;
}

interface Props {
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  joinConditions: JoinCondition[];
  onJoinConditionsChange: (joins: JoinCondition[]) => void;
}

export default function StepDataSource({ selectedKeys, onSelectedKeysChange, joinConditions, onJoinConditionsChange }: Props) {
  const { data: datasources = [], isLoading } = useGetDatasourceList({});

  const toggleSelect = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectedKeysChange(selectedKeys.filter((k) => k !== key));
      // 관련 조인 조건도 제거
      onJoinConditionsChange(joinConditions.filter((j) => j.leftDatasourceKey !== key && j.rightDatasourceKey !== key));
    } else {
      onSelectedKeysChange([...selectedKeys, key]);
    }
  };

  const selectedDatasources = datasources.filter((ds) => selectedKeys.includes(ds.datasourceKey));

  const addJoinCondition = (leftKey: string, rightKey: string) => {
    onJoinConditionsChange([
      ...joinConditions,
      {
        leftDatasourceKey: leftKey,
        leftFieldName: '',
        rightDatasourceKey: rightKey,
        rightFieldName: '',
        joinType: 'INNER',
        sortOrder: joinConditions.length,
      },
    ]);
  };

  const updateJoin = (index: number, field: keyof JoinCondition, value: string) => {
    const updated = [...joinConditions];
    updated[index] = { ...updated[index], [field]: value };
    onJoinConditionsChange(updated);
  };

  const removeJoin = (index: number) => {
    onJoinConditionsChange(joinConditions.filter((_, i) => i !== index));
  };

  // 선택된 데이터소스의 필드 목록 (조인 키 선택용)
  const getFieldOptions = (dsKey: string) => {
    const ds = datasources.find((d) => d.datasourceKey === dsKey);
    return ds?.fields?.map((f) => ({ value: f.fieldName, label: `${f.fieldName} (${f.displayName})` })) || [];
  };

  return (
    <div className="space-y-6">
      {/* 데이터소스 선택 */}
      <div>
        <h3 className="text-base font-medium mb-2">데이터소스 선택</h3>
        <p className="text-sm text-gray-500 mb-4">위젯에서 사용할 데이터소스를 선택하세요. 여러 개를 선택하면 조인 설정이 필요합니다.</p>

        {isLoading ? (
          <p className="text-gray-400">로딩 중...</p>
        ) : datasources.length === 0 ? (
          <Empty description="등록된 데이터소스가 없습니다" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {datasources.map((ds) => {
              const isSelected = selectedKeys.includes(ds.datasourceKey);
              return (
                <Card
                  key={ds.datasourceKey}
                  size="small"
                  className={`cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'hover:border-gray-400'}`}
                  onClick={() => toggleSelect(ds.datasourceKey)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ds.datasourceName}</span>
                        <Tag color={ds.sourceType === 'DB' ? 'blue' : 'red'} className="text-xs">
                          {ds.sourceType}
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-1">{ds.datasourceKey}</div>
                      {ds.dbTimeUnits && <div className="text-xs text-gray-400 mt-1">{ds.dbTimeUnits}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        [{ds.productCode}] {ds.fields?.length || 0}개 필드
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-2 text-sm text-gray-500">선택됨: {selectedKeys.length}개</div>
      </div>

      {/* 조인 설정 (2개 이상 선택 시) */}
      {selectedKeys.length >= 2 && (
        <div>
          <h3 className="text-base font-medium mb-2 flex items-center gap-2">
            <Link2 size={16} />
            데이터소스 조인 설정
          </h3>
          <p className="text-sm text-gray-500 mb-4">선택한 데이터소스 간의 조인 조건을 설정합니다. 소스 타입(DB/Redis)에 관계없이 모든 조합이 가능합니다.</p>

          {joinConditions.length === 0 && selectedKeys.length >= 2 && (
            <div className="mb-3">
              <Button size="small" icon={<Plus size={14} />} onClick={() => addJoinCondition(selectedKeys[0], selectedKeys[1])}>
                조인 조건 추가
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {joinConditions.map((join, idx) => (
              <Card key={idx} size="small" className="border-l-4 border-l-blue-500">
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 items-center">
                    <Select
                      size="small"
                      value={join.leftDatasourceKey}
                      onChange={(v) => updateJoin(idx, 'leftDatasourceKey', v)}
                      options={selectedDatasources.map((ds) => ({ value: ds.datasourceKey, label: ds.datasourceName }))}
                      placeholder="왼쪽 데이터소스"
                    />
                    <Select
                      size="small"
                      value={join.leftFieldName || undefined}
                      onChange={(v) => updateJoin(idx, 'leftFieldName', v)}
                      options={getFieldOptions(join.leftDatasourceKey)}
                      placeholder="왼쪽 필드"
                    />
                    <Select
                      size="small"
                      value={join.joinType}
                      onChange={(v) => updateJoin(idx, 'joinType', v)}
                      options={[
                        { value: 'INNER', label: 'INNER' },
                        { value: 'LEFT', label: 'LEFT' },
                        { value: 'RIGHT', label: 'RIGHT' },
                        { value: 'FULL', label: 'FULL' },
                      ]}
                    />
                    <Select
                      size="small"
                      value={join.rightFieldName || undefined}
                      onChange={(v) => updateJoin(idx, 'rightFieldName', v)}
                      options={getFieldOptions(join.rightDatasourceKey)}
                      placeholder="오른쪽 필드"
                    />
                    <div className="flex items-center gap-1">
                      <Select
                        size="small"
                        value={join.rightDatasourceKey}
                        onChange={(v) => updateJoin(idx, 'rightDatasourceKey', v)}
                        options={selectedDatasources.map((ds) => ({ value: ds.datasourceKey, label: ds.datasourceName }))}
                        placeholder="오른쪽 데이터소스"
                        className="flex-1"
                      />
                      <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={() => removeJoin(idx)} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {joinConditions.length > 0 && (
            <Button size="small" icon={<Plus size={14} />} className="mt-2" onClick={() => addJoinCondition(selectedKeys[0], selectedKeys[1])}>
              조인 조건 추가
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
