import { useEffect, useState } from 'react';
import type { CustomStatusPanelProps } from 'ag-grid-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PAGE_SIZE_OPTIONS = [50, 100, 250, 500];
export const DEFAULT_PAGE_SIZE = 50;
const STORAGE_KEY = 'bot-dialog-history.page-size';

export function getSavedPageSize(): number {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PAGE_SIZE;
  const n = Number(raw);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

function savePageSize(n: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(n));
}

export default function BotDialogHistoryPageSizeSelector({ api }: CustomStatusPanelProps) {
  const [pageSize, setPageSize] = useState<number>(() => api.paginationGetPageSize?.() ?? DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (api.isDestroyed?.()) return;
    const sync = () => {
      if (!api.isDestroyed?.()) setPageSize(api.paginationGetPageSize());
    };
    sync();
    api.addEventListener('paginationChanged', sync);
    return () => {
      if (!api.isDestroyed?.()) api.removeEventListener('paginationChanged', sync);
    };
  }, [api]);

  const handleChange = (value: string) => {
    const next = Number(value);
    if (Number.isNaN(next) || api.isDestroyed?.()) return;
    savePageSize(next);
    api.setGridOption('paginationPageSize', next);
    api.setGridOption('cacheBlockSize', next);
    api.paginationGoToPage(0);
    api.refreshServerSide({ purge: true });
  };

  return (
    <div className="flex items-center gap-2 py-2 ml-3">
      <span className="text-[13px] text-muted-foreground">페이지당</span>
      <Select value={String(pageSize)} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-[88px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}건
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
