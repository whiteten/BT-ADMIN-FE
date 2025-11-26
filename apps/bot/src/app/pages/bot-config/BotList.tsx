import { Button, Input, Select } from 'antd';
import BotCard from '../../features/bot-config/BotCard';

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
      <div className="grid grid-cols-4 gap-4 w-full h-full overflow-y-auto">
        {Array.from({ length: 20 }).map((_, index) => (
          <BotCard key={index} />
        ))}
      </div>
    </div>
  );
}
