import { useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Slider } from 'antd';
import dayjs from 'dayjs';
import EvaluationResultStatusBadge from '../components/EvaluationResultStatusBadge';
import type { EvaluationResultListItem, EvaluationResultStatus } from '../types/evaluation';
import { IconSearch, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// 복합키 생성 함수 (evalId, evalDate, questionSeq, intent)
const getRowId = (data: EvaluationResultListItem) => `${data.evalId}_${data.evalDate}_${data.questionSeq}_${data.intent}`;

// 더미 데이터
const DUMMY_DATA: EvaluationResultListItem[] = [
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 1, intent: 'intent1', answer: '답변1', confidence: 99, threshold: 80, resultStatus: '완료' },
  { evalId: '1', evalDate: '2025-11-21 12:11:54', questionSeq: 2, intent: 'intent2', answer: '답변2', confidence: 95, threshold: 80, resultStatus: '진행중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 3, intent: 'intent3', answer: '답변3', confidence: 0, threshold: 80, resultStatus: '대기중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 4, intent: 'intent4', answer: '답변4', confidence: 99, threshold: 80, resultStatus: '완료' },
  { evalId: '1', evalDate: '2025-11-21 12:11:54', questionSeq: 5, intent: 'intent5', answer: '답변5', confidence: 95, threshold: 80, resultStatus: '진행중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 6, intent: 'intent6', answer: '답변6', confidence: 0, threshold: 80, resultStatus: '대기중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 7, intent: 'intent7', answer: '답변7', confidence: 99, threshold: 80, resultStatus: '완료' },
  { evalId: '1', evalDate: '2025-11-21 12:11:54', questionSeq: 8, intent: 'intent8', answer: '답변8', confidence: 95, threshold: 80, resultStatus: '진행중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 9, intent: 'intent9', answer: '답변9', confidence: 0, threshold: 80, resultStatus: '대기중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 10, intent: 'intent10', answer: '답변10', confidence: 99, threshold: 80, resultStatus: '완료' },
  { evalId: '1', evalDate: '2025-11-21 12:11:54', questionSeq: 11, intent: 'intent11', answer: '답변11', confidence: 95, threshold: 80, resultStatus: '진행중' },
  { evalId: '1', evalDate: '2025-11-21 00:00:00', questionSeq: 12, intent: 'intent12', answer: '답변12', confidence: 0, threshold: 80, resultStatus: '대기중' },
];

export default function EvaluationResultList() {
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [filterColumn, setFilterColumn] = useState('evalDate');
  const [searchValue, setSearchValue] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleViewDetail = (data: EvaluationResultListItem) => {
    // TODO: 상세 페이지 이동 또는 모달 표시
    alert(`상세보기: ${getRowId(data)}`);
  };

  const handleDelete = (data: EvaluationResultListItem) => {
    modal.confirm.delete({
      onOk: () => {
        // TODO: 삭제 API 연동
        alert(`삭제: ${getRowId(data)}`);
      },
    });
  };

  const handleExecuteEvaluation = () => {
    modal.confirm.execute({
      onOk: () => {
        // TODO: 평가 실행 API 연동
        alert(`평가 실행 - 신뢰도 기준: ${confidenceThreshold}%`);
      },
      options: {
        content: `신뢰도 ${confidenceThreshold}% 기준으로 평가를 실행하시겠습니까?`,
      },
    });
  };

  const columnDefs: ColDef<EvaluationResultListItem>[] = [
    { headerName: 'EvalId', field: 'evalId', hide: true },
    { headerName: 'Question Seq', field: 'questionSeq', hide: true },
    { headerName: 'Intent', field: 'intent', hide: true },
    {
      headerName: '평가일',
      field: 'evalDate',
      flex: 1,
      minWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '정확도',
      field: 'confidence',
      maxWidth: 120,
      valueFormatter: (params: { value: number }) => `${params.value}%`,
    },
    {
      headerName: '신뢰도',
      field: 'threshold',
      maxWidth: 120,
      valueFormatter: (params: { value: number }) => `${params.value}%`,
    },
    {
      headerName: '상태',
      field: 'resultStatus',
      maxWidth: 120,
      cellRenderer: (params: { value: EvaluationResultStatus }) => <EvaluationResultStatusBadge status={params.value} />,
    },
    {
      headerName: '',
      colId: 'view',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EvaluationResultListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetail(data);
            }}
          >
            <IconSearch className="size-5 text-[#888B9A] hover:cursor-pointer" />
          </button>
        );
      },
    },
    {
      headerName: '',
      colId: 'delete',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<EvaluationResultListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  // 검색 필터링
  const filteredData = DUMMY_DATA.filter((item) => {
    if (!searchValue.trim()) return true;
    const keyword = searchValue.toLowerCase();
    const value = item[filterColumn as keyof EvaluationResultListItem];
    return String(value).toLowerCase().includes(keyword);
  });

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="evalDate"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '평가일', value: 'evalDate' },
              { label: '상태', value: 'resultStatus' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#495057] whitespace-nowrap">신뢰도(평가용)</span>
            <Slider
              min={0}
              max={100}
              step={1}
              value={confidenceThreshold}
              onChange={setConfidenceThreshold}
              tooltip={{ formatter: (value) => `${value}%` }}
              className="!w-[200px]"
            />
            <span className="text-sm text-[#405189] font-medium min-w-[40px]">{confidenceThreshold}%</span>
          </div>
          <Button variant="solid" color="cyan" onClick={handleExecuteEvaluation}>
            평가실행
          </Button>
        </div>
      </header>
      <div className="w-full h-full">
        <AgGridReact<EvaluationResultListItem> rowData={filteredData} columnDefs={columnDefs} gridOptions={gridOptions} />
      </div>
    </div>
  );
}
