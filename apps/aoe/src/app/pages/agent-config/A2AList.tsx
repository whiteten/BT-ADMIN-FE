import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Search } from 'lucide-react';
import A2ACard from '../../features/a2a/components/A2ACard';
import { useGetA2AList } from '../../features/a2a/hooks/useA2aQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'A2A', path: '/aoe/agent-config/a2a/list' },
];

export default function A2AList() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const { data: agents = [], isFetching } = useGetA2AList();

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return agents;
    const keyword = searchValue.toLowerCase();
    return agents.filter((a) => a.agentName.toLowerCase().includes(keyword) || (a.agentDescription ?? '').toLowerCase().includes(keyword));
  }, [agents, searchValue]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <Input
          prefix={<Search className="size-3.5 text-gray-400" />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full max-w-[400px]"
          placeholder="Agent명으로 검색"
          allowClear
        />
        <Button type="primary" onClick={() => navigate('../create')}>
          추가
        </Button>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((agent) => (
            <A2ACard key={agent.a2aId} {...agent} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="등록된 A2A 서버가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
