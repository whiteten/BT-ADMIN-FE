import { useEffect, useState } from 'react';
import { Button, Checkbox, Drawer, Input, Select } from 'antd';
import { Check } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useCreateMonitoringLookupCatalog, useFetchLookupCatalogSchemaPreview, useUpdateMonitoringLookupCatalog } from '../../hooks/useLookupCatalogQueries';
import type { LookupCatalogItem, SchemaPreview } from '../../types';

interface LookupCatalogFormDrawerProps {
  open: boolean;
  /** null이면 신규 등록, 값이 있으면 편집 모드 */
  initial: LookupCatalogItem | null;
  onClose: () => void;
  /** 저장 성공 시 호출. 부모는 목록 invalidate */
  onSaved: (item: LookupCatalogItem) => void;
}

const CATEGORY_OPTIONS = [
  { value: '일반', label: '일반' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
];

/**
 * 코드 룩업 카탈로그 등록/편집 Drawer.
 * <p>
 * 등록 모드: 테이블명 → 스키마 미리보기 → 메타 입력 → 저장 (3-step)
 * 편집 모드: 테이블명 변경 불가, 표시명·카테고리·설명·권장 키/값 컬럼만 수정.
 * 패턴은 AdminMasterRegisterDrawer 기반 + 실제 API 호출.
 */
export default function LookupCatalogFormDrawer({ open, initial, onClose, onSaved }: LookupCatalogFormDrawerProps) {
  const isEdit = !!initial;

  const [tableName, setTableName] = useState('');
  const [preview, setPreview] = useState<SchemaPreview | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('일반');
  const [description, setDescription] = useState('');
  const [recommendedKey, setRecommendedKey] = useState('');
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  const reset = () => {
    setTableName('');
    setPreview(null);
    setDisplayName('');
    setCategory('일반');
    setDescription('');
    setRecommendedKey('');
    setSelectedValues(new Set());
  };

  // Drawer가 열릴 때 초기값 세팅 (편집 모드)
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTableName(initial.tableName);
      setDisplayName(initial.displayName);
      setCategory(initial.category ?? '일반');
      setDescription(initial.description ?? '');
      setRecommendedKey(initial.recommendedKey);
      setSelectedValues(new Set(initial.recommendedValues));
      // 편집 모드 — 기존 스키마 자동 로드해 권장 키/값 select 옵션 노출
      fetchPreview(initial.tableName, { silent: true });
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const handleClose = () => {
    reset();
    onClose();
  };

  // 스키마 미리보기 — BFF 호출. silent=true면 토스트 안 띄움 (편집 모드 자동 로드)
  const { mutate: runFetchPreview, isPending: isLoadingPreview } = useFetchLookupCatalogSchemaPreview({
    mutationOptions: {
      onSuccess: (result, _vars) => {
        setPreview(result);
        // 신규 등록 시에만 권장 키/값 자동 선택
        if (!isEdit) {
          const pk = result.columns.find((c) => c.isPrimaryKey)?.name ?? result.columns[0]?.name ?? '';
          setRecommendedKey(pk);
          const defaultValues = result.columns
            .filter((c) => !c.isPrimaryKey)
            .slice(0, 2)
            .map((c) => c.name);
          setSelectedValues(new Set(defaultValues));
        }
      },
      onError: (e) => {
        setPreview(null);
        toast.error('스키마 로드 실패 — 테이블명을 확인하세요.');
        Log.error('schema preview failed', e);
      },
    },
  });
  const fetchPreview = (name: string, opts?: { silent?: boolean }) => {
    runFetchPreview(name, {
      onSuccess: (result) => {
        if (!opts?.silent) toast.success(`스키마 로드 완료 — 컬럼 ${result.columns.length}개`);
      },
    });
  };

  const handleLoadSchema = () => {
    const t = tableName.trim();
    if (!t) return;
    fetchPreview(t);
  };

  const toggleValue = (col: string) => {
    const next = new Set(selectedValues);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setSelectedValues(next);
  };

  const canSave = !!preview && !!displayName.trim() && !!recommendedKey && selectedValues.size > 0;

  // 등록/수정 mutation
  const { mutate: runCreate, isPending: isCreating } = useCreateMonitoringLookupCatalog({
    mutationOptions: {
      onSuccess: (item) => {
        toast.success(`"${item.displayName}"이(가) 등록되었습니다.`);
        onSaved(item);
        handleClose();
      },
      onError: () => toast.error('등록 실패'),
    },
  });
  const { mutate: runUpdate, isPending: isUpdating } = useUpdateMonitoringLookupCatalog({
    mutationOptions: {
      onSuccess: (item) => {
        toast.success(`"${item.displayName}"이(가) 수정되었습니다.`);
        onSaved(item);
        handleClose();
      },
      onError: () => toast.error('수정 실패'),
    },
  });

  const handleSave = () => {
    if (!canSave || !preview) return;
    const payload = {
      displayName: displayName.trim(),
      tableName: preview.tableName,
      category,
      description: description.trim() || undefined,
      recommendedKey,
      recommendedValues: Array.from(selectedValues),
    };
    if (isEdit && initial) runUpdate({ lookupCatalogId: initial.lookupCatalogId, data: payload });
    else runCreate(payload);
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <span>{isEdit ? '코드 룩업 편집' : '+ 새 코드 룩업 등록'}</span>
          <span className="rounded bg-[var(--color-bt-warn-soft)] px-1.5 py-0.5 mono text-[9px] font-bold text-[var(--color-bt-warn)]">ADMIN 전용</span>
        </div>
      }
      placement="right"
      width={560}
      open={open}
      onClose={handleClose}
      destroyOnHidden
    >
      <div className="space-y-4">
        {/* Step 1 — 테이블 + 스키마 로드 (편집 모드는 테이블명 readonly) */}
        <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${preview ? 'bg-[var(--color-bt-success)] text-white' : 'bg-[var(--color-bt-primary)] text-white'}`}
            >
              {preview ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span className="text-[12px] font-semibold">1 · 마스터 테이블 {isEdit ? '(변경 불가)' : '입력 → 스키마 로드'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value.toUpperCase())}
              placeholder="TB_BT_CM_SKILL_GRP_MST"
              className="font-mono"
              disabled={isEdit}
              onPressEnter={handleLoadSchema}
            />
            {!isEdit && (
              <Button type="primary" onClick={handleLoadSchema} loading={isLoadingPreview} disabled={!tableName.trim()}>
                스키마 로드
              </Button>
            )}
          </div>
          {preview && (
            <div className="mt-2 text-[10.5px]">
              <Check className="inline w-3 h-3 text-[var(--color-bt-success)] mr-1" />
              <span className="text-[var(--color-bt-success)] font-semibold">유효 · SELECT 권한 확인됨</span>
              <span className="text-[var(--color-bt-fg-muted)]">
                {' '}
                · 컬럼 {preview.columns.length}개{preview.rowCount != null ? ` · 샘플 ${preview.rowCount} 행` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Step 2 — 메타 입력 */}
        {preview && (
          <div className="rounded border border-[var(--color-bt-primary)] bg-white p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bt-primary)] text-[10px] font-bold text-white">2</span>
              <span className="text-[12px] font-semibold">메타 입력</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">표시명 *</label>
                <Input size="small" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="스킬 그룹 마스터" />
              </div>
              <div>
                <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">카테고리</label>
                <Select size="small" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">설명</label>
              <Input size="small" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="스킬 그룹 코드 / 명칭 / 우선순위" />
            </div>

            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">
                권장 키컬럼 * <span className="text-[9.5px] normal-case tracking-normal text-[var(--color-bt-fg-muted)]">— 룩업 시 기본 채워질 키</span>
              </label>
              <Select
                size="small"
                value={recommendedKey}
                onChange={setRecommendedKey}
                style={{ width: '100%' }}
                options={preview.columns.map((c) => ({ value: c.name, label: `${c.name} (${c.type})${c.isPrimaryKey ? ' · PK' : ''}` }))}
              />
            </div>

            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[var(--color-bt-fg-muted)] mb-0.5">
                권장 값컬럼 * <span className="text-[9.5px] normal-case tracking-normal text-[var(--color-bt-fg-muted)]">— 룩업 시 자동 체크되어 표시될 컬럼</span>
              </label>
              <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/20 p-1.5 space-y-0.5 max-h-[160px] overflow-y-auto">
                {preview.columns
                  .filter((c) => c.name !== recommendedKey)
                  .map((c) => (
                    <label key={c.name} className="flex items-center gap-1.5 text-[10.5px] py-0.5 cursor-pointer hover:bg-[var(--color-bt-bg-muted)]/40 px-1 rounded">
                      <Checkbox checked={selectedValues.has(c.name)} onChange={() => toggleValue(c.name)} />
                      <span className="mono">{c.name}</span>
                      <span className="text-[9.5px] text-[var(--color-bt-fg-muted)]">{c.type}</span>
                    </label>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 풋터 */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-bt-border)]">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" disabled={!canSave} loading={isCreating || isUpdating} onClick={handleSave}>
            {isEdit ? '수정 저장' : '등록'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
