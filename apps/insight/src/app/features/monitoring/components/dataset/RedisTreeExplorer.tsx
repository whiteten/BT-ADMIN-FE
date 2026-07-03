import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Input, Tag, Tooltip } from 'antd';
import { Database, RefreshCw, Search } from 'lucide-react';
import FieldSchemaList from './FieldSchemaList';
import type { RedisKeySchema } from '../../api/redisTreeApi';
import { useGetRedisKeySchema, useGetRedisKeyTemplates } from '../../hooks/useRedisTreeQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface RedisTreeExplorerProps {
  /** 현재 선택된 Redis 키 템플릿(패턴). 템플릿을 고르면 이 값으로 채워진다. */
  value: string;
  onChange: (keyPattern: string) => void;
  /** 선택한 템플릿의 필드 스키마가 로드되면 호출 — 부모가 데이터셋 필드/값모드를 채우는 데 사용. */
  onSchemaLoaded?: (schema: RedisKeySchema) => void;
  /** 선택한 키에 `*`(변수)가 있을 때 필드 스키마 오른쪽에 3번째 열로 붙일 '키 변수 할당' UI. 없으면 열 자체가 미표시. */
  keyVarSlot?: ReactNode;
}

/** 필드 source(JSON/HASH_FIELD/KEY_SEGMENT) → 표시 라벨·색. */
const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
  JSON: { label: 'JSON', color: 'blue' },
  HASH_FIELD: { label: '필드', color: 'green' },
  KEY_SEGMENT: { label: '필터', color: 'gold' },
};

const VALUE_MODE_DESC: Record<string, string> = {
  JSON_PER_FIELD: '행 = 키(field), 열 = JSON 필드',
  HASH_AS_ROW: '행 = 키, 열 = 필드명(field)',
};

/** 패턴을 ':' 단위로 렌더 — 가변(*) 세그먼트는 {변수}로 강조. */
function renderPattern(pattern: string) {
  return pattern.split(':').map((seg, i) => (
    <span key={i}>
      {i > 0 && <span className="text-gray-300">:</span>}
      {seg === '*' ? <span className="font-semibold text-[var(--color-bt-primary)]">{'{변수}'}</span> : seg}
    </span>
  ));
}

/**
 * Redis 키 템플릿 탐색기 — 데이터셋(REDIS 소스) 작성 보조.
 * <p>
 * 전광판은 변수(mediaType 등)를 디자인 시점에 키로 확정하지만, 데이터셋은 변수를 런타임 검색조건으로
 * 다룬다. 그래서 트리가 아니라 <b>플랫 키 템플릿 리스트</b>로 보여준다 — 가변 세그먼트는 '*'({변수})로
 * 묶이고, 템플릿을 고르면 그 패턴이 데이터셋 키가 된다. 우측엔 필드 스키마 + '*' 자리(필터 차원)만 표시한다.
 */
