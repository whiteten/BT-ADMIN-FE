import { Building2 } from 'lucide-react';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';

/** availableTenants 기반 테넌트 ID → 이름 매핑. */
export function useTenantNameMap(): Map<string, string> {
  const userInfo = useAuthStore((s) => s.userInfo);
  return new Map((userInfo?.availableTenants ?? []).map((t) => [String(t.tenantId), t.tenantName]));
}

/**
 * 목록 항목에 소속 테넌트를 표시하는 배지.
 * 운영자 모드에서만 노출된다(일반 사용자는 자기 테넌트만 보므로 배지 불필요). tenantId가 없으면 렌더 안 함.
 */
export default function TenantBadge({ tenantId }: { tenantId?: string | number | null }) {
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const nameMap = useTenantNameMap();
  if (!operatorMode || tenantId == null || tenantId === '') return null;
  const id = String(tenantId);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 max-w-full"
      title={`테넌트: ${nameMap.get(id) ?? id}`}
    >
      <Building2 className="size-2.5 shrink-0" />
      <span className="truncate">{nameMap.get(id) ?? `테넌트 ${id}`}</span>
    </span>
  );
}
