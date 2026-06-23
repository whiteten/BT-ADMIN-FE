import { useSearchParams } from 'react-router-dom';
import DashboardView from './DashboardView';

/**
 * 메뉴 등록용 대시보드 보기 진입점.
 *
 * dashboardId 를 path 파라미터가 아닌 `?dashboardId=` 쿼리스트링으로 받는다(queryString 메뉴 분기 패턴).
 * 같은 path(`/insight/monitoring/dashboards/view`)를 여러 메뉴가 dashboardId 만 바꿔 공유하므로,
 * 메뉴 전환 시 queryString 만 변하고 컴포넌트가 unmount 되지 않는다. → dashboardId 를 key 로 박아
 * 다른 메뉴로 전환되면 DashboardView 가 새로 초기화되도록 한다.
 */
export default function DashboardMenuView() {
  const [searchParams] = useSearchParams();
  const dashboardId = searchParams.get('dashboardId') ?? '';
  return <DashboardView key={dashboardId} />;
}
