import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperatorScopeStore } from '@/shared-store';

const REPORT_LIST_PATH = '/insight/statistics/reports';

/**
 * 장표 화면(뷰/편집) 안에서 운영자 모드 진입·해제 또는 대행(act-as) 테넌트 변경이
 * 일어나면 보고서 목록으로 강제 복귀시킨다.
 *
 * 스코프가 바뀌면 요청 컨텍스트 테넌트가 달라져 현재 reportId 가 더 이상 유효하지
 * 않을 수 있고("보고서를 찾을 수 없습니다"), 화면을 그대로 유지할 방법이 없다.
 * 장표 내부의 테넌트 검색조건(뷰어 로컬 상태) 변경은 운영자 스코프 스토어를 건드리지
 * 않으므로 이 훅의 복귀 대상이 아니다.
 */
export function useExitReportOnScopeChange() {
  const navigate = useNavigate();
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const initialRef = useRef<{ operatorMode: boolean; actAsTenantId: string | null } | null>(null);

  useEffect(() => {
    if (initialRef.current == null) {
      initialRef.current = { operatorMode, actAsTenantId };
      return;
    }
    if (initialRef.current.operatorMode !== operatorMode || initialRef.current.actAsTenantId !== actAsTenantId) {
      // 스코프가 바뀐 상세 화면은 히스토리에 남겨도 뒤로가기 시 다시 404 이므로 replace.
      navigate(REPORT_LIST_PATH, { replace: true });
    }
  }, [operatorMode, actAsTenantId, navigate]);
}
