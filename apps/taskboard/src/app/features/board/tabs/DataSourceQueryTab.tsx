import { type DragEvent, type UIEvent, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, Copy, Pencil, Play, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { taskboardApi } from '../api/taskboardApi';
import { useCreateDbQueryDef, useDeleteDbQueryDef, useGetDbQueryDefList, useGetRedisHashKeys, useUpdateDbQueryDef } from '../hooks/useTaskboardQueries';
import type { DbQueryDef, DbQueryParam, DbQueryRedisKeyEntry } from '../types/taskboard.types';
import { type RedisKeyNode, filterRedisTree, groupRedisKeys } from '../utils/redisKeyPattern';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const REQUIRED_OPTION_COLUMNS = ['NAME', 'VALUE'];

const PARAM_TYPE_OPTIONS: { value: DbQueryParam['type']; label: string }[] = [
  { value: 'STRING', label: '문자' },
  { value: 'NUMBER', label: '숫자' },
  { value: 'DATE', label: '날짜' },
];

let paramSeq = 0;
function makeEmptyParam(): DbQueryParam & { id: number } {
  paramSeq += 1;
  return { id: paramSeq, name: '', type: 'STRING', value: '' };
}

/** 저장 시 이 쿼리를 뷰그룹 선택용(연동 Redis 키 등록)으로 쓸지, 플레이스홀더(다른 데이터소스가 참조하는
 *  값 목록)로 쓸지 — 저장 폼과 저장된 목록 둘 다 이 둘을 구분해서 보여준다. */
type SaveMode = 'dataSource' | 'placeholder';

const INITIAL_VISIBLE_ROWS = 30;
const VISIBLE_ROWS_STEP = 30;
const SCROLL_BOTTOM_THRESHOLD_PX = 80;

/** 드래그 중인 Redis 키를 dataTransfer에 실어 보낼 때 쓰는 MIME 타입 — 이 탭 안에서만 쓰는 값이라 커스텀 타입 사용 */
const REDIS_KEY_DND_TYPE = 'application/x-taskboard-redis-key';
/** 필드키 조합식에 넣을 플레이스홀더/{value} 토큰을 드래그할 때 쓰는 MIME 타입 */
const TEMPLATE_TOKEN_DND_TYPE = 'application/x-taskboard-template-token';
/** 필드키 조합식에서 "이 쿼리 자신의 VALUE"를 가리키는 예약 토큰 이름 */
const SELF_VALUE_TOKEN_NAME = 'value';

// ─── Redis 키 트리 피커 — task-create "Redis 탐색기"와 같은 트리 구조(groupRedisKeys)를 재사용.
// task-create는 dnd-kit 기반 캔버스 DnD 컨텍스트를 쓰지만 이 탭은 그게 없으므로, 대신 브라우저
// 표준 HTML5 Drag and Drop API(draggable/onDragStart+onDrop)로 실제 드래그&드롭을 구현한다.
// 클릭으로도 채울 수 있게 남겨둬 마우스 드래그가 번거로운 경우의 대안도 유지. ──
function RedisKeyTreePicker({ onPick }: { onPick: (key: string) => void }) {
  const [search, setSearch] = useState('');
  const { data: hashKeys = [], isLoading } = useGetRedisHashKeys();
  const tree = hashKeys.length > 0 ? groupRedisKeys(hashKeys, '', 0) : [];
  const filteredTree = filterRedisTree(tree, search, null);

  return (
    <div className="border border-slate-200 rounded-md bg-white">
      <div className="p-1.5 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="키 검색..."
            className="w-full pl-6 pr-2 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:border-sky-300"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {isLoading ? (
          <p className="text-[10px] text-slate-400 text-center py-3">불러오는 중...</p>
        ) : filteredTree.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-3">{search.trim() ? '검색 결과 없음' : 'Hash 타입 키가 없습니다'}</p>
        ) : (
          filteredTree.map((node) => <RedisKeyPickerNode key={node.label} node={node} depth={0} onPick={onPick} forceExpand={!!search.trim()} />)
        )}
      </div>
    </div>
  );
}

