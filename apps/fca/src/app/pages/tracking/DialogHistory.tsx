import React, { useRef, useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import dayjs from 'dayjs';

const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
import { historyApi } from '../../features/history/api/history.api';
import DialogHistoryDrawer, { type DialogHistoryDrawerRef } from '../../features/history/components/DialogHistoryDrawer';
import DialogHistorySearchForm from '../../features/history/components/DialogHistorySearchForm';
import DialogHistoryTable from '../../features/history/components/DialogHistoryTable';
import { useGetDialogHistory } from '../../features/history/hooks/useHistoryQueries';
import type { DialogHistoryListItem, DialogHistorySearchRequest } from '../../features/history/types/history.types';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '대화 이력', path: '/fca/tracking/bot-dialog' },
];

const DialogHistoryPage: React.FC = () => {
  const drawerRef = useRef<DialogHistoryDrawerRef>(null);

  // 검색 파라미터 상태
  const [searchParams, setSearchParams] = useState<DialogHistorySearchRequest>({
    fromDate: dayjs().startOf('day').format(DATETIME_FORMAT),
    toDate: dayjs().endOf('day').format(DATETIME_FORMAT),
    page: 0,
    size: 5000,
  });

  // 선택된 행 상태 (그리드 선택 표시용)
  const [selectedRowId, setSelectedRowId] = useState<string | undefined>();

  // 대화 이력 목록 조회
  const { data: historyData, isLoading: isListLoading } = useGetDialogHistory({
    params: searchParams,
    queryOptions: {
      placeholderData: (previousData: any) => previousData,
    },
  });

  const handleSearch = (newParams: DialogHistorySearchRequest) => {
    setSearchParams({
      ...newParams,
      page: 0,
      size: 5000,
    });
    setSelectedRowId(undefined);
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev: DialogHistorySearchRequest) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleExcelDownload = () => {
    const url = historyApi.getExcelDownloadUrl(searchParams);
    window.location.href = url;
  };

  const handleRowClick = (data: DialogHistoryListItem) => {
    setSelectedRowId(`${data.ucid}_${data.nextHop}_${data.cdrPkey}`);
    drawerRef.current?.open(data);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex-1 flex flex-col min-h-0">
        <DialogHistorySearchForm onSearch={handleSearch} onExcelDownload={handleExcelDownload} isLoading={isListLoading} />

        <div className="flex flex-1 min-h-0 mb-4 px-1">
          <div className="flex-1 flex flex-col min-h-0">
            <DialogHistoryTable
              rowData={historyData?.items ?? []}
              total={historyData?.total ?? 0}
              isLoading={isListLoading}
              page={searchParams.page ?? 0}
              size={searchParams.size ?? 20}
              onPageChange={handlePageChange}
              onRowClick={handleRowClick}
              selectedRowId={selectedRowId}
            />
          </div>
        </div>
      </div>

      <DialogHistoryDrawer ref={drawerRef} />
    </div>
  );
};

export default DialogHistoryPage;
