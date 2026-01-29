import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import ModelCard from '../../features/bot-config/components/ModelCard';
import { modelQueryKeys, useDeleteModel, useGetModels } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import { ModelType } from '../../features/bot-config/types/model';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function ModelList() {
  const { isPublic } = useModelRoute();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/fca/bot-config' },
    isPublic ? { title: '공용 모델', path: '/fca/global/model' } : { title: '모델', path: '/fca/bot-config/model' },
    isPublic ? { title: '공용 모델 목록', path: '/fca/global/model' } : { title: '모델 목록', path: '/fca/bot-config/model/list' },
  ];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [filterColumn, setFilterColumn] = useState('modelName');
  const [searchValue, setSearchValue] = useState('');

  const { data: modelList, isLoading } = useGetModels({ queryOptions: { refetchInterval: 5000 } });
  const { mutate: deleteModel } = useDeleteModel({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModels().queryKey });
      },
    },
  });

  const filteredList = useMemo(() => {
    if (!modelList) return [];

    // 1. modelType으로 필터링
    const targetType = isPublic ? ModelType.PUBLIC : ModelType.NORMAL;
    const result = modelList.filter((model) => model.modelType === targetType);

    // 2. 검색어로 추가 필터링
    if (!searchValue.trim()) return result;
    const keyword = searchValue.toLowerCase();
    return result.filter((model) => {
      const value = model[filterColumn as keyof typeof model];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [modelList, isPublic, filterColumn, searchValue]);

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
      <PageHeader title={isPublic ? '공용모델 목록' : '모델 목록'} breadcrumb={breadcrumb} />
      {/* Filter */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '모델 이름', value: 'modelName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div>
          <Button type="primary" onClick={handleClickCreateBtn}>
            추가
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((model) => (
            <ModelCard key={model.modelId} {...model} onDetail={handleDetail} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message={`조회된 데이터가 없습니다.`} iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
