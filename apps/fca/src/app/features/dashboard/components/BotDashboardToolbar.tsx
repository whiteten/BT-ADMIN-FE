import { MultiSelect, type Option } from 'react-multi-select-component';
import { Button } from 'antd';

const multiSelectStrings = {
  selectSomeItems: '봇을 선택하세요.',
  allItemsAreSelected: '전체 선택됨',
  selectAll: '전체 선택',
  selectAllFiltered: '전체 선택 (필터)',
  search: '검색어를 입력하세요.',
  clearSearch: '검색 초기화',
  clearSelected: '선택 초기화',
  noOptions: '옵션 없음',
  create: '생성',
};

const createValueRenderer = (emptyText: string) => (selected: Option[], options: Option[]) => {
  if (selected.length === 0) return emptyText;
  if (selected.length === options.length) return '전체 선택됨';
  if (selected.length === 1) return selected[0].label;
  return `${selected.length}개 선택됨`;
};

interface BotDashboardToolbarProps {
  isEditMode: boolean;
  layoutFilterOptions: Option[];
  selectedLayoutFilterItems: Option[];
  onLayoutFilterChange: (value: Option[]) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onResetLayouts: () => void;
  serviceOptions: Option[];
  selectedService: Option[];
  onServiceChange: (value: Option[]) => void;
}

export default function BotDashboardToolbar({
  isEditMode,
  layoutFilterOptions,
  selectedLayoutFilterItems,
  onLayoutFilterChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onResetLayouts,
  serviceOptions,
  selectedService,
  onServiceChange,
}: BotDashboardToolbarProps) {
  return (
    <div className="flex gap-2 w-fit items-center shrink-0">
      {isEditMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">현황판 선택</span>
          <MultiSelect
            options={layoutFilterOptions}
            value={selectedLayoutFilterItems}
            onChange={onLayoutFilterChange}
            labelledBy="현황판 선택"
            hasSelectAll
            overrideStrings={multiSelectStrings}
            valueRenderer={createValueRenderer('현황판을 선택하세요.')}
            isLoading={false}
            className="w-[250px]"
          />
          <Button onClick={onCancelEdit}>취소</Button>
          <Button variant="solid" color="orange" onClick={onResetLayouts}>
            초기화
          </Button>
          <Button variant="solid" color="cyan" onClick={onSaveEdit}>
            저장
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">봇</span>
          <MultiSelect
            options={serviceOptions}
            value={selectedService}
            onChange={onServiceChange}
            labelledBy="봇 선택"
            hasSelectAll
            overrideStrings={multiSelectStrings}
            valueRenderer={createValueRenderer('봇을 선택하세요.')}
            isLoading={false}
            className="w-[250px]"
          />
          <Button variant="solid" color="primary" onClick={onStartEdit}>
            화면편집
          </Button>
        </div>
      )}
    </div>
  );
}
