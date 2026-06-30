import { Card } from 'antd';
import dayjs from 'dayjs';
import { BookOpen, Clock, FileText } from 'lucide-react';
import type { KnowledgeListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type KnowledgeCardProps = KnowledgeListItem & {
  onDetail?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  canWrite?: boolean;
};

export default function KnowledgeCard({ documentId, documentName, description, fileCount, updatedAt, onDetail, onDelete, canWrite = false }: KnowledgeCardProps) {
  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[var(--color-bt-primary-soft)] flex items-center justify-center shrink-0">
        <BookOpen className="size-[18px] text-[var(--color-bt-primary)]" />
      </div>
      <span
        className="truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
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
        {canWrite && (
          <DropdownMenuItem onClick={() => onDelete?.(documentId)} className="hover:cursor-pointer">
            삭제
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={title}
      extra={extra}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '148px' } }}
      className="transition-all duration-200 hover:-translate-y-0.5 hover:!border-[var(--color-bt-primary)] hover:shadow-[0px_6px_16px_0px_#38414A1f] hover:cursor-pointer"
      onClick={() => onDetail?.(documentId)}
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-2.5 text-[#495057]">
          <div className="flex items-center">
            <span className="w-[72px] shrink-0 text-[#888B9A]">파일 수</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <FileText className="size-3.5 text-[#888B9A]" />
              {fileCount ?? 0}
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-[72px] shrink-0 text-[#888B9A]">설명</span>
            <span className="min-w-0 flex-1 truncate">{description || '-'}</span>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-1.5 border-t border-[#F1F3F5] pt-3 text-xs text-[#888B9A]">
          <Clock className="size-3.5 shrink-0" />
          <span>최종 수정 {updatedAt ? dayjs(updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
      </div>
    </Card>
  );
}
