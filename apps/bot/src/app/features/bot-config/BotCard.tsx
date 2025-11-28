import { Card, Tag } from 'antd';

import type { Bot } from './types';

import { ReactComponent as IconLinkIfe } from '../../../assets/images/icon/icon-link-ife.svg';
import { ReactComponent as IconLinkNlu } from '../../../assets/images/icon/icon-link-nlu.svg';
import { IconMoreVertical, IconTag } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function BotCard({ botName, version, nluModel, conversationCount, registrationDate, tags }: Bot) {
  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end">
        <DropdownMenuItem>상세보기</DropdownMenuItem>
        <DropdownMenuItem>삭제</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card title={botName} styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }} extra={extra}>
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">버전</span>
          <span className="mr-2">{version}</span>
          <IconLinkIfe className="hover:cursor-pointer" />
        </div>
        <div className="flex">
          <span className="w-[104px]">NLU모델</span>
          <span className="mr-2">{nluModel}</span>
          <IconLinkNlu className="hover:cursor-pointer" />
        </div>
        <div className="flex">
          <span className="w-[104px]">등록대화수</span>
          <span>{conversationCount}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">서비스개시일</span>
          <span>{registrationDate}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags?.map((tag) => (
            <Tag
              key={tag}
              variant="filled"
              icon={<IconTag className="mr-0.5" />}
              className="!inline-flex items-center !px-2 !py-1 !m-0"
              classNames={{
                content: 'max-w-[80px] truncate',
              }}
            >
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </Card>
  );
}
