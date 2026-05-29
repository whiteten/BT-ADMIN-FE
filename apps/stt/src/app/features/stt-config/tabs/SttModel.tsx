import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dropdown, Input, type MenuProps, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { BarChart2, MoreVertical, Pause, Play } from 'lucide-react';
import { toast } from '@/shared-util';
import SttModelDrawer, { type SttModelDrawerRef } from '../components/SttModelDrawer';
import SttModelRecogDrawer, { type SttModelRecogDrawerRef } from '../components/SttModelRecogDrawer';
import { useGetCodes } from '../hooks/useCommonQueries';
import { modelQueryKeys, useDeleteSttModel, useGetSttModelList } from '../hooks/useModelQueries';
import type { ModelTunningResult, ModelTunningType, SttModelItem } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const MODEL_TYPE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '수동', value: 0 },
  { label: '자동', value: 1 },
];

const MODEL_TYPE_CONFIG: Record<ModelTunningType, { label: string; className: string }> = {
  0: { label: '수동', className: 'text-violet-600 bg-violet-50' },
  1: { label: '자동', className: 'text-sky-600 bg-sky-50' },
};

const MODEL_STATUS_CONFIG: Record<ModelTunningResult, { label: string; className: string }> = {
  10: { label: '학습요청', className: 'text-gray-500 bg-gray-100' },
  20: { label: '학습중', className: 'text-blue-600 bg-blue-50' },
  30: { label: '학습실패', className: 'text-red-500 bg-red-50' },
  50: { label: '학습완료', className: 'text-emerald-600 bg-emerald-50' },
};

interface ModelCardProps {
  model: SttModelItem;
  onDetail: (model: SttModelItem) => void;
  onMeasure: (model: SttModelItem) => void;
  onDelete: (model: SttModelItem) => void;
}

function ModelCard({ model, onDetail, onMeasure, onDelete }: ModelCardProps) {
  const typeConfig = MODEL_TYPE_CONFIG[model.tunningType];
  const statusConfig = MODEL_STATUS_CONFIG[model.tunningResult];

  const menuItems: MenuProps['items'] = [
    { key: 'detail', label: '상세보기', onClick: () => onDetail(model) },
    { key: 'delete', label: '삭제', danger: true, onClick: () => onDelete(model) },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 transition-all hover:shadow-md hover:border-[var(--color-bt-primary)]/50 flex flex-col">
      {/* Body */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-2 px-5 pt-5 pb-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-[#212529] truncate">{model.modelVerName}</p>
            <p className="text-[13px] mt-1.5 line-clamp-2 leading-relaxed whitespace-pre-line h-[2.875rem] overflow-hidden text-gray-400">
              {model.modelDesc || <span className="text-gray-300">설명 없음</span>}
            </p>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                <MoreVertical className="size-4 text-gray-400" />
              </button>
            </Dropdown>
          </div>
        </div>

        {/* Tags */}
        <div className="px-5 pb-5 flex items-center gap-2">
          <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[13px] font-medium ${statusConfig.className}`}>{statusConfig.label}</span>
          <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[13px] font-medium ${typeConfig.className}`}>{typeConfig.label}</span>
          <span className="text-xs text-gray-400 ml-auto">{model.workTime ? dayjs(model.workTime).format('YYYY-MM-DD HH:mm:ss') : '—'}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 h-14 flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-gray-400">인식률</span>
            <span className="text-base font-bold text-[#212529]">{model.recogRate ?? '—'}</span>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] text-[13px] font-medium hover:bg-sky-50 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onMeasure(model);
          }}
        >
          <BarChart2 size={12} />
          인식률 측정
        </button>
      </div>
    </div>
  );
}

export default function SttModel() {
  const drawerRef = useRef<SttModelDrawerRef>(null);
  const recogDrawerRef = useRef<SttModelRecogDrawerRef>(null);
  const queryClient = useQueryClient();
  const modal = useModal();
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState<ModelTunningType | ''>('');
  const [engineCode, setEngineCode] = useState('');
  const [searchParams, setSearchParams] = useState<{ engineCode: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(3);

  const { data: engines } = useGetCodes({ params: { classCd: 'ENGINE_KIND' } });
  const engineOptions = engines?.map((e) => ({ label: e.value, value: e.code })) ?? [];

  useEffect(() => {
    if (engines && engines.length > 0) {
      setEngineCode((prev) => {
        const resolved = prev || engines[0].code;
        setSearchParams({ engineCode: resolved });
        return resolved;
      });
    }
  }, [engines]);

  const { data: rawData = [], isFetching } = useGetSttModelList({
    params: searchParams,
    queryOptions: { refetchInterval: autoRefresh ? refreshSeconds * 1000 : false },
  });

  const { mutate: deleteModel } = useDeleteSttModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getSttModelList._def });
      },
      onError: () => toast.error('삭제에 실패했습니다.'),
    },
  });

  const rowData = rawData.filter((model) => {
    if (modelName && !model.modelVerName.includes(modelName)) return false;
    if (modelType !== '' && model.tunningType !== modelType) return false;
    return true;
  });

  const handleEngineChange = (value: string) => {
    setEngineCode(value);
    setSearchParams({ engineCode: value });
  };

  const handleDetail = (model: SttModelItem) => {
    drawerRef.current?.openEdit(model, engineCode);
  };

  const handleMeasure = (model: SttModelItem) => {
    if (model.tunningResult !== 50) {
      toast.warning('학습이 완료된 모델만 인식률 측정이 가능합니다.');
      return;
    }
    recogDrawerRef.current?.open(model, engineCode);
  };

  const handleDelete = (model: SttModelItem) => {
    modal.confirm.delete({ onOk: () => deleteModel(model.modelVerId) });
  };

  const handleCreate = () => {
    drawerRef.current?.open(engineCode);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <SttModelDrawer ref={drawerRef} onCreateSuccess={() => setAutoRefresh(true)} />
      <SttModelRecogDrawer ref={recogDrawerRef} />
      {/* 검색 필터 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-[#495057] shrink-0">모델명</span>
          <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="모델명을 입력하세요" style={{ width: 200 }} />
          <span className="text-sm font-medium text-[#495057] shrink-0">모델 타입</span>
          <Select value={modelType} onChange={setModelType} options={MODEL_TYPE_OPTIONS} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode || undefined} onChange={handleEngineChange} options={engineOptions} style={{ width: 140 }} />
          <span className="text-sm font-medium text-[#495057] shrink-0">모니터링</span>
          <Select
            value={refreshSeconds}
            onChange={setRefreshSeconds}
            options={[
              { label: '3초', value: 3 },
              { label: '5초', value: 5 },
              { label: '10초', value: 10 },
              { label: '30초', value: 30 },
            ]}
            style={{ width: 72 }}
          />
          <Tooltip title={autoRefresh ? '모니터링 중지' : '모니터링 시작'}>
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center justify-center w-9 h-9 rounded border transition-colors ${autoRefresh ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white' : 'border-[var(--color-bt-primary)] text-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary)]/5'}`}
            >
              {autoRefresh ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </Tooltip>
          <Button type="primary" onClick={handleCreate} loading={isFetching}>
            모델 생성
          </Button>
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rowData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">조회된 모델이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {rowData.map((model) => (
              <ModelCard key={model.modelVerId} model={model} onDetail={handleDetail} onMeasure={handleMeasure} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
