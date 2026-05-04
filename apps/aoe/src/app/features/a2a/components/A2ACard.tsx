import { useNavigate } from 'react-router-dom';
import { Card } from 'antd';
import dayjs from 'dayjs';
import { Bot } from 'lucide-react';
import type { A2AItem } from '../types';

export default function A2ACard({ a2aId, agentName, agentDescription, skills, workTime }: A2AItem) {
  const navigate = useNavigate();

  const handleClick = () => navigate(`../${a2aId}`);

  const title = (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center shrink-0">
        <Bot className="size-4 text-white" />
      </div>
      <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={handleClick}>
        {agentName}
      </span>
    </div>
  );

  return (
    <Card
      title={title}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '148px' } }}
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px] shrink-0">설명</span>
          <span className="truncate">{agentDescription ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">Skills</span>
          <span>{skills?.length ?? 0}개</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">최종 수정</span>
          <span>{workTime ? dayjs(workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
