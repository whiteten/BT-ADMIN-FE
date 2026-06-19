/**
 * ag-Grid 코드값 컬럼 헬퍼.
 *
 * <p>코드값(예: 1/2, '0'/'1')을 화면에 라벨로 보여주는 컬럼에서,
 * 셀(valueFormatter)뿐 아니라 <b>Set Filter 체크박스(filterValueGetter)도 라벨로</b> 표시되게 한다.
 * ag-Grid Set Filter 는 기본적으로 셀의 원본 값(코드)으로 항목을 만들기 때문에,
 * filterValueGetter 를 주지 않으면 필터에 코드값이 그대로 노출된다.</p>
 *
 * <p>셀·필터를 단일 LABELS 맵에서 한 쌍으로 생성하므로 둘이 어긋나거나 한쪽을 빠뜨릴 수 없다.</p>
 *
 * @example
 *   { headerName: '종류', field: 'adaptorType', width: 100, ...codeCol('adaptorType', ADAPTOR_TYPE_LABELS) }
 *   // Tag 등 cellRenderer 를 유지하면서 필터만 라벨로:
 *   { headerName: '사용유무', field: 'useYn', cellRenderer: ..., ...codeFilter('useYn', { 1: '사용', 0: '미사용' }) }
 */
import type { ColDef, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community';

type CodeKey = string | number;
type LabelMap = Record<CodeKey, string>;

/** 코드값 → 라벨 변환(없으면 원본 코드 유지). */
function toLabel(labels: LabelMap, code: unknown): string {
  if (code === null || code === undefined) return '';
  const v = labels[code as CodeKey];
  return v ?? String(code);
}

/**
 * 셀 + 필터 모두 라벨로 표시하는 코드값 컬럼 조각.
 * 컬럼의 `field` 는 그대로 두고, 이 결과를 스프레드로 합친다.
 */
export function codeCol<T = unknown>(field: keyof T & string, labels: LabelMap): Partial<ColDef<T>> {
  return {
    valueFormatter: (p: ValueFormatterParams<T>) => toLabel(labels, p.value),
    filterValueGetter: (p: ValueGetterParams<T>) => toLabel(labels, (p.data as Record<string, unknown> | undefined)?.[field]),
  };
}

/**
 * cellRenderer(예: Tag)를 유지하면서 Set Filter 만 라벨로 표시.
 */
export function codeFilter<T = unknown>(field: keyof T & string, labels: LabelMap): Partial<ColDef<T>> {
  return {
    filterValueGetter: (p: ValueGetterParams<T>) => toLabel(labels, (p.data as Record<string, unknown> | undefined)?.[field]),
  };
}
