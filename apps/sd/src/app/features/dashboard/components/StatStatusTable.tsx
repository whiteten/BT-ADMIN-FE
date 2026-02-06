import { Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StatStatus } from '../types/sd.types';
import { getStatLabel } from '../hooks/useSdHelpers';

interface StatStatusTableProps {
  statStatuses: StatStatus[] | undefined;
}

export default function StatStatusTable({ statStatuses }: StatStatusTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          통계 상태
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시스템</TableHead>
              <TableHead>통계 유형</TableHead>
              <TableHead>최종 집계</TableHead>
              <TableHead>DB 갱신</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statStatuses?.length ? (
              statStatuses.map((stat, idx) => (
                <TableRow key={`${stat.statType}-${stat.systemType}-${idx}`}>
                  <TableCell>{stat.systemType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getStatLabel(stat.statType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{stat.latestAggregationTime ?? '-'}</TableCell>
                  <TableCell className="text-xs">{stat.dbUpdateTime ?? '-'}</TableCell>
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
      </CardContent>
    </Card>
  );
}
