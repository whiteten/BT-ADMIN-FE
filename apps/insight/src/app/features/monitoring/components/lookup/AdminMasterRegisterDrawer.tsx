import { useState } from 'react';
import { Button, Checkbox, Drawer, Input, Select } from 'antd';
import { Check } from 'lucide-react';
import { toast } from '@/shared-util';
import { MOCK_SCHEMA_PREVIEW } from '../../mocks/mockLookups';
import type { LookupCatalogItem, SchemaPreview } from '../../types';

interface AdminMasterRegisterDrawerProps {
  open: boolean;
  onClose: () => void;
  onRegistered: (item: LookupCatalogItem) => void;
}

const CATEGORY_OPTIONS = [
  { value: '일반', label: '일반' },
  { value: 'IE', label: 'IE (교환기)' },
  { value: 'IC', label: 'IC (CTI)' },
  { value: 'IR', label: 'IR (IVR)' },
];

export default function AdminMasterRegisterDrawer({ open, onClose, onRegistered }: AdminMasterRegisterDrawerProps) {
  const [tableName, setTableName] = useState('');
  const [preview, setPreview] = useState<SchemaPreview | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLoadSchema = async () => {
    if (!tableName.trim()) return;
    setLoading(true);
    // Mock 동작
    await new Promise((r) => setTimeout(r, 600));
    const mock = MOCK_SCHEMA_PREVIEW[tableName.trim().toUpperCase()];
    if (mock) {
      setPreview(mock);
      // 기본 키컬럼 / 값 컬럼 자동 선택
      const pk = mock.columns.find((c) => c.isPrimaryKey)?.name ?? mock.columns[0].name;
      setRecommendedKey(pk);
      const defaultValues = mock.columns
        .filter((c) => !c.isPrimaryKey)
        .slice(0, 2)
        .map((c) => c.name);
      setSelectedValues(new Set(defaultValues));
      toast.success(`스키마 로드됨 — 컬럼 ${mock.columns.length}개`);
    } else {
      toast.error('테이블을 찾을 수 없습니다. (mock에 등록된 케이스: TB_BT_CM_SKILL_GRP_MST)');
      setPreview(null);
    }
    setLoading(false);
  };

  const toggleValue = (col: string) => {
    const next = new Set(selectedValues);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setSelectedValues(next);
  };

  const canSave = !!preview && !!displayName.trim() && !!recommendedKey && selectedValues.size > 0;

  const handleSave = () => {
    if (!canSave || !preview) return;
    const newItem: LookupCatalogItem = {
      lookupCatalogId: Math.floor(Math.random() * 100000),
      displayName: displayName.trim(),
      tableName: preview.tableName,
      category,
      description: description.trim(),
      recommendedKey,
      recommendedValues: Array.from(selectedValues),
      registeredBy: 'admin',
      usageCount: 0,
    };
    onRegistered(newItem);
    toast.success(`"${newItem.displayName}"이(가) 카탈로그에 등록되었습니다. (※ BE 미구현)`);
    handleClose();
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <span>+ 새 마스터 등록</span>
          <span className="rounded bg-[var(--color-bt-warn-soft)] px-1.5 py-0.5 mono text-[9px] font-bold text-[var(--color-bt-warn)]">ADMIN 전용</span>
        </div>
      }
      placement="right"
      width={520}
      open={open}
      onClose={handleClose}
      destroyOnClose
    >
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${preview ? 'bg-[var(--color-bt-success)] text-white' : 'bg-[var(--color-bt-primary)] text-white'}`}
            >
              {preview ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span className="text-[12px] font-semibold">1 · 테이블명 입력 → 스키마 로드</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value.toUpperCase())}
              placeholder="TB_BT_CM_SKILL_GRP_MST"
              className="font-mono"
              onPressEnter={handleLoadSchema}
            />
            <Button type="primary" onClick={handleLoadSchema} loading={loading} disabled={!tableName.trim()}>
              스키마 로드
            </Button>
          </div>
          {preview && (
            <div className="mt-2 text-[10.5px]">
              <Check className="inline w-3 h-3 text-[var(--color-bt-success)] mr-1" />
              <span className="text-[var(--color-bt-success)] font-semibold">유효 · SELECT 권한 확인됨</span>
              <span className="text-[var(--color-bt-fg-muted)]">
                {' '}
                · 컬럼 {preview.columns.length}개 추출 · 샘플 {preview.rowCount} 행
              </span>
            </div>
          )}
        </div>

        {/* Step 2 — 메타 입력 */}
        {preview && (
          <div className="rounded border border-[var(--color-bt-primary)] bg-white p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bt-primary)] text-[10px] font-bold text-white">2</span>
              <span className="text-[12px] font-semibold">메타 입력 (카탈로그 항목)</span>
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
                권장 값컬럼 <span className="text-[9.5px] normal-case tracking-normal text-[var(--color-bt-fg-muted)]">— 룩업 시 자동 체크되어 표시될 컬럼</span>
              </label>
              <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/20 p-1.5 space-y-0.5 max-h-[120px] overflow-y-auto">
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

        {/* Step 3 — 카탈로그 추가 확인 */}
        {preview && (
          <div className="rounded border border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bt-bg-muted)] text-[10px] font-bold text-[var(--color-bt-fg-muted)]">3</span>
              <span className="text-[12px] font-semibold">카탈로그 추가</span>
            </div>
            <p className="text-[10px] text-[var(--color-bt-fg-muted)] leading-snug">
              저장 시 <span className="mono">TB_BT_IS_LOOKUP_CATALOG</span>에 등록 → 다른 데이터셋도 즉시 이 마스터를 카탈로그에서 선택 가능
            </p>
          </div>
        )}

        {/* 풋터 */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-bt-border)]">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" danger disabled={!canSave} onClick={handleSave}>
            카탈로그에 추가 + 선택
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
