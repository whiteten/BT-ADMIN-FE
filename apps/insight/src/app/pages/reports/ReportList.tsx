import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Segmented, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import ReportCard from '../../features/report/components/ReportCard';
import { DOMAIN_LABELS } from '../../features/report/constants/reportIconConstants';
import { useGetReports } from '../../features/report/hooks/useReportQueries';
import type { DomainCode } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

type OwnershipFilter = 'ALL' | 'MINE' | 'PUBLISHED';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '인사이트' }, { title: '보고서', path: '/insight/statistics/reports' }];

export default function ReportList() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [ownership, setOwnership] = useState<OwnershipFilter>('ALL');
  const [domain, setDomain] = useState<DomainCode | ''>('');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: reports = [], isFetching } = useGetReports({
    params: {
      ownership: ownership !== 'ALL' ? ownership : undefined,
      domain: domain || undefined,
    },
  });

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return reports;
    const kw = searchValue.toLowerCase();
    return reports.filter((r) => r.title.toLowerCase().includes(kw) || r.datasourceKey.toLowerCase().includes(kw));
  }, [reports, searchValue]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 필터 바 */}
      <div className="flex items-center justify-between gap-4 w-full bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-3">
          <Segmented
            value={ownership}
            onChange={(v) => setOwnership(v as OwnershipFilter)}
            options={[
              { value: 'ALL', label: '전체' },
              { value: 'MINE', label: '내 보고서' },
              { value: 'PUBLISHED', label: '메뉴 등록' },
            ]}
          />
          <Select
            value={domain}
            onChange={(v) => setDomain(v as DomainCode | '')}
            options={[
              { value: '', label: '전체 도메인' },
              { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
              { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
              { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
            ]}
            className="!min-w-[140px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="보고서 이름 검색…" className="w-full max-w-[300px]" allowClear />
        </div>
        <Button type="primary" onClick={() => navigate('/insight/statistics/reports/new')}>
          + 새 보고서
        </Button>
      </div>

      {/* 카드 그리드 */}
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 w-full overflow-y-auto">
          {filtered.map((report) => (
            <ReportCard key={report.reportId} report={report} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-white bt-shadow gap-4">
          <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '보고서가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
          {!searchValue && (
            <Button type="primary" onClick={() => navigate('/insight/statistics/reports/new')}>
              + 새 보고서 만들기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
