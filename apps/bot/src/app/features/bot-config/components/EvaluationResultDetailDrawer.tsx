import { forwardRef, useImperativeHandle, useState } from 'react';
import type { ColDef, ColGroupDef, RowClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Divider, Drawer } from 'antd';
import type { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';
import { createUUID } from '@/shared-util';
import { useGetEvaluationResultsByEvalDate, useGetEvaluationResultsByEvalDateAndQuestionSeq } from '../hooks/useModelQueries';
import type { EvaluationResultListByEvalDateAndQuestionSeqItem, EvaluationResultListByEvalDateItem } from '../types/evaluation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

/**
 * 결과 추이 차트 옵션 생성
 */
const createResultTrendChartOption = (data: EvaluationResultListByEvalDateItem[] | undefined): EChartsOption => {
  const tooltipFormatter = (params: unknown) => {
    const list = params as { data: EvaluationResultListByEvalDateItem; seriesName: string; marker: string }[];
    if (!Array.isArray(list) || list.length === 0) return '';
    const { question, accuracy, confidence } = list[0].data;
    const values: Record<string, number> = { 정확도: accuracy, 신뢰도: confidence };
    const items = list
      .map((p) => {
        const value = values[p.seriesName];
        return `<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">${p.marker}<span style="flex:1;">${p.seriesName}</span><span style="font-weight:bold;">${value}</span></div>`;
      })
      .join('');
    return `<div style="font-size:14px;color:#666;margin-bottom:4px;">${question}</div>${items}`;
  };

  return {
    dataset: {
      dimensions: ['questionSeq', 'accuracy', 'confidence'],
      source: data ?? [],
    },
    tooltip: {
      trigger: 'axis',
      formatter: tooltipFormatter,
    },
    legend: { data: ['정확도', '신뢰도'], right: 10, top: 'middle', orient: 'vertical', icon: 'roundRect' },
    grid: { left: 80, right: 100, bottom: 20, top: 20, containLabel: false },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 20,
      axisLabel: { formatter: '{value}%', color: '#495057' },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: 'dashed', color: '#E9EBEC' } },
    },
    series: [
      {
        name: '정확도',
        type: 'line',
        encode: { x: 'questionSeq', y: 'accuracy' },
        symbol: 'roundRect',
        symbolSize: [28, 20],
        itemStyle: { color: '#3B82F6', borderRadius: 4 },
        lineStyle: { color: '#3B82F6', width: 2 },
        label: { show: true, position: 'inside', color: '#fff', fontSize: 11, fontWeight: 'bold' },
      },
      {
        name: '신뢰도',
        type: 'line',
        encode: { x: 'questionSeq', y: 'confidence' },
        symbol: 'roundRect',
        symbolSize: [28, 20],
        itemStyle: { color: '#10B981', borderRadius: 4 },
        lineStyle: { color: '#10B981', width: 2 },
        label: { show: true, position: 'inside', color: '#fff', fontSize: 11, fontWeight: 'bold' },
      },
    ],
  };
};

/**
 * 결과 분포도 차트 옵션 생성
 * - x축: confidence를 10단위로 나눈 범위 (0-10, 10-20, ..., 90-100)
 * - y축: 해당 범위에 속하는 데이터 건수
 * - 막대 차트 + 누적 라인 차트
 */
