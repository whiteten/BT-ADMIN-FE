import React, { useRef, useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigationStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';

const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
import { botDialogHistoryApi } from '../../features/tracking/api/botDialogHistoryApi';
import BotDialogHistoryDrawer, { type BotDialogHistoryDrawerRef } from '../../features/tracking/components/BotDialogHistoryDrawer';
import BotDialogHistorySearchForm from '../../features/tracking/components/BotDialogHistorySearchForm';
import BotDialogHistoryTable from '../../features/tracking/components/BotDialogHistoryTable';
import { useGetBotDialogHistory } from '../../features/tracking/hooks/useBotDialogHistoryQueries';
import type { BotDialogHistoryListItem, BotDialogHistorySearchRequest } from '../../features/tracking/types/botDialogHistory.types';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '대화이력', path: '/fca/tracking/dialog-history' },
];

const BotDialogHistoryPage: React.FC = () => {
  const drawerRef = useRef<BotDialogHistoryDrawerRef>(null);
  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:bot-dialog-history:export');
  const [isExporting, setIsExporting] = useState(false);

  // 검색 파라미터 상태
  const [searchParams, setSearchParams] = useState<BotDialogHistorySearchRequest>({
    fromDate: dayjs().startOf('day').format(DATETIME_FORMAT),
    toDate: dayjs().endOf('day').format(DATETIME_FORMAT),
    page: 0,
    size: 5000,
  });

  // 조회 버튼 클릭 시마다 강제 refetch를 위한 타임스탬프
  const [searchTs, setSearchTs] = useState<number>(Date.now());

  // 선택된 행 상태 (그리드 선택 표시용)
  const [selectedRowId, setSelectedRowId] = useState<string | undefined>();

  // 대화이력 목록 조회 (searchTs를 queryKey에만 포함하여 매 조회 시 강제 refetch)
  const { data: historyData, isFetching: isListLoading } = useGetBotDialogHistory({
    params: { ...searchParams, _t: searchTs },
    queryOptions: {
      placeholderData: (previousData: any) => previousData,
    },
  });

  const handleSearch = (newParams: BotDialogHistorySearchRequest) => {
    setSearchParams({
      ...newParams,
      page: 0,
      size: 5000,
    });
    setSearchTs(Date.now());
    setSelectedRowId(undefined);
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev: BotDialogHistorySearchRequest) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleExcelDownload = async () => {
    if (!historyData?.items?.length) {
      toast.warning('다운로드할 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await botDialogHistoryApi.exportExcel(searchParams);
      const fileName = extractFileName(response.headers['content-disposition'], `BOT_DIALOG_HISTORY_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      downloadBlob(response.data, fileName);
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRowClick = (data: BotDialogHistoryListItem) => {
    setSelectedRowId(`${data.ucid}_${data.nextHop}_${data.cdrPkey}`);
    drawerRef.current?.open(data);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex-1 flex flex-col min-h-0">
        <BotDialogHistorySearchForm
          onSearch={handleSearch}
          isLoading={isListLoading}
          onExcelDownload={hasExcelPermission ? handleExcelDownload : undefined}
          isExporting={isExporting}
        />

        <div className="flex flex-1 min-h-0 mb-4 px-1">
          <div className="flex-1 flex flex-col min-h-0">
            <BotDialogHistoryTable
              rowData={historyData?.items ?? []}
              total={historyData?.total ?? 0}
              isLoading={isListLoading}
              page={searchParams.page ?? 0}
              size={searchParams.size ?? 20}
              onPageChange={handlePageChange}
              onRowDoubleClick={handleRowClick}
              selectedRowId={selectedRowId}
            />
          </div>
        </div>
      </div>

      <BotDialogHistoryDrawer ref={drawerRef} />
    </div>
  );
};

export default BotDialogHistoryPage;
