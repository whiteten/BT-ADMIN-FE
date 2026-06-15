import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ModelCard from '../../features/agent-config/components/ModelCard';
import { modelQueryKeys, useDeleteModel, useGetModels } from '../../features/agent-config/hooks/useModelQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: 'AI 모델', path: '/aoe/agent-config/model' },
  { title: 'AI 모델 목록', path: '/aoe/agent-config/model/list' },
];

const FILTER_OPTIONS = [
  { label: '모델명', value: 'modelName' },
  { label: '모델 타입', value: 'modelTypeName' },
];

export default function ModelList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [filterColumn, setFilterColumn] = useState('modelName');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: models, isLoading } = useGetModels({});

  const { mutate: deleteModel } = useDeleteModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModels().queryKey });
      },
      onError: (error) => Log.warn('deleteModel failed', error),
    },
  });

  const modelList = models ?? [];
  const filteredList = searchValue.trim()
    ? modelList.filter((model) => {
        const value = model[filterColumn as keyof typeof model];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    : modelList;

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  const handleDetail = (modelId: string) => {
    navigate(`../${modelId}`);
  };

  const handleDelete = (modelId: string) => {
    modal.confirm.delete({
      onOk: () => deleteModel({ modelId }),
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select value={filterColumn} onChange={handleColumnChange} options={FILTER_OPTIONS} className="!max-w-[150px] !min-w-[120px]" popupMatchSelectWidth={false} />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <Button type="primary" onClick={handleClickCreateBtn}>
          추가
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto pt-2 -mt-2">
          {filteredList.map((model) => (
            <ModelCard key={model.modelId} {...model} onDetail={handleDetail} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
