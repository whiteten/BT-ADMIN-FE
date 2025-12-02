import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag } from 'antd';

import { ReactComponent as IconLinkIfe } from '../../../../assets/images/icon/icon-link-ife.svg';
import { ReactComponent as IconLinkNlu } from '../../../../assets/images/icon/icon-link-nlu.svg';
import type { BotListItem } from '../types';
import { IconMoreVertical, IconTag } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// 랩핑된 아이템 개수 계산
const useWrappedItemCount = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wrappedCount, setWrappedCount] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || containerRef.current.children.length === 0) return;
      const children = containerRef.current.children;
      const firstItemTop = (children[0] as HTMLElement).getBoundingClientRect().top;
      let count = 0;
      for (let i = 1; i < children.length; i++) {
        const itemTop = (children[i] as HTMLElement).getBoundingClientRect().top;
        if (itemTop > firstItemTop) {
          count++;
        }
      }
      setWrappedCount(count);
    };
    // 초기 계산
    handleResize();
    // ResizeObserver로 컨테이너 크기 변화 감지
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return { containerRef, wrappedCount };
};

export default function BotCard({ serviceId, serviceName, serviceVer, modelName, conversationCount, workTime, tags }: BotListItem) {
  const { containerRef, wrappedCount } = useWrappedItemCount();
  const navigate = useNavigate();

  const handleClickDetailBtn = () => {
    navigate(`../${serviceId}`);
  };
  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end">
        <DropdownMenuItem onClick={handleClickDetailBtn} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:cursor-pointer">삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card title={serviceName} styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }} extra={extra}>
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">버전</span>
          <span className="mr-2">{serviceVer}</span>
          <IconLinkIfe className="hover:cursor-pointer" />
        </div>
        <div className="flex">
          <span className="w-[104px]">NLU모델</span>
          <span className="mr-2">{modelName}</span>
          <IconLinkNlu className="hover:cursor-pointer" />
        </div>
        <div className="flex">
          <span className="w-[104px]">등록 대화수</span>
          <span>{conversationCount}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">서비스 개시일</span>
          <span>{workTime}</span>
        </div>
        <div className="flex items-center justify-between w-full">
          {tags && tags.length > 0 && (
            <div ref={containerRef} className="flex flex-wrap gap-2 w-[calc(100%-40px)] h-[30px] overflow-hidden">
              {tags?.map((tag) => (
                <Tag
                  key={tag}
                  variant="filled"
                  icon={<IconTag className="mr-0.5" />}
                  className="!inline-flex items-center !px-2 !py-1 !m-0"
                  classNames={{ content: 'max-w-[80px] truncate' }}
                >
                  {tag}
                </Tag>
              ))}
            </div>
          )}
          {wrappedCount > 0 && (
            <Tag variant="filled" className="!inline-flex items-center !px-2 !py-1 !m-0">
              +{wrappedCount}
            </Tag>
          )}
        </div>
      </div>
    </Card>
  );
}
