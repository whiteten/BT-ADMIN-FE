import { useEffect, useRef, useState } from 'react';
import { Button, Card, Dropdown, Input, type MenuProps, Select } from 'antd';
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
  0: { label: '수동', className: 'text-violet-600 bg-violet-100' },
  1: { label: '자동', className: 'text-sky-600 bg-sky-100' },
};

const TRAIN_STATUS_CONFIG: Record<ModelTunningResult, { label: string; className: string }> = {
  10: { label: '학습요청', className: 'text-gray-500 bg-gray-100' },
  20: { label: '학습중', className: 'text-blue-600 bg-blue-100' },
  30: { label: '학습실패', className: 'text-red-500 bg-red-100' },
  50: { label: '학습완료', className: 'text-emerald-600 bg-emerald-100' },
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

  const title = (
    <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => onSelect(model.modelVerId)}>
      {model.modelVerName}
    </span>
  );

  const extra = (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
          <MoreVertical className="size-4 text-gray-400" />
        </button>
      </Dropdown>
    </div>
  );

  return (
    <Card
      title={title}
      extra={extra}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      className={`hover:!border-[var(--color-bt-primary)] cursor-pointer transition-all ${isSelected ? '!border-[var(--color-bt-primary)] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : ''}`}
      onClick={() => onSelect(model.modelVerId)}
    >
      <div className="flex flex-col text-[#495057] gap-2 text-sm">
        <div className="flex items-center">
          <span className="w-[80px] text-gray-400">타입</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.className}`}>{typeConfig.label}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[80px] text-gray-400">상태</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.className}`}>{statusConfig.label}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[80px] text-gray-400">인식률</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-yellow-600 bg-yellow-100">{model.recogRate ?? '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[80px] text-gray-400">생성 날짜</span>
          <span>{model.workTime}</span>
        </div>
      </div>
    </Card>
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
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
