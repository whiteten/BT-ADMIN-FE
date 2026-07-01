import { Card } from 'antd';
import { Brain, Cpu, FlaskConical, type LucideIcon, Server, Sparkles, Wand2, Zap } from 'lucide-react';
import type { ModelListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ModelCardProps = ModelListItem & {
  onDetail?: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
  canWrite?: boolean;
};

interface ModelTypeStyle {
  icon: LucideIcon;
  bg: string;
}

const MODEL_TYPE_STYLES: Record<string, ModelTypeStyle> = {
  anthropic: { icon: Brain, bg: 'bg-purple-50 text-purple-600' },
  openai: { icon: Sparkles, bg: 'bg-emerald-50 text-emerald-600' },
  vllm: { icon: Server, bg: 'bg-blue-50 text-blue-600' },
  google: { icon: Wand2, bg: 'bg-red-50 text-red-600' },
  huggingface: { icon: FlaskConical, bg: 'bg-yellow-50 text-yellow-600' },
  ollama: { icon: Cpu, bg: 'bg-orange-50 text-orange-600' },
};

const DEFAULT_STYLE: ModelTypeStyle = { icon: Zap, bg: 'bg-gray-100 text-gray-600' };

const getModelTypeStyle = (modelTypeName?: string): ModelTypeStyle => {
  if (!modelTypeName) return DEFAULT_STYLE;
  const key = Object.keys(MODEL_TYPE_STYLES).find((k) => modelTypeName.toLowerCase().includes(k));
  return key ? MODEL_TYPE_STYLES[key] : DEFAULT_STYLE;
};

export default function ModelCard({ modelId, modelName, modelTypeName, activeDetailCount, totalDetailCount, useYn, onDetail, onDelete, canWrite = false }: ModelCardProps) {
  const typeStyle = getModelTypeStyle(modelTypeName);
  const Icon = typeStyle.icon;

  const title = (
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg ${typeStyle.bg} flex items-center justify-center shrink-0`}>
        <Icon className="size-[18px]" />
      </div>
      <span
        className="truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
        onClick={(e) => {
          e.stopPropagation();
          onDetail?.(modelId);
        }}
      >
        {modelName}
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
        <DropdownMenuItem onClick={() => onDetail?.(modelId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        {canWrite && (
          <DropdownMenuItem onClick={() => onDelete?.(modelId)} className="hover:cursor-pointer">
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
      onClick={() => onDetail?.(modelId)}
    >
      <div className="flex flex-col text-[#495057] gap-2.5">
        <div className="flex">
          <span className="w-[104px] text-[#888B9A]">모델 타입</span>
          <span>{modelTypeName ?? '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px] text-[#888B9A]">활성화 여부</span>
          <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${useYn === 1 ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#495057] bg-[#E9EBEC]'}`}>
            {useYn === 1 ? '활성화' : '비활성화'}
          </Badge>
        </div>
        <div className="flex">
          <span className="w-[104px] text-[#888B9A]">활성화 모델</span>
          <span>{activeDetailCount ?? 0}</span>
        </div>
        <div className="flex">
          <span className="w-[104px] text-[#888B9A]">비활성화 모델</span>
          <span>{(totalDetailCount ?? 0) - (activeDetailCount ?? 0)}</span>
        </div>
      </div>
    </Card>
  );
}
