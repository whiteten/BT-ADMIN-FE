/**
 * 번호 패턴 관리 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * 번호 패턴 목록 + CRUD + 선택 기능
 * DID 번호변환 등록/수정 시 원본패턴 필드에서 패턴을 선택할 수 있도록 지원
 */
// SWAT SwatPattern.testPatternExtended 이식
function validateNumPatternExtended(patterns: string): boolean {
  const TOKEN_RE = /\[\d+-\d\]|X|Z|N|!|\.|\[\d+\](\d+)?|\[\d+(,\d+)*\](\d+)?|\d|[@+]/g;
  const patternList = patterns.toUpperCase().split('|');
  for (const segment of patternList) {
    if (/[()]/g.test(segment) && !/^\(|\)$/.test(segment)) {
      return false;
    }
    const trimmed = segment.replace(/[()]/g, '');
    if (trimmed === '') return false;
    try {
      const matched = trimmed.match(TOKEN_RE);
      if (!matched || matched.join('') !== trimmed) return false;
    } catch {
      return false;
    }
  }
  return true;
}
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Drawer, Empty, Form, Input, List, Popconfirm, Space, Tooltip, Typography } from 'antd';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateNumPattern, useDeleteNumPattern, useGetNumPatterns, useUpdateNumPattern } from '../hooks/useDidTransQueries';
import type { NumPattern, NumPatternCreateRequest } from '../types';

export interface NumPatternDrawerRef {
  open: () => void;
  close: () => void;
}

interface Props {
  onSelect?: (pattern: NumPattern) => void;
  onClose?: () => void;
}

interface EditingState {
  mode: 'create' | 'edit';
  patternId?: number;
  patternName: string;
  numPattern: string;
}

