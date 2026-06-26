import { useEffect, useRef, useState } from 'react';
import { Button, Input, Switch } from 'antd';
import { Plus } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetMonConfigs, useReplaceMonConfig } from '../../hooks/useMonConfigQueries';
import { MON_CONFIG_CATEGORY, type MonConfigSaveItem } from '../../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconTrash } from '@/components/custom/Icons';

interface PrefixRow {
  /** React 행 식별자(로컬). */
  rowId: number;
  /** Redis SCAN MATCH glob 패턴 — CONFIG_KEY. */
  pattern: string;
  /** 표시명 — CONFIG_VALUE. */
  displayName: string;
  description: string;
  enabled: boolean;
}

/**
 * 모니터링 설정 — Redis 키 프리픽스(데이터 소스 화이트리스트) 탭.
 * <p>
 * 트리 탐색이 어떤 Redis 키를 가져올지 결정하는 SCAN MATCH glob 패턴 목록을 편집한다.
 * CONFIG_CATEGORY='REDIS_PREFIX' 카테고리를 통째로 저장(교체)한다.
 */
export default function RedisPrefixSettingTab() {
  const { data: configs, isLoading } = useGetMonConfigs({ params: { category: MON_CONFIG_CATEGORY.REDIS_PREFIX } });
  const { mutate: save, isPending } = useReplaceMonConfig({
    mutationOptions: {
      onSuccess: () => toast.success('Redis 키 프리픽스가 저장되었습니다.'),
    },
  });

  const rowSeq = useRef(0);
  const nextRowId = () => ++rowSeq.current;
  const [rows, setRows] = useState<PrefixRow[]>([]);

  // 서버 데이터 로드 시 행 초기화
  useEffect(() => {
    if (!configs) return;
    setRows(
      configs.map((c) => ({
        rowId: nextRowId(),
        pattern: c.configKey,
        displayName: c.configValue ?? '',
        description: c.description ?? '',
        enabled: c.isEnabled,
      })),
    );
    // configs 변경 시에만 재초기화
  }, [configs]);

  const updateRow = (rowId: number, patch: Partial<PrefixRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, { rowId: nextRowId(), pattern: '', displayName: '', description: '', enabled: true }]);
  const removeRow = (rowId: number) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const handleSave = () => {
    const trimmed = rows.map((r) => ({ ...r, pattern: r.pattern.trim(), displayName: r.displayName.trim() }));
    if (trimmed.some((r) => !r.pattern)) {
      toast.error('키 패턴이 비어있는 행이 있습니다.');
      return;
    }
    const patterns = trimmed.map((r) => r.pattern);
    if (new Set(patterns).size !== patterns.length) {
      toast.error('중복된 키 패턴이 있습니다.');
      return;
    }
    const items: MonConfigSaveItem[] = trimmed.map((r, idx) => ({
      configKey: r.pattern,
      configValue: r.displayName || r.pattern,
      valueType: 'STRING',
      description: r.description || undefined,
      isEnabled: r.enabled,
      sortOrder: (idx + 1) * 10,
    }));
    save({ category: MON_CONFIG_CATEGORY.REDIS_PREFIX, items });
  };

  if (isLoading) {
    return <FallbackSpinner />;
  }

  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Redis 키 프리픽스 (데이터 소스 화이트리스트)</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            데이터셋(REDIS 소스) 트리 탐색이 가져올 Redis 키 범위를 SCAN MATCH glob 패턴으로 지정합니다. 활성 {enabledCount} / 전체 {rows.length}
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={addRow}>
          행 추가
        </Button>
      </div>

      {/* 편집 테이블 */}
      <div className="min-h-0 flex-1 overflow-auto rounded border border-[var(--color-bt-border)]">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-bt-bg-muted)]/70 text-left text-[var(--color-bt-fg-muted)]">
              <th className="border-b border-[var(--color-bt-border)] px-3 py-2 font-semibold">키 패턴 (glob)</th>
              <th className="border-b border-[var(--color-bt-border)] px-3 py-2 font-semibold">표시명</th>
              <th className="border-b border-[var(--color-bt-border)] px-3 py-2 font-semibold">설명</th>
              <th className="w-[72px] border-b border-[var(--color-bt-border)] px-3 py-2 text-center font-semibold">활성</th>
              <th className="w-[56px] border-b border-[var(--color-bt-border)] px-3 py-2 text-center font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rowId} className="border-b border-[var(--color-bt-border)]/60">
                <td className="px-2 py-1.5">
                  <Input size="small" value={r.pattern} onChange={(e) => updateRow(r.rowId, { pattern: e.target.value })} placeholder="예: BOT:MONI:*" className="font-mono" />
                </td>
                <td className="px-2 py-1.5">
                  <Input size="small" value={r.displayName} onChange={(e) => updateRow(r.rowId, { displayName: e.target.value })} placeholder="예: BOT 모니터링" />
                </td>
                <td className="px-2 py-1.5">
                  <Input size="small" value={r.description} onChange={(e) => updateRow(r.rowId, { description: e.target.value })} placeholder="설명 (선택)" />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Switch size="small" checked={r.enabled} onChange={(v) => updateRow(r.rowId, { enabled: v })} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={() => removeRow(r.rowId)} title="삭제">
                    <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[12px] text-[var(--color-bt-fg-muted)]">
                  등록된 프리픽스가 없습니다. “행 추가”로 만드세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 저장 */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-[var(--color-bt-fg-muted)]">저장 시 이 목록으로 전체 교체됩니다(빠진 패턴은 삭제). 패턴이 없으면 전체 Hash 키를 스캔합니다.</p>
        <Button type="primary" onClick={handleSave} loading={isPending}>
          저장
        </Button>
      </div>
    </div>
  );
}
