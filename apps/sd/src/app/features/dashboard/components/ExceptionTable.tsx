import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ExceptionRecord } from '../types/sd.types';
import { formatDate } from '../hooks/useSdHelpers';

interface ExceptionTableProps {
  exceptions: ExceptionRecord[] | undefined;
  isLoading?: boolean;
  onRowClick?: (exception: ExceptionRecord) => void;
}

export default function ExceptionTable({ exceptions, isLoading, onRowClick }: ExceptionTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>시간</TableHead>
            <TableHead>프로세스</TableHead>
            <TableHead>메시지</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exceptions?.length ? (
            exceptions.map((err, idx) => (
              <TableRow
                key={`${err.triggerExId}-${idx}`}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(err)}
              >
                <TableCell className="whitespace-nowrap text-xs">{formatDate(err.errTime, 'SHORT_DATETIME')}</TableCell>
                <TableCell className="text-xs">{err.triggerName}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">{err.errMessage}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                에러 없음
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
