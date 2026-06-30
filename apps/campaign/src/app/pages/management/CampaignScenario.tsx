import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CampaignManagementContextHeader from '../../features/management/components/CampaignManagementContextHeader';
import CampaignScenarioCard from '../../features/management/components/CampaignScenarioCard';
import { MOCK_CAMPAIGN_SCENARIO_LIST } from '../../features/management/constants/campaignScenarioMockData';
import { useCampaignManagementContext } from '../../features/management/hooks/useCampaignManagementContext';
import type { CampaignScenarioListItem } from '../../features/management/types/campaignScenario';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/campaign/management' },
  { title: '캠페인 시나리오', path: '/campaign/management/campaign-scenario' },
];

type AppliedFilters = {
  scenarioSearchValue: string;
  fileIdentifierSearchValue: string;
};

const INITIAL_APPLIED_FILTERS: AppliedFilters = {
  scenarioSearchValue: '',
  fileIdentifierSearchValue: '',
};

export default function CampaignScenario() {
  const navigate = useNavigate();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [scenarioSearchValue, setScenarioSearchValue] = useState('');
  const [fileIdentifierSearchValue, setFileIdentifierSearchValue] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(INITIAL_APPLIED_FILTERS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioList, setScenarioList] = useState<CampaignScenarioListItem[]>(MOCK_CAMPAIGN_SCENARIO_LIST);
  const { tenantIds, setTenantIds, tenantSelectOptions, campaignSelections, setCampaignSelections, campaignSelectOptions, validateContext } = useCampaignManagementContext({
    withCampaign: true,
  });

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const filteredList = useMemo(() => {
    const scenarioKeyword = appliedFilters.scenarioSearchValue.trim().toLowerCase();
    const fileIdentifierKeyword = appliedFilters.fileIdentifierSearchValue.trim().toLowerCase();

    return scenarioList.filter((item) => {
      if (scenarioKeyword && !item.scenario.toLowerCase().includes(scenarioKeyword) && !item.scenarioName.toLowerCase().includes(scenarioKeyword)) {
        return false;
      }

      if (fileIdentifierKeyword && !item.fileIdentifier.toLowerCase().includes(fileIdentifierKeyword)) {
        return false;
      }

      return true;
    });
  }, [appliedFilters, scenarioList]);

  const handleSearch = () => {
    if (!validateContext()) return;

    setAppliedFilters({
      scenarioSearchValue,
      fileIdentifierSearchValue,
    });
    setSelectedScenarioId(null);
  };

  const handleRandomDispatch = () => {
    if (!selectedScenarioId) {
      toast.warning('랜덤발신을 설정할 캠페인 시나리오를 선택하세요.');
      return;
    }

    navigate(`random-dispatch/${selectedScenarioId}`);
  };

  const handleSelect = (scenarioId: string) => {
    setSelectedScenarioId((prev) => (prev === scenarioId ? null : scenarioId));
  };

  const handleClickCreateBtn = () => {
    navigate('create');
  };

  const handleDetail = (scenarioId: string) => {
    navigate(scenarioId);
  };

  const handleDelete = (scenarioId: string) => {
    modal.confirm.delete({
      onOk: () => {
        setScenarioList((prev) => prev.filter((item) => item.scenarioId !== scenarioId));
        setSelectedScenarioId((prev) => (prev === scenarioId ? null : prev));
        toast.success('캠페인 시나리오가 삭제되었습니다.');
      },
    });
  };

  const handleToolbarDelete = () => {
    if (!selectedScenarioId) {
      toast.warning('삭제할 캠페인 시나리오를 선택하세요.');
      return;
    }

    handleDelete(selectedScenarioId);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <CampaignManagementContextHeader
        tenantIds={tenantIds}
        onTenantIdsChange={setTenantIds}
        tenantSelectOptions={tenantSelectOptions}
        showCampaignSelect
        campaignSelections={campaignSelections}
        onCampaignSelectionsChange={setCampaignSelections}
        campaignSelectOptions={campaignSelectOptions}
      />
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-3 w-full items-center flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">캠페인 시나리오</span>
            <Input
              value={scenarioSearchValue}
              onChange={(e) => setScenarioSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              className="w-full min-w-[320px] max-w-[560px]"
              placeholder="시나리오 또는 시나리오명을 입력하세요."
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">파일식별자</span>
            <Input
              value={fileIdentifierSearchValue}
              onChange={(e) => setFileIdentifierSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              className="w-full max-w-[400px]"
              placeholder="파일식별자를 입력하세요."
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleRandomDispatch}>랜덤발신</Button>
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
          <Button type="primary" onClick={handleClickCreateBtn}>
            추가
          </Button>
          <Button danger onClick={handleToolbarDelete}>
            삭제
          </Button>
        </div>
      </div>
      {filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(480px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((scenario) => (
            <CampaignScenarioCard
              key={scenario.scenarioId}
              {...scenario}
              selected={selectedScenarioId === scenario.scenarioId}
              onSelect={handleSelect}
              onDetail={handleDetail}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
