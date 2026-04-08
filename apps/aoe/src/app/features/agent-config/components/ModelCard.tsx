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
};

interface ModelTypeStyle {
  icon: LucideIcon;
  bg: string;
}

const MODEL_TYPE_STYLES: Record<string, ModelTypeStyle> = {
  anthropic: { icon: Brain, bg: 'bg-purple-500' },
  openai: { icon: Sparkles, bg: 'bg-emerald-500' },
  vllm: { icon: Server, bg: 'bg-blue-500' },
  google: { icon: Wand2, bg: 'bg-red-500' },
  huggingface: { icon: FlaskConical, bg: 'bg-yellow-500' },
  ollama: { icon: Cpu, bg: 'bg-orange-500' },
};

const DEFAULT_STYLE: ModelTypeStyle = { icon: Zap, bg: 'bg-gray-500' };

const getModelTypeStyle = (modelTypeName?: string): ModelTypeStyle => {
  if (!modelTypeName) return DEFAULT_STYLE;
  const key = Object.keys(MODEL_TYPE_STYLES).find((k) => modelTypeName.toLowerCase().includes(k));
  return key ? MODEL_TYPE_STYLES[key] : DEFAULT_STYLE;
};

export default function ModelCard({ modelId, modelName, modelTypeName, activeDetailCount, totalDetailCount, useYn, onDetail, onDelete }: ModelCardProps) {
  const typeStyle = getModelTypeStyle(modelTypeName);
  const Icon = typeStyle.icon;

  const title = (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-md ${typeStyle.bg} flex items-center justify-center shrink-0`}>
        <Icon className="size-4 text-white" />
      </div>
      <span
        className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
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
        <DropdownMenuItem onClick={() => onDelete?.(modelId)} className="hover:cursor-pointer">
          삭제
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
      onClick={() => onDetail?.(modelId)}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">모델 타입</span>
          <span>{modelTypeName ?? '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px]">활성화 여부</span>
          <Badge variant="secondary" className={`text-[13px] leading-[13px] font-medium !h-6 ${useYn === 1 ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#495057] bg-[#E9EBEC]'}`}>
            {useYn === 1 ? '활성화' : '비활성화'}
          </Badge>
        </div>
        <div className="flex">
          <span className="w-[104px]">활성화 모델</span>
          <span>{activeDetailCount ?? 0}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">비활성화 모델</span>
          <span>{(totalDetailCount ?? 0) - (activeDetailCount ?? 0)}</span>
        </div>
      </div>
    </Card>
  );
}