export default function RedisTreeExplorer({ value, onChange, onSchemaLoaded, keyVarSlot }: RedisTreeExplorerProps) {
  const [search, setSearch] = useState('');
  // 새로고침 카운터 — 화면 로드 시 0(1회 조회), 버튼 클릭마다 증가해 강제 재스캔. 탭 이동에는 변하지 않아 재조회 없음.
  const [refreshTick, setRefreshTick] = useState(0);

  const { data: templates = [], isLoading: listLoading, isError: listError } = useGetRedisKeyTemplates({ params: { tick: refreshTick } });
  const { data: schema, isLoading: schemaLoading } = useGetRedisKeySchema({ params: { path: value } });

  // 스키마가 로드되면 부모로 전달(필드 자동 채움). 콜백 식별자 변화로 인한 루프 방지 위해 ref 사용.
  const onSchemaLoadedRef = useRef(onSchemaLoaded);
  onSchemaLoadedRef.current = onSchemaLoaded;
  useEffect(() => {
    if (value && schema) onSchemaLoadedRef.current?.(schema);
  }, [value, schema]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => (query ? templates.filter((t) => t.pattern.toLowerCase().includes(query)) : templates), [templates, query]);

  const handleRefresh = () => setRefreshTick((p) => p + 1);
  const columns = schema?.columns ?? [];
  // 컬럼 source(JSON/HASH_FIELD)는 전부 동일하므로 상단에 한 번만 표시한다.
  const sourceKey = columns[0]?.source;
  const sourceMeta = sourceKey ? SOURCE_LABEL[sourceKey] : undefined;

  return (
    <div className="flex h-full overflow-hidden rounded border border-[var(--color-bt-border)]">
      {/* ── 1열: 플랫 키 템플릿 리스트 ── */}
      <div className="flex min-w-[260px] flex-1 flex-col border-r border-[var(--color-bt-border)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-bt-border)] px-3 py-2">
          <Input
            size="small"
            allowClear
            prefix={<Search className="size-3.5 text-gray-400" />}
            placeholder="키 템플릿 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Tooltip title="키 목록 새로고침">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
            >
              <RefreshCw className={`size-3.5 ${listLoading ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
        </div>
        <div className="min-h-0 flex-1 overflow-auto py-1">
          {listLoading ? (
            <FallbackSpinner />
          ) : listError || templates.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
              <Database className="size-6 text-gray-300" />
              <p className="text-[11.5px] text-gray-500">Redis 키를 불러올 수 없습니다.</p>
              <p className="text-[10.5px] text-gray-400">백엔드 연동 예정 — 키 패턴은 직접 입력할 수 있습니다.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-gray-400">검색 결과 없음</p>
          ) : (
            <ul>
              {filtered.map((t) => {
                const selected = t.pattern === value;
                return (
                  <li key={t.pattern}>
                    <button
                      type="button"
                      onClick={() => onChange(t.pattern)}
                      className={`flex w-full items-center gap-2 border-l-[3px] px-3 py-1.5 text-left transition ${
                        selected ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]' : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <Database className={`size-3.5 shrink-0 ${selected ? 'text-[var(--color-bt-primary)]' : 'text-gray-400'}`} />
                      <span className="flex-1 truncate font-mono text-[12px]" title={t.pattern}>
                        {renderPattern(t.pattern)}
                      </span>
                      {t.variableCount > 0 && (
                        <Tag color="gold" className="!mr-0 shrink-0">
                          필터 {t.variableCount}
                        </Tag>
                      )}
                      <span className="inline-flex h-5 items-center text-[11px] text-gray-400">{t.keyCount.toLocaleString()}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── 2열: 선택 템플릿의 필드 스키마 (실제 값은 표시하지 않음) ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-bt-border)] bg-[var(--color-bt-bg-muted)]/40 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-gray-500">필드 스키마</div>
            <div className="mt-0.5 truncate font-mono text-[11px]">{value ? renderPattern(value) : <span className="text-gray-400">키 템플릿을 선택하세요</span>}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {sourceMeta && (
              <Tag color={sourceMeta.color} className="!mr-0">
                {sourceMeta.label}
              </Tag>
            )}
            {schema?.valueMode && (
              <Tooltip title={VALUE_MODE_DESC[schema.valueMode]}>
                <Tag color={schema.valueMode === 'JSON_PER_FIELD' ? 'blue' : 'green'} className="!mr-0">
                  {schema.valueMode}
                </Tag>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {!value ? (
            <p className="p-3 text-[11.5px] text-gray-400">좌측에서 키 템플릿을 선택하면 필드 목록이 표시됩니다.</p>
          ) : schemaLoading ? (
            <FallbackSpinner />
          ) : columns.length === 0 ? (
            <p className="p-3 text-[11.5px] text-gray-500">이 키에서 필드를 찾지 못했습니다 (빈 데이터이거나 매칭 키 없음).</p>
          ) : (
            <FieldSchemaList columns={columns} />
          )}
        </div>
        {value && columns.length > 0 && (
          <div className="border-t border-[var(--color-bt-border)] px-3 py-1.5 text-[10.5px] text-gray-400">
            {'{변수}'} 자리는 검색조건(필터)으로, 위 필드는 데이터셋 필드 후보로 자동 추가됩니다.
          </div>
        )}
      </div>

      {/* ── 3열: 키 변수 할당 — 선택 키에 `*`(변수)가 있을 때만 노출 (부모가 slot으로 주입) ── */}
      {keyVarSlot ? <div className="flex w-[340px] shrink-0 flex-col border-l border-[var(--color-bt-border)]">{keyVarSlot}</div> : null}
    </div>
  );
}
