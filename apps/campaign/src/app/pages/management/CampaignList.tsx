import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CampaignCard from '../../features/management/components/CampaignCard';
import CampaignManagementContextHeader from '../../features/management/components/CampaignManagementContextHeader';
import {
  CAMPAIGN_IN_USE_FILTER,
  CAMPAIGN_IN_USE_FILTER_OPTIONS,
  CAMPAIGN_SERVICE_TYPE_FILTER,
  CAMPAIGN_SERVICE_TYPE_FILTER_OPTIONS,
  type CampaignInUseFilter,
  type CampaignServiceTypeFilter,
} from '../../features/management/constants/campaignManagementConstants';
import { MOCK_CAMPAIGN_LIST } from '../../features/management/constants/campaignManagementMockData';
import { useCampaignManagementContext } from '../../features/management/hooks/useCampaignManagementContext';
import type { CampaignListItem } from '../../features/management/types/campaign';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/campaign/management' },
  { title: '캠페인 기본정보', path: '/campaign/management/basic-info' },
];

type AppliedFilters = {
  serviceTypeFilter: CampaignServiceTypeFilter;
  inUseFilter: CampaignInUseFilter;
  searchValue: string;
};

const INITIAL_APPLIED_FILTERS: AppliedFilters = {
  serviceTypeFilter: CAMPAIGN_SERVICE_TYPE_FILTER.ALL,
  inUseFilter: CAMPAIGN_IN_USE_FILTER.ALL,
  searchValue: '',
};

export default function CampaignList() {
  const navigate = useNavigate();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<CampaignServiceTypeFilter>(CAMPAIGN_SERVICE_TYPE_FILTER.ALL);
  const [inUseFilter, setInUseFilter] = useState<CampaignInUseFilter>(CAMPAIGN_IN_USE_FILTER.ALL);
  const [searchValue, setSearchValue] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(INITIAL_APPLIED_FILTERS);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignList, setCampaignList] = useState<CampaignListItem[]>(MOCK_CAMPAIGN_LIST);
  const { tenantIds, setTenantIds, tenantSelectOptions, validateContext } = useCampaignManagementContext();

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const filteredList = useMemo(() => {
    const keyword = appliedFilters.searchValue.trim().toLowerCase();

    return campaignList.filter((campaign) => {
      if (appliedFilters.serviceTypeFilter !== CAMPAIGN_SERVICE_TYPE_FILTER.ALL && campaign.serviceType !== appliedFilters.serviceTypeFilter) {
        return false;
      }

      if (appliedFilters.inUseFilter === CAMPAIGN_IN_USE_FILTER.IN_USE && !campaign.inUse) {
        return false;
      }

      if (appliedFilters.inUseFilter === CAMPAIGN_IN_USE_FILTER.NOT_IN_USE && campaign.inUse) {
        return false;
      }

      if (keyword && !campaign.campaignName.toLowerCase().includes(keyword)) {
        return false;
      }

      return true;
    });
  }, [appliedFilters, campaignList]);

  const handleSearch = () => {
    if (!validateContext()) return;

    setAppliedFilters({
      serviceTypeFilter,
      inUseFilter,
      searchValue,
    });
    setSelectedCampaignId(null);
  };

  const handleSelect = (campaignId: string) => {
    setSelectedCampaignId((prev) => (prev === campaignId ? null : campaignId));
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  const handleDetail = (campaignId: string) => {
    navigate(`../${campaignId}`);
  };

  const handleDelete = (campaignId: string) => {
    modal.confirm.delete({
      onOk: () => {
        setCampaignList((prev) => prev.filter((item) => item.campaignId !== campaignId));
        setSelectedCampaignId((prev) => (prev === campaignId ? null : prev));
        toast.success('캠페인이 삭제되었습니다.');
      },
    });
  };

  const handleToolbarDelete = () => {
    if (!selectedCampaignId) {
      toast.warning('삭제할 캠페인을 선택하세요.');
      return;
    }

    handleDelete(selectedCampaignId);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <CampaignManagementContextHeader tenantIds={tenantIds} onTenantIdsChange={setTenantIds} tenantSelectOptions={tenantSelectOptions} />
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-3 w-full items-center flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">구분</span>
            <Select
              value={serviceTypeFilter}
              onChange={setServiceTypeFilter}
              options={[...CAMPAIGN_SERVICE_TYPE_FILTER_OPTIONS]}
              className="!max-w-[150px] !min-w-[120px]"
              popupMatchSelectWidth={false}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">캠페인</span>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              className="w-full max-w-[400px]"
              placeholder="캠페인명을 입력하세요."
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#495057] shrink-0">사용여부</span>
            <Select
              value={inUseFilter}
              onChange={setInUseFilter}
              options={[...CAMPAIGN_IN_USE_FILTER_OPTIONS]}
              className="!max-w-[150px] !min-w-[120px]"
              popupMatchSelectWidth={false}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((campaign) => (
            <CampaignCard
              key={campaign.campaignId}
              {...campaign}
              selected={selectedCampaignId === campaign.campaignId}
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
