import { useEffect, useState } from 'react';
import type { CustomStatusPanelProps } from 'ag-grid-react';
import { ChevronFirst, ChevronLast, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../shadcn/badge';
import { Button } from '../shadcn/button';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  paginationEnabled: boolean;
}

const BUTTONS_PER_BLOCK = 5;

function getPageBlock(currentPage: number): number {
  return Math.floor(currentPage / BUTTONS_PER_BLOCK);
}

function getPageButtons(totalPages: number, currentPage: number): number[] {
  if (totalPages <= BUTTONS_PER_BLOCK) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const block = getPageBlock(currentPage);
  const startPage = block * BUTTONS_PER_BLOCK;
  const endPage = Math.min(startPage + BUTTONS_PER_BLOCK, totalPages);

  return Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
}

export default function AggridPagination({ api }: CustomStatusPanelProps) {
  const [state, setState] = useState<PaginationState>({
    currentPage: 0,
    totalPages: 0,
    totalRows: 0,
    pageSize: 20,
    paginationEnabled: true,
  });

  useEffect(() => {
    if (api.isDestroyed?.()) return;

    const updatePaginationState = () => {
      if (api.isDestroyed?.()) return;

      // 페이징 비활성 그리드는 paginationGetRowCount()가 0 → 표시 행 수로 대체
      const paginationEnabled = api.getGridOption('pagination') ?? false;
      setState({
        currentPage: api.paginationGetCurrentPage(),
        totalPages: api.paginationGetTotalPages(),
        totalRows: paginationEnabled ? api.paginationGetRowCount() : api.getDisplayedRowCount(),
        pageSize: api.paginationGetPageSize(),
        paginationEnabled,
      });
    };

    updatePaginationState();

    api.addEventListener('paginationChanged', updatePaginationState);
    api.addEventListener('modelUpdated', updatePaginationState);

    return () => {
      if (!api.isDestroyed?.()) {
        api.removeEventListener('paginationChanged', updatePaginationState);
        api.removeEventListener('modelUpdated', updatePaginationState);
      }
    };
  }, [api]);

  const { currentPage, totalPages, totalRows, pageSize, paginationEnabled } = state;
  const pageButtons = getPageButtons(totalPages, currentPage);

  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalRows);

  const currentBlock = getPageBlock(currentPage);
  const hasPrevBlock = currentBlock > 0;
  const hasNextBlock = (currentBlock + 1) * BUTTONS_PER_BLOCK < totalPages;

  const handlePageClick = (page: number) => {
    if (!api.isDestroyed?.()) {
      api.paginationGoToPage(page);
    }
  };

  const handlePrevBlock = () => {
    const prevBlockLastPage = currentBlock * BUTTONS_PER_BLOCK - 1;
    handlePageClick(prevBlockLastPage);
  };

  const handleNextBlock = () => {
    const nextBlockFirstPage = (currentBlock + 1) * BUTTONS_PER_BLOCK;
    handlePageClick(nextBlockFirstPage);
  };

  const handlePrevPage = () => {
    if (!api.isDestroyed?.() && currentPage > 0) {
      api.paginationGoToPreviousPage();
    }
  };

  const handleNextPage = () => {
    if (!api.isDestroyed?.() && currentPage < totalPages - 1) {
      api.paginationGoToNextPage();
    }
  };

  const handleFirstPage = () => {
    handlePageClick(0);
  };

  const handleLastPage = () => {
    handlePageClick(totalPages - 1);
  };

  // 페이징 비활성 또는 0건: 페이지 컨트롤 없이 총 건수만 표시
  if (!paginationEnabled || totalRows === 0) {
    return (
      <nav role="navigation" aria-label="pagination" className="flex items-center justify-start gap-1 py-2">
        <Badge variant="outline" className="gap-1 px-2.5 py-1 text-[13px] font-normal">
          <span className="text-muted-foreground">총</span>
          <span className="font-semibold">{totalRows.toLocaleString()}</span>
          <span className="text-muted-foreground">건</span>
        </Badge>
      </nav>
    );
  }

  return (
    <nav role="navigation" aria-label="pagination" className="flex items-center justify-start gap-1 py-2">
      <Button variant="outline" size="sm" onClick={handleFirstPage} disabled={currentPage === 0} className="!px-1">
        <ChevronFirst className="size-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={handlePrevBlock} disabled={!hasPrevBlock} className="!px-1">
        <ChevronsLeft className="size-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 0} className="gap-1 px-2">
        <span>Prev</span>
      </Button>

      {pageButtons.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePageClick(page)}
          className={cn('min-w-8 px-2', page === currentPage && 'pointer-events-none bg-[#405189] hover:bg-[#405189]')}
        >
          {page + 1}
        </Button>
      ))}

      <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages - 1} className="gap-1 px-2">
        <span>Next</span>
      </Button>

      <Button variant="outline" size="sm" onClick={handleNextBlock} disabled={!hasNextBlock} className="!px-1">
        <ChevronsRight className="size-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={handleLastPage} disabled={currentPage === totalPages - 1} className="!px-1">
        <ChevronLast className="size-4" />
      </Button>

      <div className="ml-3 flex items-center gap-2">
        <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-[13px] font-normal">
          <span className="text-muted-foreground">현재</span>
          <span className="font-semibold">{startRow.toLocaleString()}</span>
          <span className="text-muted-foreground">~</span>
          <span className="font-semibold">{endRow.toLocaleString()}</span>
        </Badge>
        <Badge variant="outline" className="gap-1 px-2.5 py-1 text-[13px] font-normal">
          <span className="text-muted-foreground">총</span>
          <span className="font-semibold">{totalRows.toLocaleString()}</span>
          <span className="text-muted-foreground">건</span>
        </Badge>
      </div>
    </nav>
  );
}
