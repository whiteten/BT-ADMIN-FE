import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Empty, Input, Select } from 'antd';
import { Check, Edit2, FileText, Hash, Plus, Save, Search, Tags, Trash2, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import {
  knowledgeQueryKeys,
  useDeleteKnowledgeFileMeta,
  useGetKnowledgeChunks,
  useGetKnowledgeFileMeta,
  useGetKnowledgeMetadata,
  useUpdateKnowledgeChunk,
  useUpsertKnowledgeFileMeta,
} from '../hooks/useKnowledgeQueries';
import type { KnowledgeChunkItem } from '../types';
import ExpandableChunkText from './ExpandableChunkText';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface KnowledgeChunkDrawerRef {
  open: (params: { fileId: string; fileName: string; documentId: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  fileId: string;
  fileName: string;
  documentId: string;
}

interface ChunkMeta {
  chunk_index?: number | string;
  chunk_characters?: number | string;
  file_type?: string;
  filename?: string;
}

function parseChunkMeta(raw?: string): ChunkMeta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ChunkMeta;
  } catch {
    return {};
  }
}

function getChunkCharacters(chunk: KnowledgeChunkItem): number {
  if (chunk.chunkCharacters != null) return chunk.chunkCharacters;
  const meta = parseChunkMeta(chunk.metaData);
  const parsed = Number(meta.chunk_characters);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : chunk.chunk.length;
}

const KnowledgeChunkDrawer = forwardRef<KnowledgeChunkDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, fileId: '', fileName: '', documentId: '' });
  const [search, setSearch] = useState('');
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [metaPanelOpen, setMetaPanelOpen] = useState(false);

  // 파일 메타데이터 추가/편집 상태
  const [isAddingMeta, setIsAddingMeta] = useState(false);
  const [newMetaId, setNewMetaId] = useState<string | undefined>();
  const [newMetaValue, setNewMetaValue] = useState('');
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editMetaValue, setEditMetaValue] = useState('');

  const { open, fileId, fileName, documentId } = drawerState;

  const { data: chunks, isFetching: isChunksFetching } = useGetKnowledgeChunks({
    params: { fileId },
    queryOptions: { enabled: open && !!fileId },
  });
  const { data: fileMetas, isFetching: isMetaFetching } = useGetKnowledgeFileMeta({
    params: { fileId },
    queryOptions: { enabled: open && !!fileId },
  });
  const { data: metaSchemas } = useGetKnowledgeMetadata({
    params: { documentId },
    queryOptions: { enabled: open && !!documentId },
  });

  const chunkList = chunks ?? [];
  const metaList = fileMetas ?? [];

  // 청크 본문은 장문이라 fuzzy(흩어진 글자 매칭)가 오탐을 내므로 substring 검색을 사용한다.
  const keyword = search.trim().toLowerCase();
  const filteredChunks = keyword ? chunkList.filter((c) => c.chunk.toLowerCase().includes(keyword)) : chunkList;

  const invalidateChunks = () => queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeChunks({ fileId }).queryKey });
  const invalidateFileMeta = () => queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeFileMeta({ fileId }).queryKey });

  const { mutate: updateChunk, isPending: isSavingChunk } = useUpdateKnowledgeChunk({
    mutationOptions: {
      onSuccess: () => {
        toast.success('청크가 수정되었습니다.');
        invalidateChunks();
        setEditingChunkId(null);
      },
      onError: (error) => {
        Log.warn('updateChunk failed', error);
        toast.error('청크 수정에 실패했습니다.');
      },
    },
  });

  const { mutate: upsertFileMeta, isPending: isSavingMeta } = useUpsertKnowledgeFileMeta({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메타데이터가 저장되었습니다.');
        invalidateFileMeta();
        setIsAddingMeta(false);
        setNewMetaId(undefined);
        setNewMetaValue('');
        setEditingMetaId(null);
        setEditMetaValue('');
      },
      onError: (error) => {
        Log.warn('upsertFileMeta failed', error);
        toast.error('메타데이터 저장에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteFileMeta } = useDeleteKnowledgeFileMeta({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메타데이터가 삭제되었습니다.');
        invalidateFileMeta();
      },
      onError: (error) => {
        Log.warn('deleteFileMeta failed', error);
        toast.error('메타데이터 삭제에 실패했습니다.');
      },
    },
  });

  const resetState = () => {
    setSearch('');
    setEditingChunkId(null);
    setEditedContent('');
    setMetaPanelOpen(false);
    setIsAddingMeta(false);
    setNewMetaId(undefined);
    setNewMetaValue('');
    setEditingMetaId(null);
    setEditMetaValue('');
  };

  useImperativeHandle(ref, () => ({
    open: (params) => {
      resetState();
      setDrawerState({ open: true, ...params });
    },
    close: () => setDrawerState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setDrawerState((prev) => ({ ...prev, open: false }));

  const handleStartEditChunk = (chunk: KnowledgeChunkItem) => {
    setEditingChunkId(chunk.fileChunkId);
    setEditedContent(chunk.chunk);
  };

  const handleCancelEditChunk = () => {
    setEditingChunkId(null);
    setEditedContent('');
  };

  const handleSaveChunk = (chunk: KnowledgeChunkItem) => {
    if (!editedContent.trim()) {
      toast.warning('청크 내용을 입력해 주세요.');
      return;
    }
    updateChunk({ fileChunkId: chunk.fileChunkId, chunk: editedContent.trim() });
  };

  // 아직 값이 설정되지 않은 메타 스키마만 추가 후보로 노출
  const availableSchemas = (metaSchemas ?? []).filter((s) => !metaList.some((m) => m.metaId === s.metaId));

  const handleAddMeta = () => {
    if (!newMetaId || !newMetaValue.trim()) {
      toast.warning('메타데이터와 값을 입력해 주세요.');
      return;
    }
    upsertFileMeta({ fileId, metaId: newMetaId, metaValue: newMetaValue.trim() });
  };

  const handleSaveEditMeta = (metaId: string) => {
    if (!editMetaValue.trim()) {
      toast.warning('값을 입력해 주세요.');
      return;
    }
    upsertFileMeta({ fileId, metaId, metaValue: editMetaValue.trim() });
  };

  return (
    <Drawer
      title={
        <div className="flex flex-col gap-0.5">
          <span>청크 / 메타데이터</span>
          <span className="flex items-center gap-1.5 text-xs font-normal text-white/70">
            <FileText className="size-3 shrink-0" />
            <span className="truncate">{fileName}</span>
          </span>
        </div>
      }
      extra={
        <Button
          size="small"
          icon={<Tags className="size-3.5" />}
          onClick={() => setMetaPanelOpen((prev) => !prev)}
          className={
            metaPanelOpen ? '!bg-white !text-[var(--color-bt-primary)] !border-white' : '!bg-transparent !text-white !border-white/50 hover:!bg-white/15 hover:!border-white'
          }
        >
          메타데이터{metaList.length > 0 ? ` ${metaList.length}` : ''}
        </Button>
      }
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      destroyOnHidden
      styles={{
        wrapper: { width: metaPanelOpen ? 1080 : 760 },
        body: { display: 'flex', gap: '16px', padding: '20px', height: '100%', overflow: 'hidden' },
      }}
    >
      {/* 청크 리스트 */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <header className="flex items-center justify-between gap-2 shrink-0">
          <span className="text-sm font-semibold text-gray-700">
            청크 <span className="text-[var(--color-bt-primary)]">{chunkList.length}</span>개
          </span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="청크 내용 검색"
            prefix={<Search className="size-3.5 text-gray-400" />}
            allowClear
            className="max-w-[280px]"
          />
        </header>

        <div className="flex flex-col gap-2.5 flex-1 overflow-auto pr-1">
          {isChunksFetching ? (
            <FallbackSpinner size={36} tip="청크를 불러오는 중..." />
          ) : filteredChunks.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <Empty description={search.trim() ? '검색 결과가 없습니다.' : '청크가 없습니다.'} />
            </div>
          ) : (
            filteredChunks.map((chunk) => {
              const isEditing = editingChunkId === chunk.fileChunkId;
              return (
                <div key={chunk.fileChunkId} className="shrink-0 rounded-lg border border-gray-200 bg-white transition-all hover:border-[var(--color-bt-primary)]/40">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 bg-gray-50/70 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                        <Hash className="size-3" />
                        {chunk.chunkIndex}
                      </span>
                      <span className="text-xs text-gray-400">{getChunkCharacters(chunk).toLocaleString()}자</span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Button type="primary" size="small" icon={<Save className="size-3.5" />} loading={isSavingChunk} onClick={() => handleSaveChunk(chunk)}>
                          저장
                        </Button>
                        <Button size="small" icon={<X className="size-3.5" />} disabled={isSavingChunk} onClick={handleCancelEditChunk}>
                          취소
                        </Button>
                      </div>
                    ) : (
                      <Button size="small" icon={<Edit2 className="size-3.5" />} onClick={() => handleStartEditChunk(chunk)}>
                        편집
                      </Button>
                    )}
                  </div>
                  <div className="p-3.5">
                    {isEditing ? (
                      <Input.TextArea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} autoSize={{ minRows: 6, maxRows: 16 }} className="text-sm" />
                    ) : (
                      <ExpandableChunkText text={chunk.chunk} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 파일 메타데이터 — 토글 시에만 노출 */}
      {metaPanelOpen && (
        <div className="flex flex-col gap-2 w-[300px] shrink-0 overflow-auto pl-4 border-l border-gray-100">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-gray-700">메타데이터 값 설정</h3>
            {availableSchemas.length > 0 && !isAddingMeta && (
              <Button size="small" icon={<Plus className="size-3.5" />} onClick={() => setIsAddingMeta(true)}>
                추가
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {isMetaFetching ? (
              <p className="text-xs text-gray-400 py-2">메타데이터를 불러오는 중...</p>
            ) : metaList.length === 0 && !isAddingMeta ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50/60">
                <Tags className="size-6 text-gray-300" />
                <p className="text-xs text-gray-400">설정된 파일 메타데이터가 없습니다.</p>
              </div>
            ) : (
              metaList.map((meta) => {
                const isEditing = editingMetaId === meta.fileMetaId;
                return (
                  <div key={meta.fileMetaId} className="group flex flex-col gap-2 p-3 rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium font-mono text-gray-700">{meta.metaName ?? meta.metaId}</span>
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMetaId(meta.fileMetaId);
                              setEditMetaValue(meta.metaValue);
                            }}
                          >
                            <Edit2 className="size-3.5 text-[var(--color-bt-primary)] hover:cursor-pointer" />
                          </button>
                          <button type="button" onClick={() => deleteFileMeta({ fileMetaId: meta.fileMetaId })}>
                            <Trash2 className="size-3.5 text-red-500 hover:cursor-pointer" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Input value={editMetaValue} onChange={(e) => setEditMetaValue(e.target.value)} size="small" autoFocus />
                        <Button type="primary" size="small" icon={<Check className="size-3.5" />} loading={isSavingMeta} onClick={() => handleSaveEditMeta(meta.metaId)} />
                        <Button size="small" icon={<X className="size-3.5" />} disabled={isSavingMeta} onClick={() => setEditingMetaId(null)} />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-800 break-all">{meta.metaValue}</span>
                    )}
                  </div>
                );
              })
            )}

            {isAddingMeta && (
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-[var(--color-bt-primary)]/40 bg-[var(--color-bt-primary-soft)]/40">
                <Select
                  value={newMetaId}
                  onChange={setNewMetaId}
                  placeholder="메타데이터 선택"
                  size="small"
                  options={availableSchemas.map((s) => ({ label: `${s.metaName} (${s.metaType})`, value: s.metaId }))}
                />
                <Input value={newMetaValue} onChange={(e) => setNewMetaValue(e.target.value)} placeholder="값을 입력하세요." size="small" />
                <div className="flex items-center gap-1.5">
                  <Button type="primary" size="small" block loading={isSavingMeta} onClick={handleAddMeta}>
                    저장
                  </Button>
                  <Button
                    size="small"
                    icon={<X className="size-3.5" />}
                    disabled={isSavingMeta}
                    onClick={() => {
                      setIsAddingMeta(false);
                      setNewMetaId(undefined);
                      setNewMetaValue('');
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
});

KnowledgeChunkDrawer.displayName = 'KnowledgeChunkDrawer';
export default KnowledgeChunkDrawer;
