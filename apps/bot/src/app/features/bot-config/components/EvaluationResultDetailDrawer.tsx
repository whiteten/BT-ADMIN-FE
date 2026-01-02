import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Divider, Drawer } from 'antd';
import { useGetEvaluationResultsByEvalDate } from '../hooks/useModelQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * EvaluationResultDetailDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface EvaluationResultDetailDrawerRef {
  open: (params: { modelId: string; evalId: string; evalDate: string }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  evalId: string;
  evalDate: string;
}

/**
 * 평가 결과 상세 Drawer
 * - ref.open({ modelId, evalId, evalDate }) : 상세 정보로 열기
 * - ref.close() : 드로어 닫기
 */
const EvaluationResultDetailDrawer = forwardRef<EvaluationResultDetailDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    evalId: '',
    evalDate: '',
  });

  const { open, modelId, evalId, evalDate } = drawerState;

  const { data: resultListByEvalDate, isFetching: isFetchingResultListByEvalDate } = useGetEvaluationResultsByEvalDate({
    params: { modelId, evalId, evalDate },
    queryOptions: { enabled: !!modelId && !!evalId && !!evalDate },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({ open: true, modelId: params.modelId, evalId: params.evalId, evalDate: params.evalDate });
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
      title="평가 결과"
      closable={{ placement: 'end' }}
      size={1000}
      footer={footer}
      destroyOnHidden
      classNames={{
        body: '!p-0 !rounded-none',
        footer: '!py-2',
      }}
    >
      <div className="flex flex-col w-full h-full overflow-hidden">
        <div className="flex-shrink-0 h-[418px]">
          <Tabs defaultValue="tab1" className="w-full h-full !gap-0">
            <TabsList className="w-full p-0 bg-white rounded-none h-[48px] min-h-[48px] justify-normal">
              <TabsTrigger
                value="tab1"
                className="flex-none min-w-[160px] !shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
              >
                결과 추이
              </TabsTrigger>
              <TabsTrigger
                value="tab2"
                className="flex-none min-w-[160px] !shadow-none border-1 border-b-[#E9EBEC] text-[#495057] !rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
              >
                인식률 분포도
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="w-full h-full p-6">
              <div className="w-full h-full flex items-center justify-center">결과 추이 그래프</div>
            </TabsContent>
            <TabsContent value="tab2" className="w-full h-full p-6">
              <div className="w-full h-full flex items-center justify-center">인식률 분포도 그래프</div>
            </TabsContent>
          </Tabs>
        </div>
        <Divider className="!m-0" />
        <div className="flex h-full flex-1 min-h-0 overflow-y-auto">
          <div className="w-[64%] h-full flex items-center justify-center">평가셋 실행결과</div>
          <Divider orientation="vertical" className="!m-0 !h-full" />
          <div className="flex-1 h-full flex items-center justify-center">결과 상세</div>
        </div>
        <Divider className="!m-0" />
      </div>
    </Drawer>
  );
});

export default EvaluationResultDetailDrawer;
