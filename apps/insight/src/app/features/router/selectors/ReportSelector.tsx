import { Select } from 'antd';
import type { QuerySelectorProps } from '@/shared-store';
import { DOMAIN_LABELS } from '../../report/constants/reportIconConstants';
import { useGetReports } from '../../report/hooks/useReportQueries';

/**
 * 메뉴 등록 폼에서 보고서를 고르는 도메인 selector.
 *
 * insight 는 전 모듈(IE/IC/IR …)의 통합 통계를 한 곳에서 보여주므로, 보고서 목록을 도메인별로
 * 그룹지어 노출한다. 선택한 보고서의 reportId 가 메뉴 path 에 `?reportId=` 쿼리로 합성되어 저장되고,
 * 사용자 진입 시 ReportView 가 그 값으로 해당 보고서를 렌더한다.
 *
 * 옵션은 하드코딩이 아니라 useGetReports 로 실제 보고서 목록을 조회한다(도메인 selector 패턴).
 */
export default function ReportSelector({ spec, value, onChange }: QuerySelectorProps) {
  const { data: reports = [], isLoading } = useGetReports();

  // 도메인별 그룹 옵션 (value 는 쿼리스트링이라 문자열로 통일)
  const byDomain = new Map<string, { value: string; label: string }[]>();
  for (const r of reports) {
    const list = byDomain.get(r.domain) ?? [];
    list.push({ value: String(r.reportId), label: r.title });
    byDomain.set(r.domain, list);
  }
  const groupedOptions = [...byDomain.entries()].map(([domain, options]) => ({
    label: `${DOMAIN_LABELS[domain] ?? domain} (${domain})`,
    title: domain,
    options,
  }));

  return (
    <Select
      value={value}
      onChange={(v) => onChange(v ?? undefined)}
      options={groupedOptions}
      loading={isLoading}
      showSearch
      optionFilterProp="label"
      allowClear
      placeholder={`${spec.label} 선택`}
      className="w-full"
    />
  );
}
