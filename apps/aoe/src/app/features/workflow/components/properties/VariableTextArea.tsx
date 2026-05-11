import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  DecoratorNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import type { UpstreamVariable } from '../../utils/variableTokens';

/* ============================================================
 * VariableNode — 칩으로 렌더링되는 inline DecoratorNode
 * ============================================================ */

type SerializedVariableNode = Spread<{ id: string; label: string; source?: string }, SerializedLexicalNode>;

class VariableNode extends DecoratorNode<ReactNode> {
  __id: string;
  __label: string;
  __source?: string;

  static getType(): string {
    return 'variable';
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.__id, node.__label, node.__source, node.__key);
  }

  constructor(id: string, label: string, source?: string, key?: NodeKey) {
    super(key);
    this.__id = id;
    this.__label = label;
    this.__source = source;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('span');
    dom.style.display = 'inline-block';
    dom.style.verticalAlign = 'middle';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  /** `{{id}}` 형태로 텍스트 직렬화 — onChange 에서 string 으로 추출될 때 사용 */
  getTextContent(): string {
    return `{{${this.__id}}}`;
  }

  static importJSON(serialized: SerializedVariableNode): VariableNode {
    return new VariableNode(serialized.id, serialized.label, serialized.source);
  }

  exportJSON(): SerializedVariableNode {
    return { type: VariableNode.getType(), version: 1, id: this.__id, label: this.__label, source: this.__source };
  }

  decorate(): ReactNode {
    return <VariableChip label={this.__label} source={this.__source} />;
  }
}

const $createVariableNode = (id: string, label: string, source?: string): VariableNode => new VariableNode(id, label, source);

interface VariableChipProps {
  label: string;
  source?: string;
}

const VariableChip = ({ label, source }: VariableChipProps) => (
  <span
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200 select-none mx-0.5 align-middle"
    contentEditable={false}
  >
    <span className="text-blue-500">(x)</span>
    <span className="font-medium">{label}</span>
    {source && (
      <>
        <span className="text-blue-300">/</span>
        <span className="text-blue-600/80">{source}</span>
      </>
    )}
  </span>
);

/* ============================================================
 * 초기 editorState 빌더 — string value → 노드 트리
 * ============================================================ */

const buildInitialEditorState = (value: string, variables: UpstreamVariable[]) => () => {
  const root = $getRoot();
  if (root.getFirstChild() !== null) return;
  const paragraph = $createParagraphNode();
  const variableMap = new Map(variables.map((v) => [v.id, v]));
  const regex = /\{\{([^}]+)\}\}/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIdx) {
      paragraph.append($createTextNode(value.slice(lastIdx, match.index)));
    }
    const tokenId = match[1].trim();
    const known = variableMap.get(tokenId);
    paragraph.append($createVariableNode(tokenId, known?.label ?? tokenId, known?.source));
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < value.length) {
    paragraph.append($createTextNode(value.slice(lastIdx)));
  }
  root.append(paragraph);
};

/* ============================================================
 * `/` 트리거 dropdown plugin
 * ============================================================ */

interface SlashState {
  nodeKey: NodeKey;
  /** TextNode 내 `/` 위치 offset */
  start: number;
  /** 현재 커서 offset */
  end: number;
  query: string;
}

interface SlashTriggerPluginProps {
  variables: UpstreamVariable[];
}

