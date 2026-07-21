import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

interface OperatorScopeStore {
  /** 운영자 모드(통합운영) 활성 여부 — 시스템 관리자가 헤더 테넌트칩에서 진입. */
  operatorMode: boolean;
  /**
   * 대행(act-as) 중인 테넌트 ID.
   * - null  = "전체"(view-all) — 모든 테넌트 크로스 조회(읽기 위주)
   * - 값 있음 = 그 테넌트를 대행 — CUD 가 그 테넌트에 반영됨
   */
  actAsTenantId: string | null;
  /** 운영자 모드 진입(기본 "전체"). */
  enter: () => void;
  /** 운영자 모드 종료(일반 콘솔 복귀). */
  exit: () => void;
  /**
   * 운영자 모드 값 직접 설정(서버 권위 미러용).
   * 부팅 시 /me 응답의 operatorMode 로 store 를 서버 상태와 동기화한다.
   */
  setOperatorMode: (operatorMode: boolean) => void;
  /** 대행 테넌트 설정(null = 전체로 복귀). 운영자 모드가 아니면 무시. */
  setActAsTenant: (tenantId: string | null) => void;
  /** 로그아웃 시 초기화. */
  reset: () => void;
}

/**
 * 운영자 모드(통합운영) 스코프 스토어.
 *
 * <p>시스템 관리자가 헤더 TenantChip 에서 "운영자 모드"를 선택하면 켜진다. 켜지면:
 * 헤더가 앰버로 강조되고, 사이드바에 운영자 전용 메뉴가 추가되며, 화면은 활성 테넌트 대신
 * 전체(view-all) 또는 대행 테넌트로 스코프된다.</p>
 *
 * <p>operatorMode 는 이제 <b>서버 권위(토큰 operatorMode 클레임)</b>다. view-all 판정은 BFF 가
 * 토큰으로 하므로 FE 는 헤더를 보내지 않는다. 대행(act-as)만 FE 가 {@code X-Act-As-Tenant} 로
 * 보낸다(BFF 가 isSystemAdmin 검증 후 X-Tenant-Id override). 이 store 는 서버 상태의 미러이며,
 * 부팅 시 /me 응답의 operatorMode 로 재초기화된다({@code setOperatorMode}).</p>
 *
 * <p>persist(sessionStorage): 같은 탭 새로고침 시 모드 유지(서버 미러 도착 전 깜빡임 방지).
 * 탭 종료/로그아웃 시 해제.</p>
 */
export const useOperatorScopeStore = create<OperatorScopeStore>()(
  devtools(
    persist(
      (set, get) => ({
        operatorMode: false,
        actAsTenantId: null,
        enter: () => set({ operatorMode: true, actAsTenantId: null }, false, 'enter'),
        exit: () => set({ operatorMode: false, actAsTenantId: null }, false, 'exit'),
        setOperatorMode: (operatorMode) => set({ operatorMode }, false, 'setOperatorMode'),
        setActAsTenant: (actAsTenantId) => {
          if (!get().operatorMode) return;
          set({ actAsTenantId }, false, 'setActAsTenant');
        },
        reset: () => set({ operatorMode: false, actAsTenantId: null }, false, 'reset'),
      }),
      {
        name: 'operator-scope-store',
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
    { name: 'operator-scope-store' },
  ),
);
