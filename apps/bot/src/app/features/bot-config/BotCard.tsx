import { Card, Tag } from 'antd';

import { ReactComponent as IconLinkIfe } from '../../../assets/images/icon/icon-link-ife.svg';
import { ReactComponent as IconLinkNlu } from '../../../assets/images/icon/icon-link-nlu.svg';
import { IconMoreVertical, IconTag } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function BotCard() {
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
    <Card title="계좌조회" styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }} extra={extra}>
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">버전</span>
          <span className="mr-2">v1.0.0</span>
          <IconLinkIfe className="hover:cursor-pointer" />
        </div>
        <div className="flex">
          <span className="w-[104px]">NLU모델</span>
          <span className="mr-2">봇서비스모델</span>
          <IconLinkNlu className="hover:cursor-pointer" />
        </div>
        <div className="flex">
          <span className="w-[104px]">등록대화수</span>
          <span>6</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">서비스개시일</span>
          <span>2025-11-01 00:00:00</span>
        </div>
        <div className="flex">
          <Tag bordered={false} icon={<IconTag className="mr-0.5" />} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px' }}>
            금융
          </Tag>
          <Tag bordered={false} icon={<IconTag className="mr-0.5" />} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px' }}>
            인증
          </Tag>
          <Tag bordered={false} icon={<IconTag className="mr-0.5" />} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px' }}>
            전환
          </Tag>
          <Tag bordered={false} icon={<IconTag className="mr-0.5" />} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px' }}>
            홍보
          </Tag>
        </div>
      </div>
    </Card>
  );
}
