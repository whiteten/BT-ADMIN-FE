/**
 * 그룹DN 통합 진입점.
 * /ipron/gdn 으로 진입 시 현행 실구현 메뉴인 /ipron/acd-gdn(ACD 그룹DN)으로 리디렉션.
 * Phase 2: ACD + CTI큐 + SIP트렁크 3분할 탭 통합 후 이 파일을 실구현으로 교체 예정.
 */
import { Navigate } from 'react-router-dom';

export default function GdnList() {
  return <Navigate to="../acd-gdn" replace />;
}
