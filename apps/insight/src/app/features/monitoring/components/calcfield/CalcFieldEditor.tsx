import { useState } from 'react';
import { Button as AntButton, Form, Input, Select } from 'antd';
import { RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { COLUMN_FORMAT_OPTIONS } from '../../constants/monitoringConstants';
import type { CalcField, ColumnFormat, DatasetField, FieldDataType } from '../../types';
import { Button } from '@/components/ui/button';

// ─── 토큰 시스템 (양소미 작업자 통계 측 CalcFieldEditor 패턴 차용) ────────────
// 모니터링 차이점:
//  - M3: 집계 함수(SUM/AVG/COUNT/MIN/MAX) 금지 — AGG_FUNCS 제거
//  - 메타 폼에 DIM/MSR 구분 + data type 추가
//  - 모델: 통계 CalcFieldCreateDatas → 모니터링 CalcField 직접 사용

type TokenKind = 'field_msr' | 'field_dim' | 'field_calc' | 'func' | 'op' | 'num' | 'paren' | 'slot';

interface FormulaToken {
  id: string;
  kind: TokenKind;
  value: string;
  slotName?: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const mkSlot = (name: string): FormulaToken => ({ id: uid(), kind: 'slot', value: name, slotName: name });
const mkOp = (value: string): FormulaToken => ({ id: uid(), kind: 'op', value });
const mkFunc = (value: string): FormulaToken => ({ id: uid(), kind: 'func', value });
const mkParen = (value: string): FormulaToken => ({ id: uid(), kind: 'paren', value });
const mkNum = (value: string): FormulaToken => ({ id: uid(), kind: 'num', value });
const mkField = (name: string, role: 'MSR' | 'DIM' | 'CALC'): FormulaToken => ({
  id: uid(),
  kind: role === 'MSR' ? 'field_msr' : role === 'CALC' ? 'field_calc' : 'field_dim',
  value: name,
});

// ─── 템플릿 (M3 — 집계 함수 사용하는 점유율/평균은 제외, row-level 식만) ─────

interface Template {
  name: string;
  formula: string;
  badge?: string;
  build: () => FormulaToken[];
}

const QUICK_TEMPLATES: Template[] = [
  { name: '비율', formula: 'A ÷ B × 100', build: () => [mkSlot('A'), mkOp('÷'), mkSlot('B'), mkOp('×'), mkNum('100')] },
  { name: '차이', formula: 'A − B', build: () => [mkSlot('A'), mkOp('−'), mkSlot('B')] },
  {
    name: '변화율',
    formula: '(A − B) ÷ B × 100',
    build: () => [mkParen('('), mkSlot('A'), mkOp('−'), mkSlot('B'), mkParen(')'), mkOp('÷'), mkSlot('B'), mkOp('×'), mkNum('100')],
  },
];

// M3: 집계 함수 제거 — SUM/AVG/COUNT/MIN/MAX는 불가
const MATH_FUNCS = ['ROUND', 'ABS', 'FLOOR', 'CEIL'];
const COND_FUNCS = ['IF', 'CASE WHEN'];
const OPERATORS = ['+', '−', '×', '÷'];

const CLASSIFICATION_OPTIONS = [
  { value: 'DIM' as const, label: 'DIM (디멘션)' },
  { value: 'MSR' as const, label: 'MSR (측정값)' },
];

const DATA_TYPE_OPTIONS: Array<{ value: FieldDataType; label: string }> = [
  { value: 'NUMBER', label: 'NUMBER (숫자)' },
  { value: 'STRING', label: 'STRING (문자)' },
  { value: 'DATE', label: 'DATE (날짜)' },
  { value: 'DATETIME', label: 'DATETIME (날짜+시각)' },
  { value: 'TIME', label: 'TIME (시각)' },
  { value: 'BOOLEAN', label: 'BOOLEAN (참/거짓)' },
];

// ─── 직렬화 / 역직렬화 ───────────────────────────────────────────────────────

function tokensToFormula(tokens: FormulaToken[]): string {
  return tokens
    .map((t) => {
      if (t.kind === 'field_msr' || t.kind === 'field_dim' || t.kind === 'field_calc') return `{${t.value}}`;
      if (t.kind === 'func') return t.value;
      if (t.kind === 'op') {
        const m: Record<string, string> = { '÷': '/', '×': '*', '−': '-' };
        return m[t.value] ?? t.value;
      }
      if (t.kind === 'num') return t.value;
      if (t.kind === 'paren') return t.value;
      if (t.kind === 'slot') return `[${t.slotName ?? t.value}]`;
      return '';
    })
    .join(' ');
}

function fillNextSlot(tokens: FormulaToken[], ft: FormulaToken): FormulaToken[] {
  const first = tokens.find((t) => t.kind === 'slot');
  if (!first) return [...tokens, { ...ft, id: uid() }];
  const name = first.slotName;
  return tokens.map((t) => (t.kind === 'slot' && t.slotName === name ? { ...ft, id: t.id } : t));
}

function parseExpression(expr: string, msrNames: Set<string>, dimNames: Set<string>, calcNames: Set<string>): FormulaToken[] {
  if (!expr) return [];
  const funcNames = new Set([...MATH_FUNCS, ...COND_FUNCS, 'CASE', 'WHEN']);
  const regex = /\{([^}]+)\}|([A-Z][A-Z0-9_]*)|([\d]+\.?[\d]*)|([+\-*/()])/g;
  const result: FormulaToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(expr)) !== null) {
    const [, fieldName, word, number, symbol] = m;
    if (fieldName) {
      const role = calcNames.has(fieldName) ? 'CALC' : msrNames.has(fieldName) ? 'MSR' : dimNames.has(fieldName) ? 'DIM' : 'MSR';
      result.push(mkField(fieldName, role));
    } else if (word && funcNames.has(word)) {
      result.push(mkFunc(word));
    } else if (number) {
      result.push(mkNum(number));
    } else if (symbol) {
      if (symbol === '(' || symbol === ')') {
        result.push(mkParen(symbol));
      } else {
        const display = symbol === '*' ? '×' : symbol === '/' ? '÷' : symbol === '-' ? '−' : symbol;
        result.push(mkOp(display));
      }
    }
  }
  return result;
}

