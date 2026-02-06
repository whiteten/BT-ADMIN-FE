import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TenMinRow } from '../types/sd.types';
import { formatNumber, getStatLabel } from '../hooks/useSdHelpers';

interface TenMinTableProps {
  rows: TenMinRow[];
  statTypes: string[];
}

export default function TenMinTable({ rows, statTypes }: TenMinTableProps) {
  if (!rows.length || !statTypes.length) {
    return <div className="flex h-32 items-center justify-center text-muted-foreground">데이터 없음</div>;
  }

  return (
    <div className="max-h-[400px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background">시간</TableHead>
            {statTypes.map((st) => (
              <TableHead key={st} className="text-center text-xs">
                {getStatLabel(st)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.timeSlot}>
              <TableCell className="sticky left-0 bg-background text-xs font-medium">{row.timeSlot}</TableCell>
              {statTypes.map((st) => (
                <TableCell key={st} className="text-center text-xs tabular-nums">
                  {formatNumber(row[st] as number)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
