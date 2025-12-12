import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import PageHeader from '@/components/custom/PageHeader';

export default function ModelList() {
  const navigate = useNavigate();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '모델', path: '/bot/bot-config/model' },
    { title: '모델 목록', path: '/bot/bot-config/model/list' },
  ];
  const [filterColumn, setFilterColumn] = useState('modelName');
  const [searchValue, setSearchValue] = useState('');

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
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
    </div>
  );
}