// ─── 토큰 chip ───────────────────────────────────────────────────────────────

function TokenChip({ token, onDelete }: { token: FormulaToken; onDelete: () => void }) {
  const del = (
    <button className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 text-xs" onClick={onDelete}>
      ×
    </button>
  );

  if (token.kind === 'slot')
    return (
      <span className="group inline-flex items-center gap-1 rounded border-2 border-dashed border-primary/60 bg-primary/5 px-2 py-0.5 font-mono text-sm font-semibold text-primary">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">슬롯</span>
        {token.value}
        {del}
      </span>
    );
  if (token.kind === 'field_msr')
    return (
      <span className="group inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold text-primary hover:border-primary">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">MSR</span>
        {token.value}
        {del}
      </span>
    );
  if (token.kind === 'field_dim')
    return (
      <span className="group inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 font-mono text-sm font-semibold text-foreground hover:border-gray-400">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DIM</span>
        {token.value}
        {del}
      </span>
    );
  if (token.kind === 'field_calc')
    return (
      <span className="group inline-flex items-center gap-1 rounded border border-green-400/50 bg-green-50 px-2 py-0.5 font-mono text-sm font-semibold text-green-700 hover:border-green-500">
        <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">ƒ</span>
        {token.value}
        {del}
      </span>
    );
  if (token.kind === 'func')
    return (
      <span className="group inline-flex items-center rounded bg-green-50 px-2 py-0.5 font-mono text-sm font-bold text-green-700">
        {token.value}
        {del}
      </span>
    );
  if (token.kind === 'num')
    return (
      <span className="group inline-flex items-center gap-1 rounded border border-amber-300/60 bg-amber-50 px-2 py-0.5 font-mono text-sm font-semibold text-amber-700">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">NUM</span>
        {token.value}
        {del}
      </span>
    );
  // op, paren
  return (
    <span className="group inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-base font-bold text-muted-foreground hover:bg-muted/80">
      {token.value}
      {del}
    </span>
  );
}

// ─── CalcFieldEditor ─────────────────────────────────────────────────────────

interface CalcFieldEditorProps {
  /** 데이터셋의 기본 필드 (참조 가능한 필드 팔레트) */
  baseFields: DatasetField[];
  /** 기존 계산필드 (참조 가능 + 중복 코드 체크) */
  existingCalcFields: CalcField[];
  /** 편집 모드일 때 기존 값 */
  initialValue?: CalcField;
  onSave: (calc: CalcField) => void;
  onCancel: () => void;
}

