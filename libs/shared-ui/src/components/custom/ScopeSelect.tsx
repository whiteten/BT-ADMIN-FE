import { Select } from 'antd';
import { Building2, Server } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ScopeOption {
  /** 선택 값(테넌트 ID / 노드 ID 등). */
  id: number | string;
  /** 표시 이름. */
  name: string;
  /** 옵션 라벨 뒤에 표시할 카운트(선택). */
  count?: number;
}

export interface ScopeSelectProps {
  /** 선택 대상 종류 — 라벨/아이콘 결정. 기본 'tenant'. 노드-primary 화면은 'node' 로 확장. */
  kind?: 'tenant' | 'node';
  /** 선택 옵션 목록(전체 항목은 컴포넌트가 자동 추가). */
  options: ScopeOption[];
  /** 현재 선택 값(null = 전체). */
  value: string | null;
  /** 선택 변경(null = 전체). */
  onChange: (id: string | null) => void;
  /** "전체" 항목 라벨 override. 기본 kind 에 따라 "전체 테넌트"/"전체 노드". */
  allLabel?: string;
  /** 드롭다운 너비(px). 기본 190. */
  width?: number;
  disabled?: boolean;
  className?: string;
}

const ALL = '__all__';

/**
 * 운영자/통합운영 스코프 선택 드롭다운 (공통 컴포넌트).
 *
 * <p>테넌트 대행/노드 선택 등 "전체 ↔ 특정 대상" 스코프 전환을 헤더 액션 영역에 얹는 앰버 드롭다운.
 * 순수 controlled 컴포넌트 — 스토어/조회 로직은 호출측이 담당한다(테넌트=운영자 스토어, 노드=화면 상태 등).
 * 특정 대상 선택 시(대행/스코프 중) 앰버로 강조된다.</p>
 *
 * @example  // 테넌트(운영자 대행)
 * <ScopeSelect kind="tenant" options={tenants} value={actAsTenantId} onChange={setActAsTenant} />
 * @example  // 노드(브랜치 D 확장)
 * <ScopeSelect kind="node" options={nodes} value={nodeId} onChange={setNodeId} />
 */
export default function ScopeSelect({ kind = 'tenant', options, value, onChange, allLabel, width = 190, disabled, className }: ScopeSelectProps) {
  const acting = value != null;
  const Icon = kind === 'node' ? Server : Building2;
  const defaultAll = allLabel ?? (kind === 'node' ? '전체 노드' : '전체 테넌트');
  const selectOptions = [
    { value: ALL, label: defaultAll },
    ...options.map((o) => ({
      value: String(o.id),
      label: o.count != null ? `${o.name} (${o.count.toLocaleString()})` : o.name,
    })),
  ];
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 h-8 pl-2 rounded-md border transition-colors',
        acting ? 'border-amber-500 bg-amber-50 shadow-[0_0_0_2px_rgba(217,119,6,.15)]' : 'border-amber-300 bg-white',
        className,
      )}
      title={acting ? '대행/스코프 중 — 등록·수정이 이 대상에 반영됩니다' : '전체 조회 중'}
    >
      <Icon className={cn('size-3.5 shrink-0', acting ? 'text-amber-600' : 'text-amber-500')} />
      <Select
        size="small"
        variant="borderless"
        value={value ?? ALL}
        onChange={(v) => onChange(v === ALL ? null : v)}
        options={selectOptions}
        style={{ width }}
        disabled={disabled}
        popupMatchSelectWidth={false}
        classNames={{ popup: { root: 'min-w-[180px]' } }}
      />
    </div>
  );
}
