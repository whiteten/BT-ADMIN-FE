import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';

/**
 * TASKBOARD 운영자 모드 테넌트 스코프(멀티 선택) 스토어.
 *
 * <p>운영자 모드(통합운영)에서 taskboard 상단 바(TaskboardTenantBar)가 선택한 테넌트 목록을 담는다.
 * - 1개 선택 = 그 테넌트로 이동(act-as) → 생성/수정 가능(바 컴포넌트가 useOperatorScopeStore.setActAsTenant 로 동기화).
 * - 2개 이상 선택 = 다중 View(보기 전용) — 생성/수정 금지(useTaskboardWriteGuard 가 차단), View/삭제/선택만.
 * - 0개 = 전체(view-all).</p>
 *
 * <p>실제 API 스코프 헤더(X-Act-As-Tenant / X-View-All-Tenants) 주입은 공용 useOperatorScopeStore →
 * apiClient 경로가 담당한다. 이 스토어는 taskboard 화면이 "몇 개 테넌트를 함께 보는지"만 관리한다.</p>
 *
 * <p>persist(sessionStorage): 같은 탭 새로고침 시 유지. 탭 종료/로그아웃 시 해제.</p>
 */
interface TaskboardTenantScopeStore {
  /** 운영자 모드에서 함께 보기로 선택한 테넌트 ID 목록(문자열). */
  selectedTenantIds: string[];
  /** 단일 선택으로 교체(그 테넌트로 이동). */
  setSingle: (tenantId: string) => void;
  /** 선택 토글(멀티 선택/해제). */
  toggle: (tenantId: string) => void;
  /** 전체(view-all)로 — 선택 비우기. */
  clear: () => void;
  /** 로그아웃/모드 종료 시 초기화. */
  reset: () => void;
}

export const useTaskboardTenantScope = create<TaskboardTenantScopeStore>()(
  devtools(
    persist(
      (set) => ({
        selectedTenantIds: [],
        setSingle: (tenantId) => set({ selectedTenantIds: [tenantId] }, false, 'setSingle'),
        toggle: (tenantId) =>
          set(
            (s) => ({
              selectedTenantIds: s.selectedTenantIds.includes(tenantId) ? s.selectedTenantIds.filter((id) => id !== tenantId) : [...s.selectedTenantIds, tenantId],
            }),
            false,
            'toggle',
          ),
        clear: () => set({ selectedTenantIds: [] }, false, 'clear'),
        reset: () => set({ selectedTenantIds: [] }, false, 'reset'),
      }),
      {
        name: 'taskboard-tenant-scope',
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
    { name: 'taskboard-tenant-scope' },
  ),
);

/**
 * 목록 조회에 붙일 tenantIds 쿼리 파라미터(콤마 구분)를 계산한다.
 * - 운영자 모드가 아니면 undefined(파라미터 미전송 = 현재 테넌트 단일 조회, 기존 동작).
 * - 운영자 모드 + 선택 있음 → 선택한 테넌트들.
 * - 운영자 모드 + 선택 없음(전체) → 접근 가능한 전체 테넌트.
 * 이 값이 바뀌면 목록 쿼리 키가 바뀌어 자동으로 재조회된다.
 */
export function useTaskboardTenantParam(): string | undefined {
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const selected = useTaskboardTenantScope((s) => s.selectedTenantIds);
  const userInfo = useAuthStore((s) => s.userInfo);
  if (!operatorMode) return undefined;
  const ids = selected.length > 0 ? selected : (userInfo?.availableTenants ?? []).map((t) => String(t.tenantId));
  return ids.length > 0 ? ids.join(',') : undefined;
}
