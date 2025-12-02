import { useRef } from 'react';
import { Button } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconDocument } from '@/components/custom/Icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// import { useParams } from 'react-router-dom';

export default function BotDetail() {
  // const { id } = useParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({
      left: -300,
      behavior: 'smooth',
    });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({
      left: 300,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Header */}
      <header className="flex items-center justify-between w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-4">
        <div>
          <span className="text-[20px] font-bold text-[#495057]">봇 편집</span>
        </div>
        <div>
          <span className="text-[14px] text-[#495057]">{`봇 관리 > 봇 > 봇 편집`}</span>
        </div>
      </header>

      <Tabs defaultValue="basic" className="w-full h-full gap-4 overflow-hidden">
        <div className="flex w-full h-[58px] min-h-[58px] bg-white bt-shadow">
          <Button
            type="text"
            icon={<ChevronLeft className="h-5 w-5 !text-[#495057]" />}
            onClick={scrollLeft}
            className="!h-full !bg-transparent !border-0 !border-r !border-[#E9EBEC] !rounded-none"
          />

          <div ref={scrollContainerRef} className="w-full h-full overflow-x-auto bt-scroll-hide">
            <TabsList defaultValue="basic" className="h-full p-0 bg-white">
              <TabsTrigger
                className="w-auto hover:cursor-pointer !shadow-none border-1 border-transparent !rounded-none border-r-[#E9EBEC] text-[#495057] data-[state=active]:border-b-2 data-[state=active]:border-b-[#085FB5] data-[state=active]:text-[#085FB5]"
                value="basic"
              >
                <div className="flex items-center justify-center gap-2 min-w-[200px]">
                  <IconDocument className="h-5 w-5" />
                  <span>기본정보</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <Button
            type="text"
            icon={<ChevronRight className="h-5 w-5 !text-[#495057]" />}
            onClick={scrollRight}
            className="!h-full !bg-transparent !border-0 !border-l !border-[#E9EBEC] !rounded-none"
          />
        </div>

        <TabsContent value="basic" className="flex-0 w-full h-[calc(100%-58px-20px)] min-h-[calc(100%-58px-20px)]">
          <div className="w-full h-full bg-white bt-shadow overflow-y-auto p-7">
            {Array.from({ length: 50 }).map((_, index) => (
              <p key={index}>test {index}</p>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