const SlashTriggerPlugin = ({ variables }: SlashTriggerPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setSlash(null);
          return;
        }
        const anchor = selection.anchor;
        const node = anchor.getNode();
        if (!$isTextNode(node)) {
          setSlash(null);
          return;
        }
        const text = node.getTextContent();
        const offset = anchor.offset;
        for (let i = offset - 1; i >= 0; i -= 1) {
          const ch = text[i];
          if (ch === '/') {
            const prev = i === 0 ? '\n' : text[i - 1];
            if (/\s/.test(prev) || i === 0) {
              const query = text.slice(i + 1, offset);
              if (/\s/.test(query)) {
                setSlash(null);
                return;
              }
              setSlash({ nodeKey: node.getKey(), start: i, end: offset, query });
              return;
            }
            setSlash(null);
            return;
          }
          if (/\s/.test(ch)) {
            setSlash(null);
            return;
          }
        }
        setSlash(null);
      });
    });
  }, [editor]);

  const filtered = useMemo(() => {
    if (!slash) return [] as UpstreamVariable[];
    const q = slash.query.toLowerCase();
    if (!q) return variables;
    return variables.filter((v) => v.id.toLowerCase().includes(q) || v.label.toLowerCase().includes(q));
  }, [slash, variables]);

  useEffect(() => {
    setHighlighted(0);
  }, [slash?.query]);

  const insertVariable = (variable: UpstreamVariable) => {
    if (!slash) return;
    editor.update(() => {
      const node = $getNodeByKey(slash.nodeKey) as LexicalNode | null;
      if (!node || !$isTextNode(node)) return;
      const text = node.getTextContent();
      const before = text.slice(0, slash.start);
      const after = text.slice(slash.end);

      const variableNode = $createVariableNode(variable.id, variable.label, variable.source);
      const afterNode = after ? $createTextNode(after) : null;

      // before 가 있으면 현재 노드의 텍스트를 before 로 줄이고 형제로 variableNode/afterNode 삽입
      // before 가 없으면 현재 노드 자체를 replace
      if (before) {
        node.setTextContent(before);
        node.insertAfter(variableNode);
        if (afterNode) variableNode.insertAfter(afterNode);
      } else {
        node.replace(variableNode);
        if (afterNode) variableNode.insertAfter(afterNode);
      }
      // 커서를 삽입한 칩 뒤로
      variableNode.selectNext();
    });
    setSlash(null);
  };

  // dropdown 열려있을 때 화살표/Enter/Esc 를 Lexical 기본 동작보다 우선해서 가로채기
  useEffect(() => {
    if (!slash || filtered.length === 0) return undefined;

    const unregisterDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        event?.preventDefault();
        setHighlighted((h) => (h + 1) % filtered.length);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        event?.preventDefault();
        setHighlighted((h) => (h - 1 + filtered.length) % filtered.length);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        event?.preventDefault();
        insertVariable(filtered[highlighted]);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        event?.preventDefault();
        setSlash(null);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return () => {
      unregisterDown();
      unregisterUp();
      unregisterEnter();
      unregisterEscape();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, slash, filtered, highlighted]);

  const showDropdown = slash !== null && filtered.length > 0;
  if (!showDropdown) return null;

  return (
    <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg" onMouseDown={(e) => e.preventDefault()}>
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-100">변수 검색{slash?.query ? ` · "${slash.query}"` : ''}</div>
      {filtered.map((v, idx) => (
        <button
          key={v.id}
          type="button"
          onClick={() => insertVariable(v)}
          onMouseEnter={() => setHighlighted(idx)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-blue-50 ${idx === highlighted ? 'bg-blue-50' : ''}`}
        >
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-blue-600 shrink-0">(x)</span>
            <span className="font-medium text-gray-800 truncate">{v.label}</span>
            {v.source && (
              <>
                <span className="text-gray-300 shrink-0">/</span>
                <span className="text-[11px] text-gray-500 truncate">{v.source}</span>
              </>
            )}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0">{v.type}</span>
        </button>
      ))}
    </div>
  );
};

/* ============================================================
 * 외부 인터페이스
 * ============================================================ */

interface VariableTextAreaProps {
  value?: string;
  onChange?: (value: string) => void;
  variables: UpstreamVariable[];
  placeholder?: string;
  rows?: number;
}

const onEditorError = (error: Error, _editor: LexicalEditor) => {
  console.error('[VariableTextArea] Lexical error:', error);
};

export default function VariableTextArea({ value = '', onChange, variables, placeholder, rows = 3 }: VariableTextAreaProps) {
  // 마운트 시 initial value 만 사용 — 같은 노드 내에서 외부 value 변경은 무시 (typing → onChange → form 갱신 loop 방지)
  const initialValueRef = useRef(value);
  const initialVariablesRef = useRef(variables);
  const lastEmittedRef = useRef(value);

  const initialConfig = useMemo(
    () => ({
      namespace: 'VariableTextArea',
      onError: onEditorError,
      nodes: [VariableNode] as const,
      editorState: buildInitialEditorState(initialValueRef.current, initialVariablesRef.current),
      theme: {},
    }),
    [],
  );

  const handleChange = (editorState: ReturnType<LexicalEditor['getEditorState']>) => {
    editorState.read(() => {
      const text = $getRoot().getTextContent();
      if (text !== lastEmittedRef.current) {
        lastEmittedRef.current = text;
        onChange?.(text);
      }
    });
  };

  const minHeight = rows * 22 + 8; // 줄 높이 22px 가정

  return (
    <div className="relative">
      <LexicalComposer initialConfig={initialConfig}>
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className="w-full px-2.5 py-1.5 rounded-md border border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none text-sm text-gray-800 leading-[22px] whitespace-pre-wrap break-words"
              style={{ minHeight }}
              spellCheck={false}
            />
          }
          placeholder={<div className="pointer-events-none absolute top-1.5 left-3 text-sm text-gray-400 select-none">{placeholder}</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <SlashTriggerPlugin variables={variables} />
      </LexicalComposer>
    </div>
  );
}
