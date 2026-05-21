import { MultiSelect, type Option } from 'react-multi-select-component';
import { Button } from 'antd';

const multiSelectStrings = {
  selectSomeItems: '캠페인을 선택하세요.',
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

interface CampaignDashboardToolbarProps {
  isEditMode: boolean;
  layoutFilterOptions: Option[];
  selectedLayoutFilterItems: Option[];
  onLayoutFilterChange: (value: Option[]) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onResetLayouts: () => void;
  campaignOptions: Option[];
  selectedCampaign: Option[];
  onCampaignChange: (value: Option[]) => void;
  isCampaignLoading?: boolean;
}

export default function CampaignDashboardToolbar({
  isEditMode,
  layoutFilterOptions,
  selectedLayoutFilterItems,
  onLayoutFilterChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onResetLayouts,
  campaignOptions,
  selectedCampaign,
  onCampaignChange,
  isCampaignLoading = false,
}: CampaignDashboardToolbarProps) {
  return (
    <div className="flex h-[58px] min-h-[58px] w-full shrink-0 items-center gap-2 bg-white bt-shadow px-5">
      <div className="flex w-full flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-[#495057]">캠페인 선택</span>
          <MultiSelect
            options={campaignOptions}
            value={selectedCampaign}
            onChange={onCampaignChange}
            labelledBy="캠페인 선택"
            hasSelectAll
            overrideStrings={multiSelectStrings}
            valueRenderer={createValueRenderer('캠페인을 선택하세요.')}
            isLoading={isCampaignLoading}
            className="w-[280px]"
          />
        </div>
        {isEditMode ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-medium text-[#495057]">현황판 선택</span>
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
          <Button variant="solid" color="primary" onClick={onStartEdit}>
            화면편집
          </Button>
        )}
      </div>
    </div>
  );
}
