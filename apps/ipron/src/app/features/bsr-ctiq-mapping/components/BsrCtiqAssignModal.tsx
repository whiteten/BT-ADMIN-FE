/**
 * BSR 그룹별 CTI큐 배정 팝업 (AS-IS SWAT IPR20S3060 배정팝업).
 *
 * 구성:
 *  - 검색 조건: BSR 그룹 필터(전체/미지정/그룹) + 업무그룹 필터 + GDN 번호 범위(시작~끝)
 *  - 검색 결과 ag-Grid (rowSelection 체크박스 단일)
 *  - 하단: 대상 BSR 그룹 선택 콤보 + 배정 버튼
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact, type AgGridReact as AgGridReactType } from 'ag-grid-react';
import { Button, Form, Input, Modal, Select } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import type { BsrCtiqMappingResponse, BsrGroupComboItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  open: boolean;
  bsrGroupCombos: BsrGroupComboItem[];
  currentBsrGroupId: number | null | undefined;
  onClose: () => void;
  onSearch: (params: { bsrGroupId?: string; gdnNoStart?: string; gdnNoEnd?: string }) => void;
  searchResult: BsrCtiqMappingResponse[];
  isSearching: boolean;
  onAssign: (targetBsrGroupId: number, ctiqIds: number[]) => void;
  isAssigning: boolean;
}

interface SearchForm {
  bsrGroupFilter: string;
  treeNameFilter?: string;
  gdnNoStart?: string;
  gdnNoEnd?: string;
}

// colDefs: 체크박스는 rowSelection prop 으로만 표시 (headerCheckboxSelection/checkboxSelection 컬럼 제거로 중복 방지)
const colDefs: ColDef<BsrCtiqMappingResponse>[] = [
  {
    field: 'bsrGroupName',
    headerName: '배정된 BSR 그룹 이름',
    width: 170,
    valueFormatter: ({ value }) => value ?? '미배정',
  },
  {
    field: 'treeName',
    headerName: '업무그룹명',
    width: 130,
    valueFormatter: ({ value }) => (value ? String(value) : '미배정'),
  },
  { field: 'ctiqName', headerName: 'CTI큐명', flex: 1 },
  { field: 'gdnNo', headerName: '그룹DN 번호', width: 120 },
  { field: 'gdnName', headerName: '그룹DN 명', width: 130 },
];

export default function BsrCtiqAssignModal({ open, bsrGroupCombos, currentBsrGroupId, onClose, onSearch, searchResult, isSearching, onAssign, isAssigning }: Props) {
  const [form] = Form.useForm<SearchForm>();
  const [selectedCtiqIds, setSelectedCtiqIds] = useState<number[]>([]);
  const [targetBsrGroupId, setTargetBsrGroupId] = useState<string>('');
  const [treeNameFilter, setTreeNameFilter] = useState<string>('');
  const gridRef = useRef<AgGridReactType<BsrCtiqMappingResponse>>(null);
  const { gridOptions } = useAggridOptions();

  // 팝업 열릴 때 초기화
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ bsrGroupFilter: '0', treeNameFilter: '', gdnNoStart: '', gdnNoEnd: '' });
    setSelectedCtiqIds([]);
    setTreeNameFilter('');
    setTargetBsrGroupId(currentBsrGroupId ? String(currentBsrGroupId) : '');
    // 자동 전체조회
    onSearch({ bsrGroupId: '0' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // searchResult에서 업무그룹명 목록 추출 (중복 제거)
  const treeNameOptions = useMemo(() => {
    const names = Array.from(new Set(searchResult.map((r) => r.treeName).filter(Boolean))) as string[];
    return names.map((n) => ({ value: n, label: n }));
  }, [searchResult]);

  // 업무그룹 필터 적용
  const filteredResult = useMemo(() => {
    if (!treeNameFilter) return searchResult;
    return searchResult.filter((r) => r.treeName === treeNameFilter);
  }, [searchResult, treeNameFilter]);

  const handleSearch = useCallback(() => {
    const vals = form.getFieldsValue();
    setTreeNameFilter(vals.treeNameFilter || '');
    onSearch({
      bsrGroupId: vals.bsrGroupFilter,
      gdnNoStart: vals.gdnNoStart || undefined,
      gdnNoEnd: vals.gdnNoEnd || undefined,
    });
    setSelectedCtiqIds([]);
  }, [form, onSearch]);

  const handleAssign = useCallback(() => {
    if (selectedCtiqIds.length === 0) {
      toast.warning('CTI큐를 선택하세요');
      return;
    }
    const targetId = Number(targetBsrGroupId);
    if (!targetBsrGroupId || isNaN(targetId) || targetId < 2) {
      toast.warning('대상 BSR 그룹을 선택하세요');
      return;
    }
    onAssign(targetId, selectedCtiqIds);
  }, [selectedCtiqIds, targetBsrGroupId, onAssign]);

  // 전체/미지정/그룹 구분 콤보 (SWAT selcomboBsrGroup 3-union)
  const filterOptions = [
    { value: '0', label: '전체' },
    { value: '1', label: '미지정' },
    ...bsrGroupCombos.filter((c) => Number(c.value) >= 2).map((c) => ({ value: c.value, label: c.name })),
  ];

  // 대상 그룹 콤보 (미지정·전체 제외)
  const targetOptions = bsrGroupCombos.filter((c) => Number(c.value) >= 2).map((c) => ({ value: c.value, label: c.name }));

  return (
    <Modal title="CTI큐 BSR 그룹 배정" open={open} onCancel={onClose} width={900} footer={null} destroyOnClose>
      {/* 검색 폼 */}
      <Form form={form} layout="inline" className="mb-3 gap-2 flex-wrap">
        <Form.Item name="bsrGroupFilter" label="BSR 그룹" className="mb-2">
          <Select style={{ width: 160 }} options={filterOptions} />
        </Form.Item>
        <Form.Item name="treeNameFilter" label="업무그룹" className="mb-2">
          <Select style={{ width: 150 }} allowClear placeholder="전체" options={treeNameOptions} onChange={(v) => setTreeNameFilter(v ?? '')} />
        </Form.Item>
        <Form.Item name="gdnNoStart" label="그룹DN 번호" className="mb-2">
          <Input style={{ width: 100 }} placeholder="시작" maxLength={40} />
        </Form.Item>
        <Form.Item name="gdnNoEnd" label="~" className="mb-2">
          <Input style={{ width: 100 }} placeholder="끝" maxLength={40} />
        </Form.Item>
        <Form.Item className="mb-2">
          <Button icon={<Search className="size-3.5" />} onClick={handleSearch} loading={isSearching}>
            검색
          </Button>
        </Form.Item>
      </Form>

      {/* 검색 결과 그리드 */}
      <div style={{ height: 340 }}>
        <AgGridReact<BsrCtiqMappingResponse>
          ref={gridRef}
          {...gridOptions}
          rowData={filteredResult}
          columnDefs={colDefs}
          loading={isSearching}
          rowSelection={{ mode: 'multiRow', enableClickSelection: true, checkboxes: true, headerCheckbox: true }}
          onSelectionChanged={(e) => setSelectedCtiqIds(e.api.getSelectedRows().map((r) => r.ctiqId))}
        />
      </div>

      {/* 하단 배정 바 */}
      <div className="flex items-center gap-3 mt-4 border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-600 flex-shrink-0">
          선택된 CTI큐: <strong>{selectedCtiqIds.length}</strong>건
        </span>
        <span className="text-sm text-gray-500 flex-shrink-0">대상 BSR 그룹</span>
        <Select style={{ width: 220 }} placeholder="BSR 그룹 선택" value={targetBsrGroupId || undefined} onChange={(v) => setTargetBsrGroupId(v)} options={targetOptions} />
        <Button type="primary" loading={isAssigning} onClick={handleAssign} disabled={selectedCtiqIds.length === 0 || !targetBsrGroupId}>
          배정
        </Button>
        <Button onClick={onClose} className="ml-auto">
          닫기
        </Button>
      </div>
    </Modal>
  );
}
