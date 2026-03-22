import React, { useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import dayjs from 'dayjs';

const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
import { historyApi } from '../../features/history/api/history.api';
import ChatBubblePanel from '../../features/history/components/ChatBubblePanel';
import DialogHistorySearchForm from '../../features/history/components/DialogHistorySearchForm';
import DialogHistoryTable from '../../features/history/components/DialogHistoryTable';
import { useGetBubbles, useGetDialogHistory } from '../../features/history/hooks/useHistoryQueries';
import type { DialogHistoryListItem, DialogHistorySearchRequest } from '../../features/history/types/history.types';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '대화 이력', path: '/fca/tracking/bot-dialog' },
];

const DialogHistoryPage: React.FC = () => {
  // 검색 파라미터 상태
  const [searchParams, setSearchParams] = useState<DialogHistorySearchRequest>({
    fromDate: dayjs().startOf('day').format(DATETIME_FORMAT),
    toDate: dayjs().endOf('day').format(DATETIME_FORMAT),
    page: 0,
    size: 5000,
  });

  // 선택된 행 상태 (UCID + NextHop + CdrPkey 조합으로 식별)
  const [selectedRow, setSelectedRow] = useState<DialogHistoryListItem | null>(null);

  // 대화 이력 목록 조회
  const { data: historyData, isLoading: isListLoading } = useGetDialogHistory({
    params: searchParams,
    queryOptions: {
      placeholderData: (previousData: any) => previousData,
    },
  });

  // 선택된 행의 버블 목록 조회
  const { data: bubbleData, isLoading: isBubbleLoading } = useGetBubbles({
    params: {
      ucid: selectedRow?.ucid,
      nextHop: selectedRow?.nextHop,
      cdrPkey: selectedRow?.cdrPkey,
    },
    queryOptions: {
      enabled: !!selectedRow,
    },
  });

  const handleSearch = (newParams: DialogHistorySearchRequest) => {
    setSearchParams({
      ...newParams,
      page: 0,
      size: 5000,
    });
    setSelectedRow(null); // 검색 시 상세 선택 해제
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
    setSelectedRow(data);
  };

  const selectedRowId = selectedRow ? `${selectedRow.ucid}_${selectedRow.nextHop}_${selectedRow.cdrPkey}` : undefined;

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex-1 flex flex-col min-h-0">
        <DialogHistorySearchForm onSearch={handleSearch} onExcelDownload={handleExcelDownload} isLoading={isListLoading} />

        <div className="flex flex-1 gap-4 min-h-0 mb-4 px-1">
          {/* 목록 영역 (70%) */}
          <div className="flex-[7] flex flex-col min-h-0">
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

          {/* 상세 버블 영역 (30%) */}
          <div className="flex-[3] flex flex-col min-h-0 bg-white bt-shadow">
            <ChatBubblePanel items={bubbleData ?? []} isLoading={isBubbleLoading} ucid={selectedRow?.ucid} nextHop={selectedRow?.nextHop} cdrPkey={selectedRow?.cdrPkey} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogHistoryPage;