function RedisKeyPickerNode({ node, depth, onPick, forceExpand }: { node: RedisKeyNode; depth: number; onPick: (key: string) => void; forceExpand?: boolean }) {
  const [open, setOpen] = useState(false);
  const isLeaf = node.children.length === 0;

  if (isLeaf) {
    return (
      <button
        draggable={!!node.fullKey}
        onDragStart={(e) => {
          if (!node.fullKey) return;
          e.dataTransfer.setData(REDIS_KEY_DND_TYPE, node.fullKey);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => node.fullKey && onPick(node.fullKey)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className="w-full text-left text-[10px] font-mono px-2 py-1 hover:bg-sky-50 hover:text-sky-700 rounded truncate transition-colors cursor-grab active:cursor-grabbing"
        title={`${node.fullKey} (드래그하거나 클릭)`}
      >
        {node.label}
      </button>
    );
  }

  const expanded = forceExpand || open;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${depth * 12}px` }}
        className="w-full text-left text-[10px] font-semibold text-slate-600 px-2 py-1 hover:bg-slate-50 rounded flex items-center gap-1 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <span className="truncate">{node.label}</span>
        <span className="text-slate-400 font-normal flex-shrink-0">({node.leafCount})</span>
      </button>
      {expanded && node.children.map((c) => <RedisKeyPickerNode key={c.label} node={c} depth={depth + 1} onPick={onPick} forceExpand={forceExpand} />)}
    </div>
  );
}

// ─── 플레이스홀더 토큰 피커 — 등록된 플레이스홀더 이름 + "이 쿼리 자신의 VALUE"를 칩으로 보여주고
// 드래그(또는 클릭)로 해시/필드키 조합식에 끼워 넣게 한다. 직접 "{nodeId:6}" 같은 문법을 외워서 타이핑하는
// 대신, 이미 등록된 항목을 보고 골라 넣는 방식이 오타도 없고 어떤 이름이 있는지도 한눈에 보인다.
// includeSelf=false면 "{value}" 칩을 뺀다(해시 이름 쪽은 이 쿼리 자신의 VALUE를 참조할 일이 없음). ──
function PlaceholderTokenPicker({ dbQueryDefs, onPick, includeSelf = true }: { dbQueryDefs: DbQueryDef[]; onPick: (tokenName: string) => void; includeSelf?: boolean }) {
  const placeholderNames = [...new Set(dbQueryDefs.map((d) => d.placeholderName).filter((n): n is string => !!n))];
  const tokenNames = includeSelf ? [SELF_VALUE_TOKEN_NAME, ...placeholderNames] : placeholderNames;

  return (
    <div className="flex flex-wrap gap-1">
      {tokenNames.map((name) => {
        const isSelf = name === SELF_VALUE_TOKEN_NAME;
        return (
          <button
            key={name}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TEMPLATE_TOKEN_DND_TYPE, name);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => onPick(name)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded-full border cursor-grab active:cursor-grabbing transition-colors ${
              isSelf ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
            }`}
            title={isSelf ? '이 쿼리 자신의 VALUE (드래그하거나 클릭)' : `등록된 플레이스홀더 (드래그하거나 클릭)`}
          >
            {`{${name}}`}
          </button>
        );
      })}
      {placeholderNames.length === 0 && (
        <span className="text-[10px] text-slate-400 italic">등록된 플레이스홀더 없음 — 아래 &quot;플레이스홀더 이름&quot;을 채운 데이터소스를 먼저 저장하면 여기 나타남</span>
      )}
    </div>
  );
}

// ─── 세션변수 칩 — :tenantId/:userId는 SQL에 직접 선언하지 않아도 실행 시점마다 현재 로그인
// 테넌트/사용자로 자동 바인딩되는 세션변수인데, 이 컨벤션을 만든 사람이 아니면 알기 어려워서
// SQL 편집기 옆에 드래그(또는 클릭)로 커서 위치에 꽂아 넣을 수 있는 칩으로 노출한다.
// 드래그는 "text/plain"으로 실어 보내 브라우저 기본 텍스트 드롭 동작에 맡긴다(커서 위치에 정확히 삽입됨).
const SESSION_TOKENS = [
  { name: 'tenantId', label: '테넌트 ID', hint: '실행하는 사용자의 로그인 테넌트로 자동 바인딩(WHERE TENANT_ID = :tenantId)' },
  { name: 'userId', label: '사용자 ID', hint: '실행하는 사용자의 ID로 자동 바인딩(WHERE USER_ID = :userId)' },
] as const;

