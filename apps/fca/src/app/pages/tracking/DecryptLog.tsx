import React, { useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import dayjs from 'dayjs';
import DecryptLogDetailDrawer from '../../features/decrypt-log/components/DecryptLogDetailDrawer';
import DecryptLogListGrid from '../../features/decrypt-log/components/DecryptLogListGrid';
import DecryptLogSearchBar from '../../features/decrypt-log/components/DecryptLogSearchBar';
import { useGetDecryptLogList } from '../../features/decrypt-log/hooks/useDecryptLogQueries';
import type { DecryptLogItem, DecryptLogSearchRequest } from '../../features/decrypt-log/types/decryptLog.types';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '개인정보 열람 이력', path: '/fca/tracking/decrypt-log' },
];

const DEFAULT_PAGE_SIZE = 50;

const DecryptLogPage: React.FC = () => {
  // 검색 파라미터 (기본: 오늘 ~ 오늘)
  const [searchParams, setSearchParams] = useState<DecryptLogSearchRequest>({
    fromDate: dayjs().format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
    page: 0,
    size: DEFAULT_PAGE_SIZE,
  });
  const [searchTs, setSearchTs] = useState<number>(Date.now());

  const [selectedItem, setSelectedItem] = useState<DecryptLogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 목록
  const { data: pageData, isFetching: isListLoading } = useGetDecryptLogList({
    params: { ...searchParams, _t: searchTs },
    queryOptions: { placeholderData: (prev: any) => prev },
  });

  const handleSearch = (newParams: DecryptLogSearchRequest) => {
    setSearchParams({
      ...newParams,
      page: 0,
      size: DEFAULT_PAGE_SIZE,
    });
    setSearchTs(Date.now());
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleDetailClick = (item: DecryptLogItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full overflow-hidden">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex-1 flex flex-col min-h-0">
        <DecryptLogSearchBar onSearch={handleSearch} isLoading={isListLoading} />

        <div className="flex flex-1 min-h-0 mb-4 px-1">
          <div className="flex-1 flex flex-col min-h-0">
            <DecryptLogListGrid
              rowData={pageData?.items ?? []}
              total={pageData?.total ?? 0}
              isLoading={isListLoading}
              page={searchParams.page ?? 0}
              size={searchParams.size ?? DEFAULT_PAGE_SIZE}
              onPageChange={handlePageChange}
              onDetailClick={handleDetailClick}
              selectedLogId={selectedItem?.logId}
            />
          </div>
        </div>
      </div>

      <DecryptLogDetailDrawer open={drawerOpen} item={selectedItem} onClose={handleDrawerClose} />
    </div>
  );
};

export default DecryptLogPage;
