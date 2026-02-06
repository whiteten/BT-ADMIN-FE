import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Checkpoint } from '../types/sd.types';
import { formatDate } from '../utils';

interface CheckpointTableProps {
  checkpoints: Checkpoint[] | undefined;
  isLoading?: boolean;
}

/**
 * 체크포인트 이력 테이블
 */
export default function CheckpointTable({ checkpoints, isLoading }: CheckpointTableProps) {
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
            <TableHead>시스템</TableHead>
            <TableHead>데이터 유형</TableHead>
            <TableHead>최종 집계</TableHead>
            <TableHead>갱신 시간</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkpoints?.length ? (
            checkpoints.map((cp, idx) => (
              <TableRow key={`${cp.systemType}-${cp.dataType}-${idx}`}>
                <TableCell>{cp.systemType}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {cp.dataType}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{cp.lastPsrTimeKey ?? '-'}</TableCell>
                <TableCell className="text-xs">
                  {formatDate(cp.lastUpdateTime, 'SHORT_DATETIME')}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                데이터 없음
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
