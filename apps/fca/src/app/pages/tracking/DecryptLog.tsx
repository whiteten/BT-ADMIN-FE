import React, { useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import dayjs from 'dayjs';
import DecryptLogDetailDrawer from '../../features/decrypt-log/components/DecryptLogDetailDrawer';
import DecryptLogListGrid from '../../features/decrypt-log/components/DecryptLogListGrid';
import DecryptLogSearchBar from '../../features/decrypt-log/components/DecryptLogSearchBar';
import type { DecryptLogItem, DecryptLogSearchRequest } from '../../features/decrypt-log/types/decryptLog.types';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '개인정보 열람 이력', path: '/fca/tracking/decrypt-log' },
];

const DecryptLogPage: React.FC = () => {
  // 검색 파라미터 (기본: 오늘 ~ 오늘)
  const [searchParams, setSearchParams] = useState<DecryptLogSearchRequest>({
    fromDate: dayjs().format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
  });

  // 조회 버튼 클릭마다 증가 — 그리드 SSRM refresh 트리거
  const [searchVersion, setSearchVersion] = useState(0);

  // 그리드 SSRM datasource fetch 상태 — SearchBar spinner용
  const [isListLoading, setIsListLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState<DecryptLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSearch = (newParams: DecryptLogSearchRequest) => {
    setSearchParams(newParams);
    setSearchVersion((v) => v + 1);
  };

  const handleDetailClick = (item: DecryptLogItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <DecryptLogSearchBar onSearch={handleSearch} isLoading={isListLoading} />
        <div className="w-full h-full">
          <DecryptLogListGrid
            searchParams={searchParams}
            searchVersion={searchVersion}
            onDetailClick={handleDetailClick}
            selectedLogId={selectedItem?.logId}
            isLoading={isListLoading}
            onLoadingChange={setIsListLoading}
          />
        </div>
      </div>
      <DecryptLogDetailDrawer open={drawerOpen} item={selectedItem} onClose={handleDrawerClose} />
    </div>
  );
};

export default DecryptLogPage;
