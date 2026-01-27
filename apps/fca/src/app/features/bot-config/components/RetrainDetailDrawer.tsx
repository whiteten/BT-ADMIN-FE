import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer } from 'antd';
import { useGetRetrainDetail } from '../hooks/useModelQueries';
import type { RetrainEntity, RetrainKeyword, RetrainListItem } from '../types/retrain';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * RetrainDetailDrawer ref 타입
 */
export interface RetrainDetailDrawerRef {
  open: (params: { modelId: string; data: RetrainListItem }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  data: RetrainListItem | null;
}

const entityColumnDefs: ColDef<RetrainEntity>[] = [
  { headerName: '개체명', field: 'entityTag', flex: 1 },
  { headerName: '개체값', field: 'entityValue', flex: 1 },
];

const keywordColumnDefs: ColDef<RetrainKeyword>[] = [
  { headerName: '개체명', field: 'entityTag', flex: 1 },
  { headerName: '개체값', field: 'keyword', flex: 1 },
];

/**
 * 재학습 상세 Drawer
 */
const RetrainDetailDrawer = forwardRef<RetrainDetailDrawerRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const customGridOptions = useMemo(
    () => ({
      ...gridOptions,
      sideBar: false,
      pagination: false,
    }),
    [gridOptions],
  );
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    data: null,
  });

  const { open, modelId, data } = drawerState;

  const { data: detailData, isFetching } = useGetRetrainDetail({
    params: { modelId, ucidGkey: data?.ucidGkey, questionSeq: data?.questionSeq, hop: data?.hop },
    queryOptions: {
      enabled: open && !!modelId,
    },
  });

  useImperativeHandle(ref, () => ({
    open: ({ modelId, data }) => {
      setDrawerState({ open: true, modelId, data });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        닫기
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="상세 정보"
      closable={{ placement: 'end' }}
      size={656}
      footer={footer}
      destroyOnHidden
      classNames={{
        body: '!p-0 !rounded-none',
        footer: '!py-2',
      }}
    >
      <div className="flex flex-col w-full h-full p-6 pb-0 gap-6">
        {/* 인식개체 정보 */}
        <div className="flex flex-col flex-1 shrink-0 min-h-0">
          <div className="text-[#495057] text-lg font-bold shrink-0 mb-2">인식개체 정보</div>
          <div className="flex-1 min-h-0">
            <AgGridReact<RetrainEntity> rowData={detailData?.entityList ?? []} columnDefs={entityColumnDefs} gridOptions={customGridOptions} loading={isFetching} />
          </div>
        </div>
        {/* 인식키워드 정보 */}
        <div className="flex flex-col flex-1 shrink-0 min-h-0">
          <div className="text-[#495057] text-lg font-bold shrink-0 mb-2">인식키워드 정보</div>
          <div className="flex-1 min-h-0">
            <AgGridReact<RetrainKeyword> rowData={detailData?.keywordList ?? []} columnDefs={keywordColumnDefs} gridOptions={customGridOptions} loading={isFetching} />
          </div>
        </div>
      </div>
    </Drawer>
  );
});

export default RetrainDetailDrawer;
