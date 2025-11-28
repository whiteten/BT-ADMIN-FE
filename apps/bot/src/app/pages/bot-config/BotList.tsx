import { Button, Input, Select } from 'antd';
import BotCard from '../../features/bot-config/BotCard';
import type { Bot } from '../../features/bot-config/types';

const sampleTags = ['봇', '채팅', 'AI', '상담봇', '주문처리', '배송조회', '결제시스템', '주문자동화', '고객상담챗봇', '자동주문처리', '고객상담자동화', '주문처리자동화'];
const sampleBotList: Bot[] = Array.from({ length: 10 }).map((_, index) => {
  const shuffled = [...sampleTags].sort(() => Math.random() - 0.5);
  const tagCount = Math.floor(Math.random() * 4) + 1;
  return {
    id: `bot-${index + 1}`,
    botName: `봇 샘플 ${index + 1}`,
    version: `v1.0.${index}`,
    nluModel: `모델 ${index}`,
    conversationCount: index * 100,
    registrationDate: `2025-11-11 00:00:00`,
    tags: shuffled.slice(0, tagCount),
  };
});

export default function BotList() {
  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between w-full h-[58px] bg-white custom-shadow px-7 py-4">
        <div>
          <span className="text-[20px] font-bold">봇 목록</span>
        </div>
        <div>
          <span className="text-[14px] text-[#495057]">{`봇 관리 > 봇 > 봇 목록`}</span>
        </div>
      </header>
      {/* Filter */}
      <div className="flex items-center justify-between w-full h-[76px] bg-white custom-shadow px-7 py-5">
        <div>
          <Select
            defaultValue="serviceName"
            options={[
              { label: '봇 이름', value: 'serviceName' },
              { label: '버전', value: 'versionName' },
              { label: 'NLU 모델', value: 'modelName' },
              { label: '태그', value: 'tag' },
            ]}
            className="!max-w-[150px] !min-w-[120px] !mr-3"
            popupMatchSelectWidth={false}
          />
          <Input className="!w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div>
          <Button type="primary">추가</Button>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
        {sampleBotList.map((bot) => (
          <BotCard key={bot.id} {...bot} />
        ))}
      </div>
    </div>
  );
}
