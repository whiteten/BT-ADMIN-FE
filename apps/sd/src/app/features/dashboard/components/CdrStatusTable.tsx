import { Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CdrStatus } from '../types/sd.types';

interface CdrStatusTableProps {
  cdrStatuses: CdrStatus[] | undefined;
}

export default function CdrStatusTable({ cdrStatuses }: CdrStatusTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          CDR 상태
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유형</TableHead>
              <TableHead>테이블</TableHead>
              <TableHead>조회 컬럼</TableHead>
              <TableHead>최신 시간</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cdrStatuses?.length ? (
              cdrStatuses.map((cdr, idx) => (
                <TableRow key={`${cdr.cdrType}-${idx}`}>
                  <TableCell className="font-medium">{cdr.cdrType}</TableCell>
                  <TableCell className="text-xs">{cdr.tableName}</TableCell>
                  <TableCell className="text-xs">{cdr.timeColumn}</TableCell>
                  <TableCell className="text-xs">{cdr.latestDbInsertTime ?? '-'}</TableCell>
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
