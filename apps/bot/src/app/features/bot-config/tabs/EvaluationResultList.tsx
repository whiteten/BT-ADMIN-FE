import { useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Slider } from 'antd';
import dayjs from 'dayjs';
import EvaluationResultStatusBadge from '../components/EvaluationResultStatusBadge';
import type { EvaluationResultItem, EvaluationResultStatus } from '../types/evaluation';
import { IconSearch, IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// 더미 데이터
const DUMMY_DATA: EvaluationResultItem[] = [
  { id: '1', evaluationDate: '2025-11-21 00:00:00', accuracy: 99, confidence: 99, status: 2 },
  { id: '2', evaluationDate: '2025-11-21 12:11:54', accuracy: 85, confidence: 95, status: 1 },
  { id: '3', evaluationDate: '2025-11-21 00:00:00', accuracy: 0, confidence: 0, status: 0 },
  { id: '4', evaluationDate: '2025-11-21 00:00:00', accuracy: 99, confidence: 99, status: 2 },
  { id: '5', evaluationDate: '2025-11-21 12:11:54', accuracy: 85, confidence: 95, status: 1 },
  { id: '6', evaluationDate: '2025-11-21 00:00:00', accuracy: 0, confidence: 0, status: 0 },
  { id: '7', evaluationDate: '2025-11-21 00:00:00', accuracy: 99, confidence: 99, status: 2 },
  { id: '8', evaluationDate: '2025-11-21 12:11:54', accuracy: 85, confidence: 95, status: 1 },
  { id: '9', evaluationDate: '2025-11-21 00:00:00', accuracy: 0, confidence: 0, status: 0 },
  { id: '10', evaluationDate: '2025-11-21 00:00:00', accuracy: 99, confidence: 99, status: 2 },
  { id: '11', evaluationDate: '2025-11-21 12:11:54', accuracy: 85, confidence: 95, status: 1 },
  { id: '12', evaluationDate: '2025-11-21 00:00:00', accuracy: 0, confidence: 0, status: 0 },
];

export default function EvaluationResultList() {
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [filterColumn, setFilterColumn] = useState('evaluationDate');
  const [searchValue, setSearchValue] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleViewDetail = (data: EvaluationResultItem) => {
    // TODO: 상세 페이지 이동 또는 모달 표시
    alert(`상세보기: ${data.id}`);
  };

  const handleDelete = (data: EvaluationResultItem) => {
    modal.confirm.delete({
      onOk: () => {
        // TODO: 삭제 API 연동
        alert(`삭제: ${data.id}`);
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

  const columnDefs: ColDef<EvaluationResultItem>[] = [
    { headerName: 'ID', field: 'id', hide: true },
    {
      headerName: '평가일',
      field: 'evaluationDate',
      flex: 1,
      minWidth: 180,
      valueFormatter: (params: { value: string }) => (params.value ? dayjs(params.value).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      headerName: '정확도',
      field: 'accuracy',
      maxWidth: 120,
      valueFormatter: (params: { value: number }) => `${params.value}%`,
    },
    {
      headerName: '신뢰도',
      field: 'confidence',
      maxWidth: 120,
      valueFormatter: (params: { value: number }) => `${params.value}%`,
    },
    {
      headerName: '상태',
      field: 'status',
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
      cellRenderer: (params: ICellRendererParams<EvaluationResultItem>) => {
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
      cellRenderer: (params: ICellRendererParams<EvaluationResultItem>) => {
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
    const value = item[filterColumn as keyof EvaluationResultItem];
    return String(value).toLowerCase().includes(keyword);
  });

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            defaultValue="evaluationDate"
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '평가일', value: 'evaluationDate' },
              { label: '상태', value: 'status' },
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
        <AgGridReact<EvaluationResultItem> rowData={filteredData} columnDefs={columnDefs} gridOptions={gridOptions} />
      </div>
    </div>
  );
}
