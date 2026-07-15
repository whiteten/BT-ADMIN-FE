import { useEffect } from 'react';
import { Building2, Check, Eye, Layers, ShieldCheck } from 'lucide-react';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { useTaskboardTenantScope } from '../hooks/useTaskboardTenantScope';
import { cn } from '@/lib/utils';

/**
 * TASKBOARD 관리 화면 상단 테넌트 바 (운영자 모드 전용).
 *
 * <p>시스템 관리자가 운영자 모드일 때만 노출. 전체 테넌트 목록을 칩으로 보여주고:
 * - 1개 선택 = 그 테넌트로 이동(act-as) → 생성/수정 가능.
 * - 2개 이상 선택 = 다중 View(보기 전용) — 생성/수정 잠금, View/삭제/선택만.
 * - 0개(전체) = view-all 조회.</p>
 *
 * <p>선택은 공용 useOperatorScopeStore.setActAsTenant 로 동기화되어 apiClient 가 스코프 헤더를 주입한다.
 * (멀티 선택 시 실제 목록 병합 조회는 BE 후속 작업 — 현재는 보기 전용 가드 + 배지까지.)</p>
 */
export default function TaskboardTenantBar() {
  const userInfo = useAuthStore((s) => s.userInfo);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);
  const selectedTenantIds = useTaskboardTenantScope((s) => s.selectedTenantIds);
  const toggle = useTaskboardTenantScope((s) => s.toggle);
  const clear = useTaskboardTenantScope((s) => s.clear);

  const tenants = userInfo?.availableTenants ?? [];
  const isSystemAdmin = !!userInfo?.isSystemAdmin;

  // 쓰기(생성/수정) 스코프 동기화 — 1개 선택이면 그 테넌트로 act-as(X-Act-As-Tenant), 아니면 해제.
  // 목록 "조회"는 각 훅이 tenantIds 파라미터로 처리하므로(키에 반영 → 자동 재조회) 여기서 무효화하지 않는다.
  useEffect(() => {
    if (!operatorMode) return;
    setActAsTenant(selectedTenantIds.length === 1 ? selectedTenantIds[0] : null);
  }, [selectedTenantIds, operatorMode, setActAsTenant]);

  // 운영자 모드 + 시스템 관리자에서만 노출.
  if (!operatorMode || !isSystemAdmin) return null;

  const count = selectedTenantIds.length;
  const canEdit = count === 1; // 정확히 1개 선택일 때만 생성·수정 가능(그 외 전체/다중은 보기 전용)
  const singleName = canEdit ? (tenants.find((t) => String(t.tenantId) === selectedTenantIds[0])?.tenantName ?? `테넌트 ${selectedTenantIds[0]}`) : '';

  return (
    <div className="w-full mb-2 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-2">
      {/* 헤더: 라벨 + 현재 모드 배지 */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 shrink-0">
          <ShieldCheck className="size-3.5" /> 운영자 · 테넌트
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-semibold shrink-0',
            canEdit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
          )}
        >
          {canEdit ? (
            <>
              <Layers className="size-3" /> {singleName} · 편집
            </>
          ) : count === 0 ? (
            <>
              <Eye className="size-3" /> 전체 · 보기전용
            </>
          ) : (
            <>
              <Eye className="size-3" /> {count}개 · 보기전용
            </>
          )}
        </span>
      </div>

      {/* 테넌트 카드(중복 선택 가능) — 네모난 카드형, 줄바꿈 그리드 */}
      <div className="flex flex-wrap gap-1.5">
        {/* 전체(view-all) */}
        <button
          type="button"
          onClick={() => clear()}
          title="전체 테넌트 보기"
          className={cn(
            'flex items-center justify-center h-8 min-w-[48px] px-2.5 rounded-md border text-[11px] font-semibold transition-colors',
            count === 0 ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300',
          )}
        >
          전체
        </button>

        {tenants.map((t) => {
          const id = String(t.tenantId);
          const selected = selectedTenantIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              title={selected ? '클릭하여 선택 해제' : '클릭하여 선택(여러 개 선택 시 보기 전용)'}
              className={cn(
                'relative flex items-center gap-1.5 h-8 min-w-[72px] max-w-[160px] px-2.5 rounded-md border transition-colors',
                selected ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300',
              )}
            >
              <Building2 className={cn('size-3.5 shrink-0', selected ? 'text-white' : 'text-slate-400')} />
              <span className="truncate text-[11px] font-medium">{t.tenantName}</span>
              {selected && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center size-3.5 rounded-full bg-emerald-500 text-white ring-1 ring-white">
                  <Check className="size-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