function SessionTokenPicker({ onPick }: { onPick: (name: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-violet-50/50 border border-violet-200 rounded-md">
      <span className="text-[10px] font-semibold text-violet-700 flex-shrink-0">세션변수</span>
      {SESSION_TOKENS.map((t) => (
        <button
          key={t.name}
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', `:${t.name}`);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onPick(t.name)}
          className="px-2 py-0.5 text-[10px] font-mono rounded-full border bg-violet-100 border-violet-300 text-violet-700 hover:bg-violet-200 cursor-grab active:cursor-grabbing transition-colors"
          title={`${t.hint} — SQL 위로 드래그하거나 클릭(커서 위치에 삽입)`}
        >
          {`:${t.name}`} <span className="text-violet-400">({t.label})</span>
        </button>
      ))}
    </div>
  );
}

// ─── 해시 키 세그먼트 에디터 — "IC:GROUP:REASON:2026001281:0" 같은 실제 키를 콜론(:) 기준으로
// 쪼개 세그먼트별로 편집 가능한 칸으로 보여준다. 각 칸은 플레이스홀더 칩을 드롭하면 그 칸만
// "{groupId}" 같은 토큰으로 바뀐다 — 값 하나 통째로 문자열 치환하는 것보다 어느 자리가 바뀌는지
// 눈으로 보면서 조합할 수 있다. ──
function HashKeySegmentEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const segments = value.length > 0 ? value.split(':') : [''];
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  const updateSegment = (idx: number, seg: string) => {
    const next = [...segments];
    next[idx] = seg;
    onChange(next.join(':'));
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border border-slate-200 rounded-md bg-white">
      {segments.map((seg, idx) => (
        <div key={idx} className="flex items-center gap-0.5">
          {idx > 0 && <span className="text-slate-300 text-[10px] font-mono">:</span>}
          <input
            value={seg}
            onChange={(e) => updateSegment(idx, e.target.value)}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(TEMPLATE_TOKEN_DND_TYPE)) return;
              e.preventDefault();
              setDropTargetIdx(idx);
            }}
            onDragLeave={() => setDropTargetIdx((cur) => (cur === idx ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setDropTargetIdx(null);
              const tokenName = e.dataTransfer.getData(TEMPLATE_TOKEN_DND_TYPE);
              if (tokenName) updateSegment(idx, `{${tokenName}}`);
            }}
            style={{ width: `${Math.max(seg.length + 3, 5)}ch` }}
            className={`min-w-[28px] border rounded px-1.5 py-0.5 text-[10px] font-mono text-center focus:outline-none focus:border-[#0f5b9e] transition-colors ${
              dropTargetIdx === idx ? 'border-sky-400 bg-sky-50' : seg.startsWith('{') ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── 단계 헤더 — 왼쪽 설정 영역을 "작성 → 실행/저장 → 저장된 데이터" 흐름으로 한눈에 읽히게
// 번호 배지 + 제목으로 구분한다. 섹션마다 별도 흰색 카드로 쪼개지 않고(레이아웃 가이드의 "단일 흰색
// 래퍼" 원칙 유지) 하나의 카드 안에서 구분선+헤더로만 흐름을 나눈다. ──
function StepHeader({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0f5b9e] text-white text-[10px] font-bold flex items-center justify-center">{step}</span>
      <h3 className="text-[13px] font-bold text-slate-700">{title}</h3>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  );
}

// ─── DataSourceQueryTab (task-display의 "데이터 소스 관리" 탭) ─────────────────
// CTIQ/GROUP/AGENT/DNIS/ACS/AOE/DID 등 앞으로 어떤 테이블이 생길지 모르는 상황에서,
// 관리자가 SELECT 쿼리를 직접 짜서 리스트를 만들어야 할 때 저장 없이 즉석 실행해보는 탭.
// SQL 텍스트 전체가 이미 관리자 본인이 입력한 신뢰된 값이라 리터럴을 그대로 써도 무방하다.
// :name 파라미터는 "같은 쿼리를 값만 바꿔 재사용"하고 싶을 때(예: 뷰 그룹 저장 후 나중에
// 값 확인/변경) 쓰는 편의 기능이며, 안 쓴다고 SQL 인젝션 경로가 새로 생기는 것은 아니다.
export default function DataSourceQueryTab() {
  const userInfo = useAuthStore((s) => s.userInfo);
  // 등록 범위 기본값 — 시스템 관리자는 전체 테넌트 공용이 기본(토글이 보이는 유일한 대상이라 편의상),
  // 일반 사용자는 토글 자체가 안 보이므로 서버가 거부하지 않는 개별 테넌트가 기본이어야 한다.
  const defaultScopeType = (): 'ALL' | 'TENANT' => (userInfo?.isSystemAdmin ? 'ALL' : 'TENANT');
  const sqlRef = useRef<HTMLTextAreaElement>(null);
  const [sql, setSql] = useState('');
  const [params, setParams] = useState<(DbQueryParam & { id: number })[]>([]);
  const [scopeType, setScopeType] = useState<'ALL' | 'TENANT'>(defaultScopeType);
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
  const [saveOpen, setSaveOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [description, setDescription] = useState('');
  const [saveMode, setSaveMode] = useState<SaveMode>('dataSource');
  const [redisKeys, setRedisKeys] = useState<DbQueryRedisKeyEntry[]>([]);
  const [placeholderName, setPlaceholderName] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyTemplate, setNewKeyTemplate] = useState('');
  const [isKeyDropTarget, setIsKeyDropTarget] = useState(false);
  const [isKeyTemplateDropTarget, setIsKeyTemplateDropTarget] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  /** 연동 키 목록에서 수정 중인 항목의 index — null이면 새 항목 추가 모드 */
  const [editingKeyIndex, setEditingKeyIndex] = useState<number | null>(null);

  const runQuery = useMutation({ mutationFn: taskboardApi.runDbQuery });

  const { data: savedDefs = [], refetch: refetchDefs } = useGetDbQueryDefList();
  const createDef = useCreateDbQueryDef({});
  const updateDef = useUpdateDbQueryDef({});
  const deleteDef = useDeleteDbQueryDef({});
  const saveMutation = editingId ? updateDef : createDef;
  const modal = useModal();

  const addParam = () => setParams((prev) => [...prev, makeEmptyParam()]);
  const removeParam = (id: number) => setParams((prev) => prev.filter((p) => p.id !== id));
  const updateParam = (id: number, patch: Partial<DbQueryParam>) => setParams((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  /** editingKeyIndex가 있으면 그 항목을 덮어쓰고(수정), 없으면 새 항목을 추가한다 */
  const handleAddRedisKey = () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      toast.error('라벨과 Redis 키를 모두 입력하세요.');
      return;
    }
    const entry = { label: newKeyLabel.trim(), key: newKeyValue.trim(), keyTemplate: newKeyTemplate.trim() || undefined };
    if (editingKeyIndex !== null) {
      setRedisKeys((prev) => prev.map((rk, i) => (i === editingKeyIndex ? entry : rk)));
      setEditingKeyIndex(null);
    } else {
      setRedisKeys((prev) => [...prev, entry]);
    }
    setNewKeyLabel('');
    setNewKeyValue('');
    setNewKeyTemplate('');
  };
  const removeRedisKey = (index: number) => {
    setRedisKeys((prev) => prev.filter((_, i) => i !== index));
    if (editingKeyIndex === index) handleCancelEditRedisKey();
  };

  /** 기등록된 연동 키 항목을 클릭하면 아래 해시/키 영역 편집 필드로 불러온다 — 목록에서는 빼지 않고
   *  그대로 두며(사라지지 않음), "+ 등록" 버튼이 수정 모드로 바뀌어 같은 항목을 덮어쓴다. */
  const handleEditRedisKey = (index: number) => {
    const rk = redisKeys[index];
    if (!rk) return;
    setNewKeyLabel(rk.label);
    setNewKeyValue(rk.key);
    setNewKeyTemplate(rk.keyTemplate ?? '');
    setEditingKeyIndex(index);
  };

  const handleCancelEditRedisKey = () => {
    setEditingKeyIndex(null);
    setNewKeyLabel('');
    setNewKeyValue('');
    setNewKeyTemplate('');
  };

  const handleKeyDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsKeyDropTarget(false);
    const key = e.dataTransfer.getData(REDIS_KEY_DND_TYPE);
    if (key) setNewKeyValue(key);
  };

  /** 해시 이름에 플레이스홀더 토큰을 세그먼트로 추가(클릭 시) — 비어있으면 그대로, 있으면 ":"로 이어붙인다.
   *  특정 세그먼트를 정확히 바꾸고 싶으면 드래그해서 HashKeySegmentEditor의 그 칸에 직접 놓는 게 낫다. */
  const appendHashSegment = (tokenName: string) => {
    setNewKeyValue((prev) => (prev.trim() ? `${prev}:{${tokenName}}` : `{${tokenName}}`));
  };

  /** 필드키 조합식에 토큰을 추가 — 비어있으면 그대로, 있으면 "||"로 이어붙인다 */
  const appendKeyTemplateToken = (tokenName: string) => {
    setNewKeyTemplate((prev) => (prev.trim() ? `${prev}||{${tokenName}}` : `{${tokenName}}`));
  };

  const handleKeyTemplateDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsKeyTemplateDropTarget(false);
    const tokenName = e.dataTransfer.getData(TEMPLATE_TOKEN_DND_TYPE);
    if (tokenName) appendKeyTemplateToken(tokenName);
  };

  /** 세션변수 칩 클릭 시 SQL textarea의 현재 커서 위치에 토큰을 삽입(드래그는 네이티브 텍스트 드롭에 맡김) */
  const insertSessionToken = (name: string) => {
    const token = `:${name}`;
    const el = sqlRef.current;
    if (!el) {
      setSql((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? sql.length;
    const end = el.selectionEnd ?? sql.length;
    const next = sql.slice(0, start) + token + sql.slice(end);
    setSql(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleRun = async () => {
    if (!sql.trim()) {
      toast.error('SQL을 입력하세요.');
      return;
    }
    if (params.some((p) => !p.name.trim())) {
      toast.error('파라미터 이름이 비어있습니다.');
      return;
    }
    try {
      const rows = await runQuery.mutateAsync({ sql, params: params.map(({ id: _id, ...rest }) => rest) });
      setResult(rows);
      setVisibleRows(INITIAL_VISIBLE_ROWS);
      toast.success(`${rows.length}건 조회됨`);
    } catch (e) {
      setResult(null);
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '쿼리 실행에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleResultScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX) {
      setVisibleRows((prev) => Math.min(prev + VISIBLE_ROWS_STEP, result?.length ?? prev));
    }
  };

  const columns = result && result.length > 0 ? Object.keys(result[0]) : [];
  const visibleResult = result?.slice(0, visibleRows) ?? [];
  // 뷰 그룹 체크박스 소스로 저장 가능한 조건 — VALUE/NAME 두 컬럼만 반환해야 함(백엔드도 동일 검증).
  // 파라미터가 있으면 현재 입력된 값이 고정값(freeze)으로 함께 저장된다.
  const isSavable = [...columns.map((c) => c.toUpperCase())].sort().join(',') === [...REQUIRED_OPTION_COLUMNS].sort().join(',');
  // 저장된 목록을 용도별로 분리 — 뷰그룹 선택용(일반 데이터소스)과 플레이스홀더(다른 데이터소스가 참조하는 값 목록)를 섞어 보여주면 헷갈려서 나눔
  const dataSourceDefs = savedDefs.filter((d) => !d.placeholderName);
  const placeholderDefs = savedDefs.filter((d) => !!d.placeholderName);

  const handleSave = async () => {
    if (!queryName.trim()) {
      toast.error('쿼리 이름을 입력하세요.');
      return;
    }
    if (saveMode === 'placeholder' && !placeholderName.trim()) {
      toast.error('플레이스홀더 이름을 입력하세요.');
      return;
    }
    if (params.some((p) => !p.value.trim())) {
      toast.error('파라미터 값이 비어있습니다 — 저장 시점 값이 고정값으로 저장됩니다.');
      return;
    }
    try {
      const payload = {
        tenantId: userInfo?.tenant ?? '',
        queryName,
        description: description || undefined,
        sqlText: sql,
        params: params.length > 0 ? params.map(({ id: _id, ...rest }) => rest) : undefined,
        redisKeys: saveMode === 'dataSource' && redisKeys.length > 0 ? redisKeys : undefined,
        placeholderName: saveMode === 'placeholder' ? placeholderName.trim() : undefined,
        scopeType,
      };
      if (editingId) {
        await updateDef.mutateAsync({ dbQueryId: editingId, ...payload });
        toast.success('수정되었습니다.');
      } else {
        await createDef.mutateAsync(payload);
        toast.success('저장되었습니다.');
      }
      setSaveOpen(false);
      setQueryName('');
      setDescription('');
      setRedisKeys([]);
      setEditingKeyIndex(null);
      setPlaceholderName('');
      setSaveMode('dataSource');
      setScopeType(defaultScopeType());
      setEditingId(null);
      refetchDefs();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '저장에 실패했습니다.';
      toast.error(message);
    }
  };

  const handleEdit = (def: DbQueryDef) => {
    setSql(def.sqlText);
    setParams((def.params ?? []).map((p) => ({ ...p, id: (paramSeq += 1) })));
    setQueryName(def.queryName);
    setDescription(def.description ?? '');
    setRedisKeys(def.redisKeys ?? []);
    setEditingKeyIndex(null);
    setPlaceholderName(def.placeholderName ?? '');
    setSaveMode(def.placeholderName ? 'placeholder' : 'dataSource');
    setScopeType(def.scopeType ?? 'TENANT');
    setEditingId(def.dbQueryId);
    setResult(null);
    setVisibleRows(INITIAL_VISIBLE_ROWS);
    setSaveOpen(false);
  };

  /** handleEdit과 동일하게 필드를 채우되, editingId는 비워 저장 시 새 항목으로 생성되게 한다(원본은 그대로 유지).
   *  placeholderName은 다른 데이터소스가 "{이 이름}"으로 참조하는 유일 키라 그대로 복제하면 원본과 충돌하므로 비워서 새로 입력받는다. */
  const handleCloneDef = (def: DbQueryDef) => {
    setSql(def.sqlText);
    setParams((def.params ?? []).map((p) => ({ ...p, id: (paramSeq += 1) })));
    setQueryName(`${def.queryName} (복사본)`);
    setDescription(def.description ?? '');
    setRedisKeys(def.redisKeys ?? []);
    setEditingKeyIndex(null);
    setPlaceholderName('');
    setSaveMode(def.placeholderName ? 'placeholder' : 'dataSource');
    setScopeType(def.scopeType ?? 'TENANT');
    setEditingId(null);
    setResult(null);
    setVisibleRows(INITIAL_VISIBLE_ROWS);
    setSaveOpen(false);
    toast.success(def.placeholderName ? '복제되었습니다 — 플레이스홀더 이름을 새로 입력하고 실행 후 저장하세요.' : '복제되었습니다 — 이름을 확인하고 실행 후 저장하세요.');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSql('');
    setParams([]);
    setQueryName('');
    setDescription('');
    setRedisKeys([]);
    setEditingKeyIndex(null);
    setPlaceholderName('');
    setSaveMode('dataSource');
    setScopeType(defaultScopeType());
    setResult(null);
    setSaveOpen(false);
  };

  const handleDeleteDef = (id: number) => {
    modal.confirm.delete({
      onOk: async () => {
        try {
          await deleteDef.mutateAsync(id);
          toast.success('삭제되었습니다.');
          if (editingId === id) handleCancelEdit();
          refetchDefs();
        } catch {
          toast.error('삭제에 실패했습니다.');
        }
      },
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4 overflow-y-auto min-h-0">
          <StepHeader step={1} title="쿼리 작성" hint="VALUE, NAME 컬럼으로 조회되도록 작성하세요" />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">SQL (SELECT만 허용, 값은 :name 형태 파라미터로)</label>
            <textarea
              ref={sqlRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder={'예: SELECT CTIQ_ID AS VALUE, CTIQ_NAME AS NAME FROM TB_IC_CTIQMASTER WHERE TENANT_ID = :tenantId'}
              rows={4}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0f5b9e]"
            />
            <div className="mt-1.5">
              <SessionTokenPicker onPick={insertSessionToken} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">파라미터 (:name 값 바인딩)</label>
              <button onClick={addParam} className="flex items-center gap-1 text-xs font-semibold text-[#0f5b9e] hover:bg-blue-50 rounded-md px-2 py-1 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                파라미터 추가
              </button>
            </div>
            {params.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic px-1">파라미터 없음 — SQL에 :name이 있다면 추가하세요.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {params.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <input
                      value={p.name}
                      onChange={(e) => updateParam(p.id, { name: e.target.value })}
                      placeholder="tenantId"
                      className="w-28 border border-slate-200 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f5b9e]"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => updateParam(p.id, { type: e.target.value as DbQueryParam['type'] })}
                      className="border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
                    >
                      {PARAM_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={p.value}
                      onChange={(e) => updateParam(p.id, { value: e.target.value })}
                      placeholder={p.type === 'DATE' ? 'yyyy-MM-dd' : '값'}
                      className="flex-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
                    />
                    <button onClick={() => removeParam(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="삭제">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
            <StepHeader step={2} title="실행 & 저장" />

            {editingId && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-700">
                <span>저장된 쿼리를 편집 중입니다 — 실행 후 저장하면 덮어씁니다.</span>
                <button onClick={handleCancelEdit} className="flex items-center gap-1 font-semibold hover:underline flex-shrink-0">
                  <X className="w-3 h-3" />
                  취소
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={runQuery.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
              >
                <Play className="w-3.5 h-3.5" />
                {runQuery.isPending ? '실행 중...' : '실행'}
              </button>
              {result !== null && (
                <button
                  onClick={() => setSaveOpen((v) => !v)}
                  disabled={!isSavable}
                  title={isSavable ? '뷰 그룹 체크박스 옵션으로 저장 (파라미터가 있으면 현재 값이 고정값으로 저장됩니다)' : 'VALUE, NAME 두 컬럼만 반환해야 저장할 수 있습니다'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#0f5b9e] text-[#0f5b9e] rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:border-slate-300 disabled:text-slate-400"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingId ? '뷰 그룹 데이터 수정' : '뷰 그룹용으로 저장'}
                </button>
              )}
            </div>

            {saveOpen && isSavable && (
              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <input
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  placeholder="이름 (예: CTIQ 목록)"
                  className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
                />
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명 (선택)"
                  className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#0f5b9e]"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 flex-shrink-0">저장 용도</span>
                  <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSaveMode('dataSource')}
                      className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${saveMode === 'dataSource' ? 'bg-[#0f5b9e] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      뷰그룹 선택용
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveMode('placeholder')}
                      className={`px-2.5 py-1 text-[10px] font-semibold border-l border-slate-200 transition-colors ${saveMode === 'placeholder' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      플레이스홀더용
                    </button>
                  </div>
                </div>

                {userInfo?.isSystemAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 flex-shrink-0">등록 범위</span>
                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setScopeType('ALL')}
                        className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                          scopeType === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        전체테넌트공용
                      </button>
                      <button
                        type="button"
                        onClick={() => setScopeType('TENANT')}
                        className={`px-2.5 py-1 text-[10px] font-semibold border-l border-slate-200 transition-colors ${
                          scopeType === 'TENANT' ? 'bg-[#0f5b9e] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        개별테넌트
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400">전체테넌트공용은 모든 테넌트가 조회/실행 가능(수정·삭제는 등록 테넌트만 가능)</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">등록 범위: 개별테넌트(본인 테넌트 전용) — 전체테넌트공용 등록은 시스템 관리자만 가능</p>
                )}

                {saveMode === 'placeholder' ? (
                  <div className="flex flex-col gap-1 p-2.5 bg-white rounded-md border border-amber-200">
                    <label className="text-[10px] font-semibold text-amber-700">플레이스홀더 이름 (필수)</label>
                    <input
                      value={placeholderName}
                      onChange={(e) => setPlaceholderName(e.target.value)}
                      placeholder="예: nodeId, groupId"
                      className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#0f5b9e]"
                    />
                    <p className="text-[10px] text-slate-400 leading-snug">
                      다른 데이터소스가 해시/필드키 조합식에서{' '}
                      <code className="font-mono">
                        {'{'}이 이름{'}'}
                      </code>{' '}
                      칩으로 이 쿼리의 VALUE 목록을 참조할 수 있음(뷰그룹에서 이 쿼리 값을 선택하면 그것만, 안 하면 전체).
                    </p>
                    <p className="text-[10px] text-amber-600 leading-snug">
                      이름을 <code className="font-mono">groupId</code>로 지정해도 특별한 동작은 없음 — 그룹 단위 위젯(그룹별 이석사유 현황·상담그룹 테이블 등)의 &quot;어느 그룹을
                      보여줄지&quot;는 뷰그룹 등록 폼의 &quot;상담그룹&quot; 직접선택 값을 그대로 씀.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 p-2.5 bg-white rounded-md border border-slate-200">
                    <label className="text-[10px] font-semibold text-slate-500">연동 Redis 키 (라벨별로 여러 개 가능)</label>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      해시 이름(HASH)과 필드(KEY) 두 영역을 따로 채운 뒤 라벨 입력 → 추가. 그룹요약/이석사유처럼 여러 해시에 걸치면 라벨별로 나눠 등록하세요. 등록된 항목을 클릭하면
                      아래 해시/필드 영역에 불러와 수정할 수 있습니다.
                    </p>

                    {redisKeys.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {redisKeys.map((rk, idx) => (
                          <div
                            key={`${rk.label}-${idx}`}
                            onClick={() => handleEditRedisKey(idx)}
                            role="button"
                            tabIndex={0}
                            title="클릭하면 아래 해시/필드 영역으로 불러와 수정할 수 있습니다"
                            className={`flex items-center gap-1.5 px-2 py-1 border rounded text-[10px] cursor-pointer transition-colors ${
                              editingKeyIndex === idx ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-300'
                            }`}
                          >
                            <span className="font-semibold text-slate-600 flex-shrink-0 max-w-[25%] truncate" title={rk.label}>
                              {rk.label}
                            </span>
                            <span className="font-mono text-slate-500 flex-1 min-w-0 truncate" title={rk.key}>
                              {rk.key}
                            </span>
                            {rk.keyTemplate && (
                              <span className="font-mono text-sky-600 flex-shrink-0 max-w-[30%] truncate" title={`필드키: ${rk.keyTemplate}`}>
                                ={rk.keyTemplate}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRedisKey(idx);
                              }}
                              className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                              title="삭제"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      placeholder="라벨 (예: 그룹요약, 이석사유)"
                      className="w-full border border-slate-200 rounded-md px-2 py-1 text-[10px] focus:outline-none focus:border-[#0f5b9e]"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1 p-2 bg-slate-50 rounded-md border border-slate-200">
                        <label className="text-[10px] font-semibold text-slate-500">해시(HASH) 영역</label>
                        <RedisKeyTreePicker onPick={(key) => setNewKeyValue(key)} />
                        <PlaceholderTokenPicker dbQueryDefs={savedDefs} onPick={appendHashSegment} includeSelf={false} />
                        <div
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes(REDIS_KEY_DND_TYPE)) return;
                            e.preventDefault();
                            setIsKeyDropTarget(true);
                          }}
                          onDragLeave={() => setIsKeyDropTarget(false)}
                          onDrop={handleKeyDrop}
                          className={`rounded-md border-2 border-dashed transition-colors ${isKeyDropTarget ? 'border-sky-400 bg-sky-50' : 'border-transparent'}`}
                        >
                          <HashKeySegmentEditor value={newKeyValue} onChange={setNewKeyValue} />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          위 트리에서 실제 키를 드래그/클릭하면 콜론(:) 단위로 쪼개져 나옴 — 그중 그룹ID 같은 자리에 플레이스홀더 칩을 드래그해서 놓으면 그 칸만{' '}
                          <code className="font-mono">{'{groupId}'}</code>로 바뀜.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 p-2 bg-slate-50 rounded-md border border-slate-200">
                        <label className="text-[10px] font-semibold text-slate-500">필드(KEY) 영역 (선택)</label>
                        <PlaceholderTokenPicker dbQueryDefs={savedDefs} onPick={appendKeyTemplateToken} />
                        <div
                          onDragOver={(e) => {
                            if (!e.dataTransfer.types.includes(TEMPLATE_TOKEN_DND_TYPE)) return;
                            e.preventDefault();
                            setIsKeyTemplateDropTarget(true);
                          }}
                          onDragLeave={() => setIsKeyTemplateDropTarget(false)}
                          onDrop={handleKeyTemplateDrop}
                          className={`rounded-md border-2 border-dashed transition-colors ${isKeyTemplateDropTarget ? 'border-sky-400 bg-sky-50' : 'border-transparent'}`}
                        >
                          <input
                            value={newKeyTemplate}
                            onChange={(e) => setNewKeyTemplate(e.target.value)}
                            placeholder="예: {nodeId:6}||{value} — 위 칩으로 채우거나 직접 입력/수정"
                            className="w-full border border-slate-200 rounded-md px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#0f5b9e]"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          미입력 시 이 쿼리의 VALUE를 필드로 그대로 씀(대부분 이 경우). 해시 필드 자체가 복합값(노드ID+사유코드 등)일 때만 채움. 자릿수(
                          <code className="font-mono">{'{nodeId:6}'}</code>)는 칩 삽입 후 직접 편집.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddRedisKey}
                        className="self-start px-3 py-1 text-[10px] font-semibold rounded border bg-slate-700 text-white border-slate-700 hover:bg-slate-800 transition-colors"
                      >
                        {editingKeyIndex !== null ? '수정 완료' : '+ 이 해시/필드로 등록'}
                      </button>
                      {editingKeyIndex !== null && (
                        <button onClick={handleCancelEditRedisKey} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="self-start px-3 py-1.5 bg-[#0f5b9e] text-white rounded-md text-xs font-semibold hover:bg-[#0c4a82] transition-colors disabled:opacity-60"
                >
                  {saveMutation.isPending ? '저장 중...' : editingId ? '수정' : '저장'}
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-400 leading-snug">
              SELECT만 허용되며 결과는 <code className="font-mono">VALUE</code>, <code className="font-mono">NAME</code> 두 컬럼만 표시됩니다. WHERE절 값은 파라미터로 넘기세요.{' '}
              <code className="font-mono">:tenantId</code>/<code className="font-mono">:userId</code> 세션변수 칩은 드래그하거나 클릭하면 자동 삽입·바인딩됩니다.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
            <StepHeader step={3} title="저장된 데이터" />

            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-semibold text-slate-600">저장된 뷰그룹 데이터 (연동 Redis 키 등록분)</label>
              {dataSourceDefs.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">저장된 쿼리 없음</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 px-2.5">
                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                      <span className="text-[10px] font-semibold text-slate-400">뷰그룹 데이터</span>
                      <span className="text-[10px] font-semibold text-slate-400 border-l border-slate-200 pl-3">키 데이터</span>
                    </div>
                    <span className="w-[52px] flex-shrink-0" />
                  </div>
                  {dataSourceDefs.map((d) => (
                    <div
                      key={d.dbQueryId}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border ${
                        editingId === d.dbQueryId ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1">
                            <span className="truncate">{d.queryName}</span>
                            <span
                              className={`flex-shrink-0 text-[9px] px-1 py-0.5 rounded font-semibold ${
                                d.scopeType === 'ALL' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {d.scopeType === 'ALL' ? '전체' : '개별'}
                            </span>
                          </div>
                          {d.description && <div className="text-[10px] text-slate-400 truncate">{d.description}</div>}
                        </div>
                        <div className="min-w-0 border-l border-slate-200 pl-3 flex flex-col gap-0.5">
                          {(d.redisKeys?.length ?? 0) > 0 ? (
                            d.redisKeys!.map((rk, i) => (
                              <div
                                key={i}
                                className="text-[10px] font-mono text-emerald-600 truncate"
                                title={`${rk.label} = ${rk.key}${rk.keyTemplate ? ` (필드: ${rk.keyTemplate})` : ''}`}
                              >
                                {rk.label}: {rk.key}
                                {rk.keyTemplate && <span className="text-sky-600"> ={rk.keyTemplate}</span>}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">연동 키 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => handleEdit(d)} className="p-1 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded-md transition-colors" title="수정">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCloneDef(d)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="복제"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDef(d.dbQueryId)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-semibold text-slate-600">저장된 플레이스홀더</label>
              {placeholderDefs.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">등록된 플레이스홀더 없음</p>
              ) : (
                placeholderDefs.map((d) => (
                  <div
                    key={d.dbQueryId}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border ${
                      editingId === d.dbQueryId ? 'bg-amber-50 border-amber-300' : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-700 truncate flex items-center gap-1">
                        <span className="truncate">{d.queryName}</span>
                        <span
                          className={`flex-shrink-0 text-[9px] px-1 py-0.5 rounded font-semibold ${
                            d.scopeType === 'ALL' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {d.scopeType === 'ALL' ? '전체' : '개별'}
                        </span>
                      </div>
                      {d.description && <div className="text-[10px] text-slate-400 truncate">{d.description}</div>}
                      <div className="text-[10px] text-amber-600 font-mono truncate">{`{${d.placeholderName}}`}</div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => handleEdit(d)} className="p-1 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded-md transition-colors" title="수정">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleCloneDef(d)} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="복제">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDef(d.dbQueryId)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col min-h-0">
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex-shrink-0">
            결과{result && result.length > 0 ? ` (${visibleResult.length}/${result.length}건 표시)` : ''}
          </label>
          <p className="text-[10px] text-slate-400 mb-2 flex-shrink-0">보안상 VALUE, NAME 컬럼만 표시됩니다.</p>
          <div className="overflow-auto min-h-0 flex-1" onScroll={handleResultScroll}>
            {result === null ? (
              <p className="text-[11px] text-slate-400 italic">아직 실행하지 않았습니다.</p>
            ) : result.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">결과 없음</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    {columns.map((col) => (
                      <th key={col} className="text-left font-semibold text-slate-600 px-2 py-1.5 whitespace-nowrap sticky top-0 bg-white">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleResult.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-50' : ''}>
                      {columns.map((col) => (
                        <td key={col} className="px-2 py-1.5 whitespace-nowrap text-slate-700">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
