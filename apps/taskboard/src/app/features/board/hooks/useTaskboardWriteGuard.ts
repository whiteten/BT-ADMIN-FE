import { useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useTaskboardTenantScope } from './useTaskboardTenantScope';

/**
 * 운영자 모드에서 생성/수정(DB insert·update)을 "단일 테넌트 선택" 상태로만 허용하는 가드.
 *
 * <p>어느 테넌트에 쓸지 확정된 경우(정확히 1개 선택 = act-as)에만 쓰기를 허용한다.
 * 전체(0개 = view-all)나 여러 개 선택은 대상 테넌트가 애매하므로 View/삭제/선택만 허용하고
 * 생성·수정은 알림 후 차단한다. (운영자 모드가 아니면 항상 허용 — 기존 단일 테넌트 동작)</p>
 *
 * @example
 * const { blocked, guardWrite } = useTaskboardWriteGuard();
 * const handleSave = () => { if (!guardWrite()) return; ... };
 */
export function useTaskboardWriteGuard() {
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const selectedTenantIds = useTaskboardTenantScope((s) => s.selectedTenantIds);

  // 운영자 모드에서 "정확히 1개 테넌트" 선택이 아니면(0개=전체 또는 2개 이상) 쓰기 차단.
  const blocked = operatorMode && selectedTenantIds.length !== 1;

  /**
   * 쓰기(생성/수정) 가능 여부를 반환. 차단 상태면 알림 후 false.
   * @returns 쓰기 진행 가능하면 true, 차단이면 false.
   */
  const guardWrite = (): boolean => {
    if (blocked) {
      toast.warning('여러 테넌트를 함께 보는 중에는 생성·수정할 수 없습니다. 상단에서 단일 테넌트를 선택한 뒤 진행하세요.');
      return false;
    }
    return true;
  };

  return { blocked, guardWrite };
}
