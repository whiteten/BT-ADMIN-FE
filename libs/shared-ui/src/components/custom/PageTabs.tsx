import { Suspense, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FallbackSpinner } from './FallbackSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/shadcn/tabs';

export interface PageTab {
  id: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  component: React.ComponentType<any> | React.LazyExoticComponent<any>;
}

interface PageTabsProps {
  tabs: PageTab[];
  defaultTab?: string;
}

export default function PageTabs({ tabs, defaultTab }: PageTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const activeTabId = tabFromUrl ?? defaultTab ?? tabs[0]?.id ?? '';

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
    <Tabs defaultValue={activeTabId} className="w-full h-full gap-4 overflow-hidden">
      <div className="flex w-full h-[58px] min-h-[58px] bg-white bt-shadow">
        <Button
          type="text"
          icon={<ChevronLeft className="h-5 w-5 !text-[#495057]" />}
          onClick={scrollLeft}
          className="!h-full !bg-transparent !border-0 !border-r !border-[#E9EBEC] !rounded-none"
        />

        <div ref={scrollContainerRef} className="w-full h-full overflow-x-auto bt-scroll-hide">
          <TabsList defaultValue={activeTabId} className="h-full p-0 bg-white">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                className="w-auto hover:cursor-pointer !shadow-none border-1 border-transparent !rounded-none border-r-[#E9EBEC] text-[#495057] data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]"
                value={tab.id}
              >
                <div className="flex items-center justify-center gap-2 min-w-[184px]">
                  {tab.icon && <tab.icon className="h-5 w-5" />}
                  <span>{tab.label}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <Button
          type="text"
          icon={<ChevronRight className="h-5 w-5 !text-[#495057]" />}
          onClick={scrollRight}
          className="!h-full !bg-transparent !border-0 !border-l !border-[#E9EBEC] !rounded-none"
        />
      </div>

      {tabs.map((tab) => {
        const Component = tab.component;
        return (
          <TabsContent key={tab.id} value={tab.id} className="flex-0 w-full h-[calc(100%-58px-20px)] min-h-[calc(100%-58px-20px)]">
            <div className="w-full h-full bg-white bt-shadow overflow-y-auto">
              <div className="flex flex-col w-full h-full p-7">
                <Suspense fallback={<FallbackSpinner />}>
                  <div className="flex gap-2 items-center text-[var(--color-bt-primary)] mb-6">
                    {tab.icon && <tab.icon className="h-5 w-5" />}
                    <span className="text-[20px] font-bold">{tab.label}</span>
                  </div>
                  <Component />
                </Suspense>
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
