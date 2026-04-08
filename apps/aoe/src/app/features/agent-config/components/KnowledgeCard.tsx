import { Card } from 'antd';
import dayjs from 'dayjs';
import { BookOpen } from 'lucide-react';
import type { KnowledgeListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type KnowledgeCardProps = KnowledgeListItem & {
  onDetail?: (documentId: string) => void;
};

export default function KnowledgeCard({ documentId, documentName, description, fileCount, updatedAt, onDetail }: KnowledgeCardProps) {
  const title = (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
        <BookOpen className="size-4 text-white" />
      </div>
      <span
        className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
        onClick={(e) => {
          e.stopPropagation();
          onDetail?.(documentId);
        }}
      >
        {documentName}
      </span>
    </div>
  );

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onDetail?.(documentId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={title}
      extra={extra}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '148px' } }}
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={() => onDetail?.(documentId)}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px] shrink-0">파일 수</span>
          <span>{fileCount ?? 0}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">설명</span>
          <span className="truncate">{description ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] shrink-0">최종 수정</span>
          <span>{updatedAt ? dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
