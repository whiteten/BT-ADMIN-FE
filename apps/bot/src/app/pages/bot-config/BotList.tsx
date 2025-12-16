import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { confirmModal } from '@/shared-util';
import BotCard from '../../features/bot-config/components/BotCard';
import { botQueryKeys, useDeleteBot, useGetBots } from '../../features/bot-config/hooks/useBotQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '봇 관리', path: '/bot/bot-config' },
  { title: '봇', path: '/bot/bot-config/bot' },
  { title: '봇 목록', path: '/bot/bot-config/bot/list' },
];

export default function BotList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterColumn, setFilterColumn] = useState('serviceName');
  const [searchValue, setSearchValue] = useState('');

  const { data: botList, isFetching } = useGetBots();
  const { mutateAsync: deleteBot } = useDeleteBot({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBots().queryKey });
      },
    },
  });

  const filteredList = useMemo(() => {
    if (!botList) return [];
    if (!searchValue.trim()) return botList;
    const keyword = searchValue.toLowerCase();
    return botList.filter((bot) => {
      const value = bot[filterColumn as keyof typeof bot];
      if (value == null) return false;
      if (Array.isArray(value)) {
        return value.some((v) => String(v).toLowerCase().includes(keyword));
      }
      return String(value).toLowerCase().includes(keyword);
    });
  }, [botList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  const handleDetail = (serviceId: string) => {
    navigate(`../${serviceId}`);
  };

  const handleDelete = (serviceId: string) => {
    confirmModal.delete({
      onOk: () => deleteBot({ serviceId }),
    });
  };

  const handleDetailModel = (modelId: string) => {
    navigate(`../../model/${modelId}`);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="봇 목록" breadcrumb={breadcrumb} />
      {/* Filter */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '봇 이름', value: 'serviceName' },
              { label: '버전', value: 'serviceVer' },
              { label: 'NLU 모델', value: 'modelName' },
              { label: '태그', value: 'tags' },
            ]}
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
          {filteredList.map((bot) => (
            <BotCard key={bot.serviceId} {...bot} onDetail={handleDetail} onDelete={handleDelete} onDetailModel={handleDetailModel} />
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
