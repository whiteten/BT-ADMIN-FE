import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select } from 'antd';
import FaqAgentCard from '../components/FaqAgentCard';
import NoData from '@/components/custom/NoData';

type FaqAgent = {
  agentId: string;
  agentName: string;
  faqCount: number;
};

// 목 데이터 (API 연결 전 테스트용)
const mockAgentList: FaqAgent[] = [
  { agentId: '1', agentName: 'Agent1', faqCount: 10 },
  { agentId: '2', agentName: 'Agent2', faqCount: 20 },
  { agentId: '3', agentName: 'Agent3', faqCount: 30 },
  { agentId: '4', agentName: 'Agent4', faqCount: 40 },
  { agentId: '5', agentName: 'Agent5', faqCount: 50 },
  { agentId: '6', agentName: 'Agent6', faqCount: 60 },
  { agentId: '7', agentName: 'Agent7', faqCount: 70 },
  { agentId: '8', agentName: 'Agent8', faqCount: 80 },
];

export default function AoeFaqAgentList() {
  const navigate = useNavigate();
  const [filterColumn, setFilterColumn] = useState('agentName');
  const [searchValue, setSearchValue] = useState('');

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return mockAgentList;

    const keyword = searchValue.toLowerCase();
    return mockAgentList.filter((agent) => {
      const value = agent[filterColumn as keyof typeof agent];
      if (value == null) return false;
      return String(value).toLowerCase().includes(keyword);
    });
  }, [filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleDetail = (agentId: string) => {
    navigate(`../faq/${agentId}`);
  };

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
