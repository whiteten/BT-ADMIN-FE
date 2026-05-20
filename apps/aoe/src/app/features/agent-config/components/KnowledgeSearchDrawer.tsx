import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Input } from 'antd';
import { ChevronDown, ChevronUp, FileText, Search, SearchX } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useSearchKnowledge } from '../hooks/useKnowledgeQueries';
import type { KnowledgeSearchChunk } from '../types';

export interface KnowledgeSearchDrawerRef {
  open: (params: { documentId: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  documentId: string;
}

const MAX_QUERY_LENGTH = 200;
const COLLAPSED_LINES = 4;

function SearchResultCard({ result }: { result: KnowledgeSearchChunk }) {
  const [expanded, setExpanded] = useState(false);
  const lines = result.chunk.split('\n');
  const isLong = lines.length > COLLAPSED_LINES || result.chunk.length > 200;
  const displayedChunk = !expanded && isLong ? lines.slice(0, COLLAPSED_LINES).join('\n') : result.chunk;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">#{result.chunkIndex}</span>
          <span className="text-xs text-gray-400">{result.chunkCharacters.toLocaleString()}자</span>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            result.score >= 0.8
              ? 'text-green-700 bg-green-50 border-green-200'
              : result.score >= 0.5
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-gray-600 bg-gray-50 border-gray-200'
          }`}
        >
          SCORE {result.score.toFixed(3)}
        </span>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-2">{displayedChunk}</p>
        {isLong && (
          <button type="button" onClick={() => setExpanded((prev) => !prev)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mb-3">
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <FileText className="size-3.5 text-red-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{result.filename}</span>
        </div>
      </div>
    </div>
  );
}

const KnowledgeSearchDrawer = forwardRef<KnowledgeSearchDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, documentId: '' });
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchChunk[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { open, documentId } = drawerState;

  const { mutate: searchKnowledge, isPending: isSearching } = useSearchKnowledge({
    mutationOptions: {
      onSuccess: (data) => {
        setSearchResults(data);
        setHasSearched(true);
      },
      onError: (error) => {
        Log.warn('searchKnowledge failed', error);
        toast.error('검색에 실패했습니다.');
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setDrawerState({ open: true, documentId: params.documentId });
    },
    close: () => setDrawerState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setDrawerState((prev) => ({ ...prev, open: false }));

  const handleSearch = () => {
    if (!query.trim() || !documentId) return;
    searchKnowledge({ documentId, query: query.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isSearching) handleSearch();
    }
  };

  const charRatio = query.length / MAX_QUERY_LENGTH;
  const charBarColor = charRatio >= 0.9 ? 'bg-red-400' : charRatio >= 0.7 ? 'bg-yellow-400' : 'bg-blue-500';

  return (
    <Drawer
      title="검색 테스트"
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      destroyOnHidden
      styles={{
        wrapper: { width: 800 },
        body: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', height: '100%', overflow: 'hidden' },
      }}
    >
      {/* 입력 영역 */}
      <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-white shrink-0">
        <Input.TextArea
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, MAX_QUERY_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="검색할 텍스트를 입력하세요."
          autoSize={{ minRows: 4, maxRows: 6 }}
          className="resize-none text-sm"
          variant="borderless"
        />
        <div className="flex flex-col gap-1 pt-1 border-t border-gray-100">
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${charBarColor}`} style={{ width: `${charRatio * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Enter → 검색 · Shift+Enter → 줄바꿈</span>
            <span>
              {query.length} / {MAX_QUERY_LENGTH}
            </span>
          </div>
        </div>
      </div>

      <Button type="primary" block onClick={handleSearch} loading={isSearching} disabled={!query.trim()} icon={<Search className="size-3.5" />} className="shrink-0">
        검색
      </Button>

      {/* 결과 영역 */}
      <div className="flex flex-col gap-3 flex-1 overflow-auto">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">검색 결과 단락</span>
          {searchResults.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">{searchResults.length}개 결과</span>}
        </div>

        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 border border-dashed border-gray-200 rounded-lg bg-gray-50/60 py-16">
            <Search className="size-7 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">검색 결과가 여기에 표시됩니다.</p>
              <p className="text-xs mt-1 text-gray-400">텍스트를 입력하고 검색해보세요.</p>
            </div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 border border-dashed border-gray-200 rounded-lg bg-gray-50/60 py-16">
            <SearchX className="size-7 text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">일치하는 결과가 없습니다.</p>
              <p className="text-xs mt-1 text-gray-400">다른 키워드로 검색해보세요.</p>
            </div>
          </div>
        ) : (
          searchResults.map((result, idx) => <SearchResultCard key={idx} result={result} />)
        )}
      </div>
    </Drawer>
  );
});

KnowledgeSearchDrawer.displayName = 'KnowledgeSearchDrawer';
export default KnowledgeSearchDrawer;
