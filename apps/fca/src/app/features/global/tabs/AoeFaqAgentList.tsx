import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select } from 'antd';
import FaqAgentCard from '../components/FaqAgentCard';
import { useGetFaqAgentList } from '../hooks/useAoeQueries';
import type { FaqAgentListItem } from '../types/aoe.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

export default function AoeFaqAgentList() {
  const navigate = useNavigate();
  const [filterColumn, setFilterColumn] = useState('agentName');
  const [searchValue, setSearchValue] = useState('');

  // FAQ Agent 목록 조회
  const { data: faqAgentList, isFetching } = useGetFaqAgentList({});

  const filteredList = useMemo(() => {
    if (!faqAgentList) return [];
    if (!searchValue.trim()) return faqAgentList;

    const keyword = searchValue.toLowerCase();
    return faqAgentList.filter((agent) => {
      const value = agent[filterColumn as keyof FaqAgentListItem];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [faqAgentList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDetail = (agentId: string) => {
    navigate(`${agentId}/faq`);
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full h-full">
      <header className="flex items-center justify-between w-full gap-2 lg:flex-nowrap flex-wrap">
        <div className="flex items-center w-full gap-3">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[{ label: '이름', value: 'agentName' }]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full lg:max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
      </header>
      {/* Card Grid */}
      {filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((agent) => (
            <FaqAgentCard key={agent.agentId} {...agent} onDetail={handleDetail} />
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