const createResultDistributionChartOption = (data: EvaluationResultListByEvalDateItem[] | undefined): EChartsOption => {
  // 10단위 구간 레이블
  const rangeLabels = ['0~10', '10~20', '20~30', '30~40', '40~50', '50~60', '60~70', '70~80', '80~90', '90~100'];

  // 각 구간별 건수 계산
  const distributionCounts: number[] = new Array(10).fill(0);
  if (data) {
    data.forEach((item) => {
      const confidence = item.confidence ?? 0;
      // 구간 인덱스 계산 (0-9: 0, 10-19: 1, ..., 90-100: 9)
      const index = confidence === 100 ? 9 : Math.floor(confidence / 10);
      if (index >= 0 && index < 10) {
        distributionCounts[index]++;
      }
    });
  }

  // 최대값 찾기 (동률 처리를 위해)
  const maxCount = Math.max(...distributionCounts);

  // 막대 데이터 생성 (최대값인 막대는 붉은색)
  const barData = distributionCounts.map((count) => ({
    value: count,
    itemStyle: {
      color: count > 0 && count === maxCount ? '#F06548' : '#3B82F6',
      borderRadius: [4, 4, 0, 0],
    },
  }));

  return {
    grid: { left: 50, right: 50, bottom: 40, top: 30, containLabel: false },
    xAxis: {
      type: 'category',
      data: rangeLabels,
      axisLine: { lineStyle: { color: '#E9EBEC' } },
      axisTick: { show: false },
      axisLabel: { color: '#495057', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#495057' },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { type: 'dashed', color: '#E9EBEC' } },
    },
    series: [
      {
        type: 'line',
        data: distributionCounts,
        symbol: 'none',
        itemStyle: { color: '#3577f14b' },
        lineStyle: { color: '#3577f14b', width: 2 },
        z: 1,
      },
      {
        type: 'bar',
        data: barData,
        barWidth: '40%',
        label: {
          show: true,
          position: 'insideTop',
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
          formatter: (params) => ((params.value as number) > 0 ? `${params.value}` : ''),
        },
        z: 2,
      },
    ],
  };
};

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
 * 좌측 그리드 컬럼 정의
 */
const leftColumnDefs: (ColDef<EvaluationResultListByEvalDateItem> | ColGroupDef<EvaluationResultListByEvalDateItem>)[] = [
  { headerName: 'EvalId', field: 'evalId', hide: true },
  { headerName: '평가일', field: 'evalDate', hide: true },
  { headerName: '문장번호', field: 'questionSeq', hide: true },
  { headerName: '문장', field: 'question', flex: 2, suppressHeaderMenuButton: true },
  { headerName: '정답', field: 'answer', suppressHeaderMenuButton: true },
  {
    headerName: '결과',
    children: [
      { headerName: '의도', field: 'intent', maxWidth: 140, suppressHeaderMenuButton: true },
      { headerName: '점수', field: 'confidence', maxWidth: 80, suppressHeaderMenuButton: true },
    ],
  },
];

/**
 * 우측 그리드 컬럼 정의
 */
const rightColumnDefs: ColDef<EvaluationResultListByEvalDateAndQuestionSeqItem>[] = [
  { headerName: 'EvalId', field: 'evalId', hide: true },
  { headerName: '평가일', field: 'evalDate', hide: true },
  { headerName: '문장번호', field: 'questionSeq', hide: true },
  { headerName: '의도', field: 'intent', suppressHeaderMenuButton: true },
  { headerName: '점수', field: 'confidence', maxWidth: 80, suppressHeaderMenuButton: true },
];

/**
 * 평가 결과 상세 Drawer
 * - ref.open({ modelId, evalId, evalDate }) : 상세 정보로 열기
 * - ref.close() : 드로어 닫기
 */
const EvaluationResultDetailDrawer = forwardRef<EvaluationResultDetailDrawerRef>((_, ref) => {
  const { gridOptions } = useAggridOptions();
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    evalId: '',
    evalDate: '',
  });
  const [selectedQuestionSeq, setSelectedQuestionSeq] = useState<number | null>(null);

  const { open, modelId, evalId, evalDate } = drawerState;

  const { data: resultListByEvalDate, isFetching: isFetchingResultListByEvalDate } = useGetEvaluationResultsByEvalDate({
    params: { modelId, evalId, evalDate },
    queryOptions: { enabled: open && !!modelId && !!evalId && !!evalDate },
  });

  const { data: resultListByEvalDateAndQuestionSeq, isFetching: isFetchingResultListByEvalDateAndQuestionSeq } = useGetEvaluationResultsByEvalDateAndQuestionSeq({
    params: { modelId, evalId, evalDate, questionSeq: selectedQuestionSeq },
    queryOptions: { enabled: open && !!modelId && !!evalId && !!evalDate && selectedQuestionSeq != null },
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
    setSelectedQuestionSeq(null);
  };

  const handleLeftGridRowClicked = (event: RowClickedEvent<EvaluationResultListByEvalDateItem>) => {
    const questionSeq = event.data?.questionSeq ?? null;
    setSelectedQuestionSeq(questionSeq);
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
      size={1100}
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
              {/* 남은 영역 border-b 처리용 */}
              <div className="w-full h-full border-b-1 border-b-[#E9EBEC]"></div>
            </TabsList>
            <TabsContent value="tab1" className="w-full h-full p-4">
              <div className="w-full h-full">
                <ReactECharts key={createUUID()} option={createResultTrendChartOption(resultListByEvalDate)} style={{ height: '100%', width: '100%' }} />
              </div>
            </TabsContent>
            <TabsContent value="tab2" className="w-full h-full p-4">
              <div className="w-full h-full">
                <ReactECharts key={createUUID()} option={createResultDistributionChartOption(resultListByEvalDate)} style={{ height: '100%', width: '100%' }} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <Divider className="!m-0" />
        <div className="flex h-full flex-1 min-h-0 overflow-y-auto">
          <div className="w-full h-full flex flex-col p-4 gap-2">
            <span className="text-lg text-[#495057] font-bold">평가셋 실행결과</span>
            <div className="w-full h-full">
              <AgGridReact<EvaluationResultListByEvalDateItem>
                rowData={resultListByEvalDate}
                columnDefs={leftColumnDefs}
                gridOptions={{
                  ...gridOptions,
                  sideBar: false,
                  rowNumbers: false,
                  pagination: false,
                }}
                loading={isFetchingResultListByEvalDate}
                onRowClicked={handleLeftGridRowClicked}
              />
            </div>
          </div>
          <Divider orientation="vertical" className="!m-0 !h-full" />
          <div className="w-[360px] flex-shrink-0 h-full flex flex-col p-4 gap-2">
            <span className="text-lg text-[#495057] font-bold">결과 상세</span>
            <div className="w-full h-full">
              <AgGridReact<EvaluationResultListByEvalDateAndQuestionSeqItem>
                rowData={resultListByEvalDateAndQuestionSeq}
                columnDefs={rightColumnDefs}
                gridOptions={{
                  ...gridOptions,
                  sideBar: false,
                  rowNumbers: false,
                  pagination: false,
                }}
                loading={isFetchingResultListByEvalDate || isFetchingResultListByEvalDateAndQuestionSeq}
              />
            </div>
          </div>
        </div>
        <Divider className="!m-0" />
      </div>
    </Drawer>
  );
});

export default EvaluationResultDetailDrawer;
