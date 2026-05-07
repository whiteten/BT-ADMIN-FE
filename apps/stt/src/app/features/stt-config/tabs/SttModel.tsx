import { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Input, type MenuProps, Select } from 'antd';
import { MoreVertical } from 'lucide-react';
import { toast } from '@/shared-util';
import SttModelDrawer, { type SttModelDrawerRef } from '../components/SttModelDrawer';
import { useGetCodes } from '../hooks/useCommonQueries';
import { useGetSttModelList } from '../hooks/useModelQueries';
import type { ModelTunningResult, ModelTunningType, SttModelItem } from '../types';

const MODEL_TYPE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '수동', value: 0 },
  { label: '자동', value: 1 },
];

const MODEL_TYPE_CONFIG: Record<ModelTunningType, { label: string; className: string }> = {
  0: { label: '수동', className: 'text-violet-600 bg-violet-50' },
  1: { label: '자동', className: 'text-sky-600 bg-sky-50' },
};

const TRAIN_STATUS_CONFIG: Record<ModelTunningResult, { label: string; className: string }> = {
  10: { label: '학습요청', className: 'text-gray-500 bg-gray-100' },
  20: { label: '학습중', className: 'text-blue-600 bg-blue-50' },
  30: { label: '학습실패', className: 'text-red-500 bg-red-50' },
  50: { label: '학습완료', className: 'text-emerald-600 bg-emerald-50' },
};

interface ModelCardProps {
  model: SttModelItem;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
  onDetail: (model: SttModelItem) => void;
  onDelete: (model: SttModelItem) => void;
}

function ModelCard({ model, isSelected, onSelect, onDetail, onDelete }: ModelCardProps) {
  const typeConfig = MODEL_TYPE_CONFIG[model.tunningType];
  const statusConfig = TRAIN_STATUS_CONFIG[model.tunningResult];

  const menuItems: MenuProps['items'] = [
    { key: 'detail', label: '인식률측정', onClick: () => onDetail(model) },
    { key: 'delete', label: '삭제', danger: true, onClick: () => onDelete(model) },
  ];

  return (
    <div
      className={`bg-white rounded-xl border transition-all cursor-pointer hover:shadow-md
        ${isSelected ? 'border-[var(--color-bt-primary)] shadow-[0_0_0_3px_rgba(64,81,137,0.1)]' : 'border-gray-200 hover:border-[var(--color-bt-primary)]/50'}`}
      onClick={() => onSelect(model.modelVerId)}
    >
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#212529] truncate">{model.modelVerName}</p>
          {model.modelDesc ? <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{model.modelDesc}</p> : <p className="text-xs text-gray-300 mt-1">설명 없음</p>}
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
      <div className="px-4 pb-4 flex items-center gap-1.5">
        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium ${statusConfig.className}`}>{statusConfig.label}</span>
        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium ${typeConfig.className}`}>{typeConfig.label}</span>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{model.workTime}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">인식률</span>
          <span className="text-sm font-bold text-[#212529]">{model.recogRate != null ? model.recogRate : '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default function SttModel() {
  const drawerRef = useRef<SttModelDrawerRef>(null);
  const [modelName, setModelName] = useState('');
  const [modelType, setModelType] = useState<ModelTunningType | ''>('');
  const [engineCode, setEngineCode] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<{ engineCode: string } | null>(null);

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

  const { data: rawData = [], isFetching } = useGetSttModelList({ params: searchParams });

  const rowData = rawData.filter((model) => {
    if (modelName && !model.modelVerName.includes(modelName)) return false;
    if (modelType !== '' && model.tunningType !== modelType) return false;
    return true;
  });

  const handleEngineChange = (value: string) => {
    setEngineCode(value);
    setSearchParams({ engineCode: value });
  };

  const handleDetail = (_model: SttModelItem) => {
    toast.warning('상세보기 기능은 준비 중입니다.');
  };

  const handleDelete = (_model: SttModelItem) => {
    toast.warning('삭제 기능은 준비 중입니다.');
  };

  const handleCreate = () => {
    drawerRef.current?.open(engineCode);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <SttModelDrawer ref={drawerRef} />
      {/* 검색 필터 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">모델명</span>
          <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="모델명을 입력하세요" style={{ width: 200 }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">모델 타입</span>
          <Select value={modelType} onChange={setModelType} options={MODEL_TYPE_OPTIONS} style={{ width: 120 }} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-[#495057] shrink-0">엔진</span>
          <Select value={engineCode || undefined} onChange={handleEngineChange} options={engineOptions} style={{ width: 140 }} />
        </div>
        <Button type="primary" onClick={handleCreate} loading={isFetching}>
          모델 생성
        </Button>
      </div>

      {/* 카드 그리드 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {rowData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">조회된 모델이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {rowData.map((model) => (
              <ModelCard
                key={model.modelVerId}
                model={model}
                isSelected={selectedModelId === model.modelVerId}
                onSelect={setSelectedModelId}
                onDetail={handleDetail}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
