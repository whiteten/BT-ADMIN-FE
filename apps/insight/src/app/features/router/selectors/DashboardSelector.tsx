import { Select } from 'antd';
import type { QuerySelectorProps } from '@/shared-store';
import { DOMAIN_LABELS } from '../../monitoring/constants/monitoringConstants';
import { useGetDashboards } from '../../monitoring/hooks/useDashboardQueries';
import type { DomainCode } from '../../monitoring/types';

/**
 * 메뉴 등록 폼에서 모니터링 대시보드를 고르는 도메인 selector.
 *
 * 목록은 보고서(ReportSelector)와 동일하게 리스트 화면과 같은 useGetDashboards 훅을 재사용한다.
 * 따라서 BE findAll 의 소유자 필터가 그대로 적용되어 "내가 만든 대시보드"만 선택지로 노출된다.
 * 선택한 대시보드의 dashboardId 가 메뉴 path 에 `?dashboardId=` 쿼리로 합성되어 저장되고,
 * 사용자 진입 시 DashboardView 가 그 값으로 해당 대시보드를 렌더한다.
 */
export default function DashboardSelector({ spec, value, onChange }: QuerySelectorProps) {
  const { data: dashboards = [], isLoading } = useGetDashboards();

  // 도메인별 그룹 옵션 (value 는 쿼리스트링이라 문자열로 통일)
  const byDomain = new Map<DomainCode, { value: string; label: string }[]>();
  for (const d of dashboards) {
    const list = byDomain.get(d.domainCode) ?? [];
    list.push({ value: String(d.dashboardId), label: d.dashboardName });
    byDomain.set(d.domainCode, list);
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
