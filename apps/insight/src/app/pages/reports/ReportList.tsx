import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Segmented, Select, Tag } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import ReportCard from '../../features/report/components/ReportCard';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../features/report/constants/reportIconConstants';
import { useGetReports } from '../../features/report/hooks/useReportQueries';
import type { DomainCode, ReportListItem } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

type OwnershipFilter = 'ALL' | 'MINE' | 'PUBLISHED';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '보고서', path: '/insight/statistics/reports' }];

const DOMAIN_SECTIONS: DomainCode[] = ['IE', 'IC', 'IR'];

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

  const byDomain = useMemo<Record<DomainCode, ReportListItem[]>>(() => {
    const kw = searchValue.trim().toLowerCase();
    const grouped: Record<DomainCode, ReportListItem[]> = { IE: [], IC: [], IR: [] };
    reports
      .filter((r) => {
        if (!kw) return true;
        return r.title.toLowerCase().includes(kw) || r.datasourceKey.toLowerCase().includes(kw);
      })
      .forEach((r) => {
        if (grouped[r.domain]) grouped[r.domain].push(r);
      });
    return grouped;
  }, [reports, searchValue]);

  const activeSections = domain ? [domain as DomainCode] : DOMAIN_SECTIONS;
  const hasAnyMatch = activeSections.some((d) => byDomain[d].length > 0);
  const isFiltered = !!searchValue || ownership !== 'ALL';

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

      {/* 도메인별 섹션 */}
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : !hasAnyMatch && isFiltered ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '조회된 데이터가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full overflow-y-auto pb-4">
          {activeSections.map((d) => (
            <DomainSection key={d} domain={d} items={byDomain[d]} onNew={() => navigate('/insight/statistics/reports/new')} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DomainSectionProps {
  domain: DomainCode;
  items: ReportListItem[];
  onNew: () => void;
}

function DomainSection({ domain, items, onNew }: DomainSectionProps) {
  const label = DOMAIN_LABELS[domain];

  return (
    <section className="bg-white bt-shadow">
      <div className="flex items-center gap-2 px-7 pt-5 pb-3">
        <Tag color={DOMAIN_TAG_COLOR[domain]} className="font-mono !text-sm !font-bold !px-2 !py-0.5">
          {domain}
        </Tag>
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[12px] text-[var(--color-bt-fg-muted)]">· {items.length}개</span>
      </div>

      <div className="px-7 pb-5">
        {items.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {items.map((report) => (
              <ReportCard key={report.reportId} report={report} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-[12.5px] text-[var(--color-bt-fg-muted)]">
            <span>{label} 도메인에 등록된 보고서가 없습니다.</span>
            <Button size="small" onClick={onNew}>
              + 새 보고서
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
