import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Spin } from 'antd';
import { Braces, ChevronDown, Inbox, Info, RefreshCw } from 'lucide-react';
import { mcpQueryKeys, useGetMcpList, useGetMcpTools } from '../hooks/useMcpQueries';
import type { McpApiItem } from '../types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/** API 설명 텍스트를 요약·인수·비고 블록으로 파싱해 문서형 카드로 렌더한다. */
type DescBlock =
  | { kind: 'summary'; text: string }
  | { kind: 'section'; text: string }
  | { kind: 'param'; name: string; desc: string; required: boolean }
  | { kind: 'note'; text: string };

const PARAM_KEY = /^[A-Za-z0-9_]+$/;
const REQUIRED = /\(?\s*required\s*\)?|필수/i;

function parseDescription(raw?: string): DescBlock[] {
  const cleaned = raw?.replace(/\r/g, '').trim();
  if (!cleaned) return [];

  const blocks: DescBlock[] = [];
  let bodyStarted = false;

  for (const line of cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)) {
    const section = line.match(/^\[(.+)\]$/);
    if (section) {
      blocks.push({ kind: 'section', text: section[1].trim() });
      bodyStarted = true;
      continue;
    }

    const colonIdx = line.search(/[:：]/);
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      if (PARAM_KEY.test(key)) {
        const rest = line.slice(colonIdx + 1).trim();
        blocks.push({
          kind: 'param',
          name: key,
          desc: rest.replace(/\(?\s*required\s*\)?/i, '').trim(),
          required: REQUIRED.test(rest),
        });
        bodyStarted = true;
        continue;
      }
    }

    blocks.push({ kind: bodyStarted ? 'note' : 'summary', text: line });
  }

  return blocks;
}

function ApiDescription({ blocks }: { blocks: DescBlock[] }) {
  if (blocks.length === 0) {
    return <p className="text-sm italic text-slate-400">설명 없음</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'summary':
            return (
              <p key={i} className="text-sm leading-relaxed text-slate-600">
                {block.text}
              </p>
            );
          case 'section':
            return (
              <div key={i} className="mt-2 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--color-bt-primary)]" />
                <span className="text-xs font-semibold tracking-wide text-slate-500">{block.text}</span>
                <span className="h-px flex-1 bg-slate-100" />
              </div>
            );
          case 'param':
            return (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <code className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-bt-primary)]">{block.name}</code>
                {block.required && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-500">필수</span>}
                {block.desc && <span className="text-sm text-slate-600">{block.desc}</span>}
              </div>
            );
          case 'note':
            return (
              <p key={i} className="text-xs leading-relaxed text-slate-400">
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}

function ApiCard({ api, index }: { api: McpApiItem; index: number }) {
  const blocks = parseDescription(api.description);
  const summary = blocks.find((b) => b.kind === 'summary')?.text;
  // 설명이 길면 기본 접힘, 짧으면 펼침 (블록 ≈ 줄 단위)
  const isLong = blocks.length > 5;

  return (
    <article
      className="group relative animate-in fade-in-0 slide-in-from-bottom-1 overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-bt-primary)]/40 hover:shadow-[0_12px_32px_-16px_rgba(8,95,181,0.35)]"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, animationFillMode: 'both' }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--color-bt-primary)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <Collapsible defaultOpen={!isLong}>
        <CollapsibleTrigger className="group/trigger flex w-full items-center gap-3 px-5 py-3.5 text-left data-[state=open]:border-b data-[state=open]:border-slate-100">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bt-primary)]/10 text-[var(--color-bt-primary)]">
            <Braces className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <code className="font-mono text-sm font-semibold tracking-tight text-slate-800">{api.toolName}</code>
            {summary && <span className="truncate text-xs text-slate-500 group-data-[state=open]/trigger:hidden">{summary}</span>}
          </div>
          {api.source && <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{api.source}</span>}
          <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 py-4">
            <ApiDescription blocks={blocks} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}

export default function McpApiList() {
  const { mcpId } = useParams();
  const queryClient = useQueryClient();
  const { data: mcpList = [] } = useGetMcpList();
  const mcp = mcpList.find((m) => m.mcpId === mcpId);
  const serverName = mcp?.serverName ?? '';

  const { data: apiList = [], isFetching } = useGetMcpTools({ params: { serverName } });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: mcpQueryKeys.getMcpTools({ serverName }).queryKey });
  };

  return (
    <div className="flex flex-col gap-5 pb-7">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[15px] font-semibold text-slate-800">등록된 API 목록</h3>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-bt-primary)]/10 px-1.5 text-xs font-semibold text-[var(--color-bt-primary)]">
              {apiList.length}
            </span>
          </div>
          <Button icon={<RefreshCw className="size-3.5" />} onClick={handleRefresh} disabled={isFetching || !serverName}>
            새로고침
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          이 MCP 서버에 등록된 API 목록입니다. 서버 이름이{' '}
          <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-700">{serverName || '-'}</code>인 API만 표시됩니다.
        </p>
      </div>

      {isFetching ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-16">
          <Spin />
          <p className="text-sm text-slate-400">API 목록을 불러오는 중...</p>
        </div>
      ) : apiList.length > 0 ? (
        <div className="flex flex-col gap-3">
          {apiList.map((api, index) => (
            <ApiCard key={`${api.serverName}-${api.toolName}`} api={api} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
          <Empty
            image={<Inbox className="mx-auto size-12 text-slate-300" strokeWidth={1.25} />}
            description={<span className="text-sm font-medium text-slate-500">등록된 API가 없습니다.</span>}
          />
          <p className="text-xs text-slate-400">이 서버에 등록된 API가 없거나 서버 이름이 일치하지 않습니다.</p>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-semibold text-amber-800">API 관리 안내</h4>
          <p className="text-xs leading-relaxed text-amber-700">API 추가 및 수정은 MCP 서버에서 가능합니다. 여기서는 현재 서버에 등록된 API 목록만 확인할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