export default function CalcFieldEditor({ baseFields, existingCalcFields, initialValue, onSave, onCancel }: CalcFieldEditorProps) {
  const visibleFields = baseFields.filter((f) => f.isVisible !== false);
  const msrNames = new Set(visibleFields.filter((f) => f.classification === 'MSR').map((f) => f.columnName));
  const dimNames = new Set(visibleFields.filter((f) => f.classification === 'DIM').map((f) => f.columnName));
  const calcNames = new Set(existingCalcFields.filter((c) => c.fieldCode !== initialValue?.fieldCode).map((c) => c.fieldCode));

  const [meta, setMeta] = useState<CalcField>({
    fieldCode: initialValue?.fieldCode ?? '',
    displayName: initialValue?.displayName ?? '',
    rowExpression: initialValue?.rowExpression ?? '',
    columnFormat: initialValue?.columnFormat ?? 'Number',
    classification: initialValue?.classification ?? 'MSR',
    dataType: initialValue?.dataType ?? 'NUMBER',
  });

  const [tokens, setTokens] = useState<FormulaToken[]>(() => (initialValue?.rowExpression ? parseExpression(initialValue.rowExpression, msrNames, dimNames, calcNames) : []));
  const [history, setHistory] = useState<FormulaToken[][]>([]);
  const [future, setFuture] = useState<FormulaToken[][]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [pendingNum, setPendingNum] = useState<string | null>(null);

  const commit = (next: FormulaToken[]) => {
    setHistory((h) => [...h, tokens]);
    setFuture([]);
    setTokens(next);
  };

  const undo = () => {
    if (!history.length) return;
    setFuture((f) => [tokens, ...f]);
    setTokens(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (!future.length) return;
    setHistory((h) => [...h, tokens]);
    setTokens(future[0]);
    setFuture((f) => f.slice(1));
  };

  const addTemplate = (t: Template) => commit(t.build());
  const addFunc = (name: string) => commit([...tokens, mkFunc(name), mkParen('('), mkSlot('인자'), mkParen(')')]);
  const addOp = (op: string) => commit([...tokens, mkOp(op)]);
  const addParens = () => commit([...tokens, mkParen('('), mkSlot('인자'), mkParen(')')]);
  const confirmNum = (val: string) => {
    if (val.trim() && !isNaN(Number(val))) commit([...tokens, mkNum(val.trim())]);
    setPendingNum(null);
  };
  const addField = (name: string, role: 'MSR' | 'DIM' | 'CALC') => commit(fillNextSlot(tokens, mkField(name, role)));
  const deleteToken = (id: string) => commit(tokens.filter((t) => t.id !== id));

  const msrFields = visibleFields.filter((f) => f.classification === 'MSR' && (!fieldSearch || f.columnName.toLowerCase().includes(fieldSearch.toLowerCase())));
  const dimFields = visibleFields.filter((f) => f.classification === 'DIM' && (!fieldSearch || f.columnName.toLowerCase().includes(fieldSearch.toLowerCase())));
  const calcFiltered = existingCalcFields.filter((c) => c.fieldCode !== initialValue?.fieldCode && (!fieldSearch || c.fieldCode.toLowerCase().includes(fieldSearch.toLowerCase())));

  const hasSlots = tokens.some((t) => t.kind === 'slot');
  const rowExpression = tokensToFormula(tokens);
  const fieldCodeValid = /^[A-Z_][A-Z0-9_]*$/.test(meta.fieldCode);
  const fieldCodeDup = !initialValue?.fieldCode && existingCalcFields.some((c) => c.fieldCode === meta.fieldCode);
  const isValid = !hasSlots && tokens.length > 0 && fieldCodeValid && !fieldCodeDup && meta.displayName.length > 0;

  const handleSave = () => onSave({ ...meta, rowExpression });

  return (
    <div className="flex min-h-[520px] overflow-hidden rounded-lg border border-border bg-card">
      {/* ── Left palette ─────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-border bg-muted/30 p-3">
        {/* 빠른 템플릿 */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">빠른 템플릿</p>
          <div className="space-y-1">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.name}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
                onClick={() => addTemplate(t)}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {t.name}
                  {t.badge && <span className="rounded bg-amber-100 px-1 py-0 text-[10px] font-semibold uppercase text-amber-600">{t.badge}</span>}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{t.formula}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 함수 — 모니터링은 집계 함수 금지(M3) — 수학/조건만 노출 */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">함수</p>
          <p className="mb-1 text-xs text-muted-foreground">수학</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {MATH_FUNCS.map((f) => (
              <button
                key={f}
                className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-semibold text-green-700 transition-all hover:border-green-500 hover:bg-green-50 active:scale-95"
                onClick={() => addFunc(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="mb-1 text-xs text-muted-foreground">조건</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {COND_FUNCS.map((f) => (
              <button
                key={f}
                className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-semibold text-green-700 transition-all hover:border-green-500 hover:bg-green-50 active:scale-95"
                onClick={() => addFunc(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="mb-1 text-xs text-muted-foreground">연산자 · 상수</p>
          <div className="flex flex-wrap gap-1">
            {OPERATORS.map((op) => (
              <button
                key={op}
                className="rounded border border-border bg-card px-2 py-0.5 font-mono text-sm font-bold text-muted-foreground transition-all hover:border-primary hover:text-foreground active:scale-95"
                onClick={() => addOp(op)}
              >
                {op}
              </button>
            ))}
            <button
              className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-sm font-bold text-muted-foreground transition-all hover:border-primary active:scale-95"
              onClick={addParens}
            >
              ( )
            </button>
            <button
              className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-semibold text-amber-600 transition-all hover:border-amber-400 hover:bg-amber-50 active:scale-95"
              onClick={() => setPendingNum('')}
            >
              123
            </button>
          </div>
        </div>

        {/* 필드 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">필드</p>
          <Input size="small" placeholder="필드 검색…" value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} className="mb-2" />
          {msrFields.length > 0 && (
            <>
              <p className="mb-1 text-xs text-muted-foreground">메저</p>
              <div className="mb-2 space-y-0.5">
                {msrFields.map((f) => (
                  <button
                    key={f.columnName}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                    onClick={() => addField(f.columnName, 'MSR')}
                  >
                    <span className="rounded bg-primary px-1 font-mono text-[10px] font-bold text-white">MSR</span>
                    <span className="font-mono font-medium text-foreground">{f.columnName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {dimFields.length > 0 && (
            <>
              <p className="mb-1 text-xs text-muted-foreground">디멘션</p>
              <div className="mb-2 space-y-0.5">
                {dimFields.map((f) => (
                  <button
                    key={f.columnName}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm transition-all hover:border-gray-400 active:scale-[0.98]"
                    onClick={() => addField(f.columnName, 'DIM')}
                  >
                    <span className="rounded bg-muted px-1 font-mono text-[10px] font-bold text-muted-foreground">DIM</span>
                    <span className="font-mono text-muted-foreground">{f.columnName}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {calcFiltered.length > 0 && (
            <>
              <p className="mb-1 text-xs text-muted-foreground">계산필드</p>
              <div className="space-y-0.5">
                {calcFiltered.map((c) => (
                  <button
                    key={c.fieldCode}
                    className="flex w-full items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-sm transition-all hover:border-green-400 active:scale-[0.98]"
                    onClick={() => addField(c.fieldCode, 'CALC')}
                  >
                    <span className="font-mono font-bold text-green-600">ƒ</span>
                    <span className="font-mono font-medium text-green-700">{c.fieldCode}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {msrFields.length === 0 && dimFields.length === 0 && <p className="text-sm text-muted-foreground">표시 필드가 없습니다.</p>}
        </div>
      </aside>

      {/* ── Right builder ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        {/* 메타 */}
        <Form layout="vertical" className="mb-4">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              label="필드 코드"
              required
              validateStatus={meta.fieldCode && !fieldCodeValid ? 'error' : fieldCodeDup ? 'error' : ''}
              help={meta.fieldCode && !fieldCodeValid ? '영문 대문자/숫자/_ 만 (대문자 시작)' : fieldCodeDup ? '이미 존재하는 코드입니다' : ''}
            >
              <Input
                value={meta.fieldCode}
                onChange={(e) => setMeta((m) => ({ ...m, fieldCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                placeholder="ANSWER_RATE"
                className="font-mono"
                disabled={!!initialValue?.fieldCode}
              />
            </Form.Item>
            <Form.Item label="표시명" required>
              <Input value={meta.displayName} onChange={(e) => setMeta((m) => ({ ...m, displayName: e.target.value }))} placeholder="응답률(%)" />
            </Form.Item>
            <Form.Item label="구분">
              <Select value={meta.classification} onChange={(v) => setMeta((m) => ({ ...m, classification: v }))} options={CLASSIFICATION_OPTIONS} className="w-full" />
            </Form.Item>
            <Form.Item label="데이터 타입">
              <Select value={meta.dataType} onChange={(v) => setMeta((m) => ({ ...m, dataType: v }))} options={DATA_TYPE_OPTIONS} className="w-full" />
            </Form.Item>
            <Form.Item label="컬럼 서식">
              <Select value={meta.columnFormat} onChange={(v) => setMeta((m) => ({ ...m, columnFormat: v as ColumnFormat }))} options={COLUMN_FORMAT_OPTIONS} className="w-full" />
            </Form.Item>
          </div>
        </Form>

        {/* 수식 빌더 */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Row-level 수식 <span className="text-red-500">*</span>
            </span>
            <div className="flex items-center gap-0.5">
              <AntButton size="small" type="text" icon={<RotateCcw size={13} />} disabled={!history.length} onClick={undo} title="실행취소" />
              <AntButton size="small" type="text" icon={<RotateCw size={13} />} disabled={!future.length} onClick={redo} title="다시실행" />
              <AntButton size="small" type="text" danger icon={<Trash2 size={13} />} disabled={!tokens.length} onClick={() => commit([])} title="모두지우기" />
            </div>
          </div>

          <div className="min-h-[88px] rounded-lg border-2 border-dashed border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {tokens.map((token) => (
                <TokenChip key={token.id} token={token} onDelete={() => deleteToken(token.id)} />
              ))}
              {pendingNum !== null && (
                <input
                  autoFocus
                  type="number"
                  className="w-16 rounded border border-amber-400 bg-amber-50 px-2 py-1 font-mono text-sm text-amber-700 focus:outline-none"
                  value={pendingNum}
                  onChange={(e) => setPendingNum(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmNum(pendingNum);
                    if (e.key === 'Escape') setPendingNum(null);
                  }}
                  onBlur={() => confirmNum(pendingNum)}
                  placeholder="0"
                />
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            좌측 팔레트에서 함수 · 필드 · 연산자 · 숫자를 클릭해 추가. 토큰 hover 후 ×로 삭제.
            {hasSlots && <span className="ml-1.5 font-medium text-amber-500">⚠ 빈 슬롯이 있습니다 — 필드를 클릭해 채우세요.</span>}
          </p>
        </div>

        {/* 미리보기 */}
        <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">미리보기</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">row-level (M3)</span>
          </div>
          {tokens.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="mr-1 font-mono text-xs font-bold uppercase tracking-wider text-green-600">ƒ(x)</span>
                {tokens.map((t, i) => (
                  <span
                    key={i}
                    className={
                      t.kind === 'field_msr' || t.kind === 'field_calc'
                        ? 'font-mono text-sm font-semibold text-primary'
                        : t.kind === 'field_dim'
                          ? 'font-mono text-sm text-foreground'
                          : t.kind === 'func'
                            ? 'font-mono text-sm font-bold text-green-700'
                            : t.kind === 'num'
                              ? 'font-mono text-sm font-semibold text-amber-600'
                              : t.kind === 'slot'
                                ? 'rounded bg-primary/10 px-1 font-mono text-sm text-primary'
                                : 'font-mono text-sm text-muted-foreground'
                    }
                  >
                    {t.value}&nbsp;
                  </span>
                ))}
              </div>
              <div className="mt-2 border-t border-border pt-2 font-mono text-xs text-muted-foreground">{rowExpression}</div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">팔레트에서 요소를 추가하면 수식이 여기에 표시됩니다</div>
          )}
        </div>

        {/* Footer — 미리보기 바로 아래(빌더 자연 흐름)에 배치. 큰 화면에서 mt-auto로 빌더 하단에 떨어지면 사용자가 한참 스크롤해야 했음 */}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
          <div>
            {isValid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">✓ VALID</span>
            ) : hasSlots ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">INCOMPLETE — 슬롯을 채우세요</span>
            ) : tokens.length === 0 ? (
              <span className="text-sm text-muted-foreground">수식을 입력하세요</span>
            ) : (
              <span className="text-sm text-red-500">필수 항목을 모두 입력하세요</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button disabled={!isValid} onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
