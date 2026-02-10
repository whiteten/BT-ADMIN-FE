import { ChevronFirst, ChevronLast, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../shadcn/badge';
import { Button } from '../shadcn/button';

interface ServerPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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

export default function ServerPagination({ currentPage, totalItems, pageSize, onPageChange }: ServerPaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const pageButtons = getPageButtons(totalPages, currentPage);

  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalItems);

  const currentBlock = getPageBlock(currentPage);
  const hasPrevBlock = currentBlock > 0;
  const hasNextBlock = (currentBlock + 1) * BUTTONS_PER_BLOCK < totalPages;

  const handlePageClick = (page: number) => {
    onPageChange(page);
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
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirstPage = () => {
    handlePageClick(0);
  };

  const handleLastPage = () => {
    handlePageClick(totalPages - 1);
  };

  if (totalItems === 0) {
    return (
      <nav role="navigation" aria-label="pagination" className="flex items-center justify-start gap-1 bg-white bt-shadow px-5 py-2">
        <Badge variant="outline" className="gap-1 px-2.5 py-1 text-[13px] font-normal">
          <span className="text-muted-foreground">총</span>
          <span className="font-semibold">0</span>
          <span className="text-muted-foreground">건</span>
        </Badge>
      </nav>
    );
  }

  return (
    <nav role="navigation" aria-label="pagination" className="flex items-center justify-start gap-1 bg-white bt-shadow px-5 py-2">
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
          <span className="font-semibold">{totalItems.toLocaleString()}</span>
          <span className="text-muted-foreground">건</span>
        </Badge>
      </div>
    </nav>
  );
}
