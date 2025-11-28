import { Button, Input, Select } from 'antd';
import BotCard from '../../features/bot-config/BotCard';
import type { Bot } from '../../features/bot-config/types';

const sampleBotList: Bot[] = Array.from({ length: 20 }).map((_, index) => ({
  id: `${index}`,
  botName: `봇 샘플 ${index}`,
  version: `v1.0.${index}`,
  nluModel: `모델 ${index}`,
  conversationCount: index,
  registrationDate: `2025-11-11 00:00:00`,
  tags: Array.from({ length: Math.floor(Math.random() * 10) + 1 }).map((_, index) => `태그${index + 1}`),
}));

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full overflow-y-auto">
        {sampleBotList.map((bot) => (
          <BotCard key={bot.id} {...bot} />
        ))}
      </div>
    </div>
  );
}
