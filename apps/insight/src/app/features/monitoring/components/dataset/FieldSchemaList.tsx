import { Tag } from 'antd';

export interface FieldSchemaColumn {
  columnName: string;
  dataType: string;
  source?: string | null;
  /** 컬럼 코멘트/설명 (있으면 필드명 아래에 표시) */
  comment?: string | null;
}

/** 데이터타입 → 태그 색. */
const DATA_TYPE_COLOR: Record<string, string> = {
  NUMBER: 'blue',
  DATE: 'purple',
  DATETIME: 'purple',
  TIME: 'purple',
  BOOLEAN: 'orange',
  STRING: 'default',
};

/**
 * 필드 스키마 목록 — 행마다 필드명 + 데이터타입 + (있으면) 코멘트.
 * REDIS(키 템플릿 탐색) / QUERY(SQL 검증) 우측 패널 공용.
 */
export default function FieldSchemaList({ columns }: { columns: FieldSchemaColumn[] }) {
  return (
    <ul className="divide-y divide-[var(--color-bt-border)]/60">
      {columns.map((col) => (
        <li key={`${col.source ?? ''}:${col.columnName}`} className="px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[12px]">{col.columnName}</span>
            <Tag color={DATA_TYPE_COLOR[col.dataType] ?? 'default'} className="!mr-0 shrink-0 font-mono text-[10px]">
              {col.dataType}
            </Tag>
          </div>
          {col.comment && (
            <div className="mt-0.5 truncate text-[10.5px] text-gray-400" title={col.comment}>
              {col.comment}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
