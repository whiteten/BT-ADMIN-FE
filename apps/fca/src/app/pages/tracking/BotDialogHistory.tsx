import React, { useEffect, useRef, useState } from 'react';
import type { BreadcrumbProps } from 'antd';
import dayjs from 'dayjs';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { downloadBlob, extractFileName, toast } from '@/shared-util';
import { botDialogHistoryApi } from '../../features/tracking/api/botDialogHistoryApi';
import BotDialogHistoryDrawer, { type BotDialogHistoryDrawerRef } from '../../features/tracking/components/BotDialogHistoryDrawer';
import BotDialogHistorySearchForm from '../../features/tracking/components/BotDialogHistorySearchForm';
import BotDialogHistoryTable from '../../features/tracking/components/BotDialogHistoryTable';
import SlotSankeyDrawer from '../../features/tracking/components/SlotSankeyDrawer';
import type { BotDialogHistoryListItem, BotDialogHistorySearchRequest } from '../../features/tracking/types';

const DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '트래킹', path: '/fca/tracking' },
  { title: '대화이력', path: '/fca/tracking/bot-dialog-history' },
];

const BotDialogHistoryPage: React.FC = () => {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const drawerRef = useRef<BotDialogHistoryDrawerRef>(null);
  const { permissions } = useNavigationStore();
  const hasExcelPermission = permissions.includes('fca:bot-dialog-history:export');
  const [isExporting, setIsExporting] = useState(false);

  // 검색 파라미터 상태
  const [searchParams, setSearchParams] = useState<BotDialogHistorySearchRequest>({
    fromDate: dayjs().startOf('day').format(DATETIME_FORMAT),
    toDate: dayjs().endOf('day').format(DATETIME_FORMAT),
  });

  // 조회 버튼 클릭마다 증가 — 그리드 SSRM refresh 트리거
  const [searchVersion, setSearchVersion] = useState(0);

  // 선택된 행 상태 (그리드 선택 표시용)
  const [selectedRowId, setSelectedRowId] = useState<string | undefined>();

  // 그리드 SSRM datasource가 응답에서 갱신해주는 값
  const [totalRows, setTotalRows] = useState(0);
  const [isListLoading, setIsListLoading] = useState(false);
  const [slotChartOpen, setSlotChartOpen] = useState(false);
  // 슬롯차트는 현재 폼 상태(미저장 변경 포함)로 조회하므로 별도 파라미터 보관
  const [slotChartParams, setSlotChartParams] = useState<BotDialogHistorySearchRequest | null>(null);

  const handleSearch = (newParams: BotDialogHistorySearchRequest) => {
    setSearchParams(newParams);
    setSearchVersion((v) => v + 1);
    setSelectedRowId(undefined);
  };

  const handleExcelDownload = async () => {
    if (totalRows === 0) {
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
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <BotDialogHistorySearchForm
          onSearch={handleSearch}
          isLoading={isListLoading}
          onExcelDownload={hasExcelPermission ? handleExcelDownload : undefined}
          isExporting={isExporting}
          onSlotChart={(values) => {
            setSlotChartParams(values);
            setSlotChartOpen(true);
          }}
        />
        <div className="w-full h-full">
          <BotDialogHistoryTable
            searchParams={searchParams}
            searchVersion={searchVersion}
            onRowDoubleClick={handleRowClick}
            selectedRowId={selectedRowId}
            isLoading={isListLoading}
            onLoadingChange={setIsListLoading}
            onTotalRowsChange={setTotalRows}
          />
        </div>
      </div>
      <BotDialogHistoryDrawer ref={drawerRef} />
      <SlotSankeyDrawer
        open={slotChartOpen}
        onClose={() => setSlotChartOpen(false)}
        searchParams={slotChartParams ?? searchParams}
        onEntityFilter={(entityTag, entitySeq) => {
          // 그리드 재조회 시 차트가 보고 있던 조건을 그대로 반영 — 폼 미저장 변경 포함
          // entitySeq까지 함께 넘겨 동일 SEQ 위치에서 entity를 거친 콜만 조회
          const baseParams = slotChartParams ?? searchParams;
          setSearchParams({ ...baseParams, slotEntityTag: entityTag, slotEntitySeq: entitySeq });
          setSearchVersion((v) => v + 1);
        }}
      />
    </div>
  );
};

export default BotDialogHistoryPage;
