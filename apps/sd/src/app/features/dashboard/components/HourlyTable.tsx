import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, getStatLabel, type ChartDataPoint } from '../utils';

interface HourlyTableProps {
  data: ChartDataPoint[];
  statTypes: string[];
}

/**
 * 시간대별 집계 테이블
 * - 24시간 기준 통계 유형별 집계 건수 표시
 */
export default function HourlyTable({ data, statTypes }: HourlyTableProps) {
  if (!data.length || !statTypes.length) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="max-h-[300px] overflow-auto">
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
          {data.map((row) => (
            <TableRow key={row.hour}>
              <TableCell className="sticky left-0 bg-background text-xs font-medium">
                {row.hour}
              </TableCell>
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