const NumPatternDrawer = forwardRef<NumPatternDrawerRef, Props>(({ onSelect, onClose: onCloseProp }, ref) => {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [form] = Form.useForm();

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: patterns = [], refetch } = useGetNumPatterns({
    queryOptions: { enabled: visible },
  });

  const { mutate: createPattern, isPending: isCreating } = useCreateNumPattern({
    mutationOptions: {
      onSuccess: () => {
        toast.success('번호 패턴이 등록되었습니다');
        setEditing(null);
        form.resetFields();
        refetch();
      },
      onError: (error: Error) => {
        toast.error(error.message || '번호 패턴 등록에 실패했습니다.');
      },
    },
  });

  const { mutate: updatePattern, isPending: isUpdating } = useUpdateNumPattern({
    mutationOptions: {
      onSuccess: () => {
        toast.success('번호 패턴이 수정되었습니다');
        setEditing(null);
        form.resetFields();
        refetch();
      },
      onError: (error: Error) => {
        toast.error(error.message || '번호 패턴 수정에 실패했습니다.');
      },
    },
  });

  const { mutate: deletePattern } = useDeleteNumPattern({
    mutationOptions: {
      onSuccess: () => {
        toast.success('번호 패턴이 삭제되었습니다');
        refetch();
      },
      onError: (error: Error) => {
        toast.error(error.message || '번호 패턴 삭제에 실패했습니다.');
      },
    },
  });

  // ─── Imperative Handle ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    open: () => {
      setVisible(true);
      setSearchText('');
      setEditing(null);
      form.resetFields();
    },
    close: () => {
      setVisible(false);
      setEditing(null);
      form.resetFields();
    },
  }));

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredPatterns = useMemo(() => {
    if (!searchText.trim()) return patterns;
    const keyword = searchText.toLowerCase();
    return patterns.filter((p) => p.patternName.toLowerCase().includes(keyword) || p.numPattern.toLowerCase().includes(keyword));
  }, [patterns, searchText]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setVisible(false);
    setEditing(null);
    form.resetFields();
    onCloseProp?.();
  }, [form, onCloseProp]);

  const handleStartCreate = useCallback(() => {
    setEditing({ mode: 'create', patternName: '', numPattern: '' });
    form.setFieldsValue({ patternName: '', numPattern: '' });
  }, [form]);

  const handleStartEdit = useCallback(
    (pattern: NumPattern) => {
      setEditing({
        mode: 'edit',
        patternId: pattern.patternId,
        patternName: pattern.patternName,
        numPattern: pattern.numPattern,
      });
      form.setFieldsValue({
        patternName: pattern.patternName,
        numPattern: pattern.numPattern,
      });
    },
    [form],
  );

  const handleCancelEdit = useCallback(() => {
    setEditing(null);
    form.resetFields();
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload: NumPatternCreateRequest = {
        patternName: values.patternName,
        numPattern: values.numPattern,
      };

      if (editing?.mode === 'edit' && editing.patternId) {
        updatePattern({ id: editing.patternId, data: payload });
      } else {
        createPattern(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, editing, createPattern, updatePattern]);

  const handleDelete = useCallback(
    (patternId: number) => {
      deletePattern({ id: patternId });
    },
    [deletePattern],
  );

  const handleSelect = useCallback(
    (pattern: NumPattern) => {
      onSelect?.(pattern);
      handleClose();
    },
    [onSelect, handleClose],
  );

  const isPending = isCreating || isUpdating;

  return (
    <Drawer
      title="번호 패턴 관리"
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 560 } }}
      afterOpenChange={(open) => {
        if (open) refetch();
      }}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleStartCreate} disabled={editing !== null}>
            추가
          </Button>
        </div>
      }
    >
      {/* Search */}
      <Input
        placeholder="패턴명 또는 번호 패턴으로 검색"
        prefix={<Search className="size-3.5 text-gray-400" />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        className="mb-3"
      />

      {/* Inline Form (create / edit) */}
      {editing && (
        <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3">
          <Typography.Text strong className="mb-2 block">
            {editing.mode === 'create' ? '새 패턴 등록' : '패턴 수정'}
          </Typography.Text>
          <Form form={form} layout="vertical" size="small">
            <Form.Item
              name="patternName"
              label="패턴명"
              rules={[
                { required: true, message: '패턴명은 필수입니다' },
                { max: 100, message: '패턴명은 100자 이내여야 합니다' },
              ]}
              className="mb-2"
            >
              <Input placeholder="패턴명을 입력하세요" maxLength={100} />
            </Form.Item>
            <Form.Item
              name="numPattern"
              label="번호 패턴"
              rules={[
                { required: true, message: '번호 패턴은 필수입니다' },
                { max: 256, message: '번호 패턴은 256자 이내여야 합니다' },
                {
                  validator: (_, value: string) => {
                    if (!value) return Promise.resolve();
                    return validateNumPatternExtended(value) ? Promise.resolve() : Promise.reject(new Error('번호패턴 형식이 올바르지 않습니다'));
                  },
                },
              ]}
              className="mb-2"
            >
              <Input placeholder="번호 패턴을 입력하세요 (예: 02[0-9]{7,8})" maxLength={256} />
            </Form.Item>
            <Space>
              <Button type="primary" size="small" icon={<Check className="size-3.5" />} onClick={handleSave} loading={isPending}>
                저장
              </Button>
              <Button size="small" icon={<X className="size-3.5" />} onClick={handleCancelEdit}>
                취소
              </Button>
            </Space>
          </Form>

          {/* 패턴 가이드 */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="text-[11px] font-semibold text-blue-700 mb-2">패턴 문법 가이드</div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="text-left py-1 pr-2 text-blue-600 w-[50px]">문자</th>
                  <th className="text-left py-1 text-blue-600">의미</th>
                </tr>
              </thead>
              <tbody className="text-blue-800">
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">X</td>
                  <td>0~9 (숫자 1개)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">Z</td>
                  <td>1~9 (0 제외)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">N</td>
                  <td>2~9 (0,1 제외)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">.</td>
                  <td>0~9 (1개 이상)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">!</td>
                  <td>0~9 (0개 이상)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">[ ]</td>
                  <td>범위 지정 (1자리 단위)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">-</td>
                  <td>범위 ([ ] 안에서 사용)</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 font-mono font-bold">|</td>
                  <td>OR (여러 패턴 중 하나)</td>
                </tr>
              </tbody>
            </table>
            <div className="text-[10px] text-blue-600 mt-2 space-y-0.5">
              <div className="font-semibold">예시:</div>
              <div>
                <span className="font-mono bg-blue-100 px-1 rounded">00Z!</span> 국제전화 (001~009)
              </div>
              <div>
                <span className="font-mono bg-blue-100 px-1 rounded">01[016789]!</span> 휴대폰
              </div>
              <div>
                <span className="font-mono bg-blue-100 px-1 rounded">02!|031!</span> 서울 또는 경기
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern List */}
      {filteredPatterns.length === 0 ? (
        <Empty description="등록된 번호 패턴이 없습니다" />
      ) : (
        <List
          size="small"
          dataSource={filteredPatterns}
          renderItem={(item) => (
            <List.Item
              className="group"
              actions={[
                ...(onSelect
                  ? [
                      <Button key="select" type="link" size="small" onClick={() => handleSelect(item)}>
                        선택
                      </Button>,
                    ]
                  : []),
                <Tooltip key="edit" title="수정">
                  <Button type="text" size="small" icon={<Pencil className="size-3.5" />} onClick={() => handleStartEdit(item)} disabled={editing !== null} />
                </Tooltip>,
                <Popconfirm
                  key="delete"
                  title="번호 패턴 삭제"
                  description={`"${item.patternName}" 패턴을 삭제하시겠습니까?`}
                  onConfirm={() => handleDelete(item.patternId)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Tooltip title="삭제">
                    <Button type="text" size="small" danger icon={<Trash2 className="size-3.5" />} disabled={editing !== null} />
                  </Tooltip>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<span className="text-sm">{item.patternName}</span>}
                description={
                  <Typography.Text code className="text-xs">
                    {item.numPattern}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
});

NumPatternDrawer.displayName = 'NumPatternDrawer';
export default NumPatternDrawer;
