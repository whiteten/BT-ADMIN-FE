import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { toast } from '@/shared-util';
import { DOMAIN_LABELS, VIZ_LABELS } from '../../constants/monitoringConstants';
import { templateWidgetKeys, useDeleteTemplateWidget, useGetTemplateWidgets } from '../../hooks/useTemplateWidgetQueries';
import type { TemplateWidgetDefinitionListItem, VizType } from '../../types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const DOMAIN_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'IR', label: 'IR (IVR)' },
];

const DOMAIN_COLOR: Record<string, string> = { IC: 'blue', IE: 'green', IR: 'gold' };

/**
 * 템플릿 위젯 탭 — 데이터셋 기반 재사용 위젯 정의. 등록·수정·삭제(CRUD) 모두 가능.
 * 등록/수정은 4단계 빌더(데이터셋+시각화 → 구성 → 매핑 → 미리보기)로 이동.
 */
export default function TemplateWidgetTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  const [domainFilter, setDomainFilter] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const { data: list, isLoading } = useGetTemplateWidgets();
  const { mutate: deleteTemplate } = useDeleteTemplateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateWidgetKeys.list._def });
        toast.success('템플릿 위젯이 삭제되었습니다.');
      },
    },
  });

  const handleCreate = () => navigate('/insight/monitoring/widgets/template/new');
  const handleEdit = (id?: number) => id && navigate(`/insight/monitoring/widgets/template/${id}/edit`);
  const handleDelete = (item: TemplateWidgetDefinitionListItem) => modal.confirm.delete({ onOk: () => deleteTemplate(item.templateWidgetId) });

  const columnDefs: ColDef<TemplateWidgetDefinitionListItem>[] = [
    { headerName: '위젯명', field: 'widgetName', flex: 1, minWidth: 180 },
    { headerName: '데이터셋', field: 'datasetName', flex: 1, minWidth: 160, valueFormatter: (p) => (p.value as string) || '-' },
    {
      headerName: '도메인',
      field: 'domainCode',
      maxWidth: 110,
      cellRenderer: (params: ICellRendererParams<TemplateWidgetDefinitionListItem>) => {
        const v = params.value as string | undefined;
        if (!v) return '-';
        return (
          <Tag color={DOMAIN_COLOR[v]} className="!m-0 !text-[10.5px]">
            {v} · {DOMAIN_LABELS[v as keyof typeof DOMAIN_LABELS] ?? v}
          </Tag>
        );
      },
    },
    {
      headerName: '시각화',
      field: 'visualizations',
      flex: 1,
      minWidth: 200,
      sortable: false,
      cellRenderer: (params: ICellRendererParams<TemplateWidgetDefinitionListItem>) => {
        const d = params.data;
        if (!d) return null;
        return (
          <span className="flex flex-wrap items-center gap-1">
            {d.visualizations.map((v) => (
              <Tag key={v} color={v === d.defaultViz ? 'geekblue' : 'default'} className="!m-0 !text-[10.5px]">
                {v === d.defaultViz ? '★ ' : ''}
                {VIZ_LABELS[v as VizType] ?? v}
              </Tag>
            ))}
          </span>
        );
      },
    },
    {
      headerName: '갱신',
      field: 'refreshInterval',
      maxWidth: 90,
      valueFormatter: (p) => (p.value != null ? `${p.value}초` : '-'),
    },
    {
      headerName: '수정일',
      field: 'updatedAt',
      maxWidth: 170,
      valueFormatter: (p) => (p.value ? dayjs(p.value as string).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      headerName: '',
      maxWidth: 80,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<TemplateWidgetDefinitionListItem>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(data);
            }}
            title="삭제"
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  const filteredList = useMemo(() => {
    if (!list) return [];
    return list.filter((t) => {
      if (domainFilter && t.domainCode !== domainFilter) return false;
      if (searchValue.trim()) {
        const kw = searchValue.toLowerCase();
        return t.widgetName.toLowerCase().includes(kw) || (t.datasetName ?? '').toLowerCase().includes(kw);
      }
      return true;
    });
  }, [list, domainFilter, searchValue]);

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="위젯명·데이터셋 검색" allowClear />
          <Select value={domainFilter} onChange={setDomainFilter} options={DOMAIN_FILTER_OPTIONS} className="!max-w-[180px] !min-w-[160px]" popupMatchSelectWidth={false} />
        </div>
        <Button type="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={handleCreate}>
          추가
        </Button>
      </header>
      <div className="w-full h-full">
        <AgGridReact<TemplateWidgetDefinitionListItem>
          rowData={filteredList}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          onRowDoubleClicked={(e) => handleEdit(e.data?.templateWidgetId)}
        />
      </div>
    </div>
  );
}
