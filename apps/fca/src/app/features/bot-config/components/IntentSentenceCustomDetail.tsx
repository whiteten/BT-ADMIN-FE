import type { ICellRendererParams } from 'ag-grid-community';
import { MessageCircle } from 'lucide-react';
import { useGetIntentSentences } from '../hooks/useModelQueries';
import type { IntentListItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface IntentSentenceDetailParams extends ICellRendererParams<IntentListItem> {
  sentence?: string;
  modelId: string;
}

export default function IntentSentenceCustomDetail(params: IntentSentenceDetailParams) {
  const { sentence, modelId } = params;
  const { data: sentences, isLoading } = useGetIntentSentences({ params: { intentId: params.data?.intentId, modelId, sentence } });
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <FallbackSpinner />
      </div>
    );
  return (
    <div className="flex flex-col max-h-[250px] p-4 pb-6 pl-7 gap-2 overflow-hidden bg-[var(--color-bt-primary)/10]">
      <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-bt-primary)]">
        <span>의도 문장</span>
        <span className="text-xs font-normal text-muted-foreground">({sentences?.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 overflow-y-auto">
        {sentences?.map((sentence, index) => (
          <div
            key={index}
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-card p-2.5 shadow-sm transition-all cursor-default border-l-3 border-l-[var(--color-bt-primary)]/60 hover:shadow-md hover:border-[var(--color-bt-primary)]/40"
          >
            <MessageCircle className="size-4 shrink-0 mt-0.5 text-[var(--color-bt-primary)]/60" />
            <span className="text-sm whitespace-pre-wrap break-all">{sentence.sentence}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
