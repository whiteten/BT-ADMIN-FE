import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import ModelCard from '../../features/bot-config/components/ModelCard';
import { useGetModels } from '../../features/bot-config/hooks/useModelQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '봇 관리', path: '/bot/bot-config' },
  { title: '모델', path: '/bot/bot-config/model' },
  { title: '모델 목록', path: '/bot/bot-config/model/list' },
];

export default function ModelList() {
  const navigate = useNavigate();
  const [filterColumn, setFilterColumn] = useState('modelName');
  const [searchValue, setSearchValue] = useState('');

  const { data: modelList, isFetching } = useGetModels();

  const filteredList = useMemo(() => {
    if (!modelList) return [];
    if (!searchValue.trim()) return modelList;
    const keyword = searchValue.toLowerCase();
    return modelList.filter((model) => {
      const value = model[filterColumn as keyof typeof model];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [modelList, filterColumn, searchValue]);

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
    console.log(modelId);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="모델 목록" breadcrumb={breadcrumb} />
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
      {isFetching ? (
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
