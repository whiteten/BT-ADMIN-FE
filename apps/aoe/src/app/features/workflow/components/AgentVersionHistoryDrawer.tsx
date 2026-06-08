import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Input, Popconfirm, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { Check, History, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { agentQueryKeys } from '../../agent-config/hooks/useAgentQueries';
import type { AgentItem, AoeDeployFlag } from '../../agent-config/types';
import { useDeleteAgentVersion, useGetAgentVersions, useRestoreAgentVersion, useUpdateAgentVersion, workflowQueryKeys } from '../hooks/useWorkflowQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface AgentVersionHistoryDrawerRef {
  open: () => void;
  close: () => void;
}

interface AgentVersionHistoryDrawerProps {
  agentId: string;
}

const AgentVersionHistoryDrawer = forwardRef<AgentVersionHistoryDrawerRef, AgentVersionHistoryDrawerProps>(({ agentId }, ref) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingVersionNo, setEditingVersionNo] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  const { data: versions = [], isFetching } = useGetAgentVersions({
    params: { agentId },
    queryOptions: { enabled: open && !!agentId },
  });

  const { mutate: updateVersion, isPending: isSavingName } = useUpdateAgentVersion({
    mutationOptions: {
      onSuccess: () => {
        setEditingVersionNo(null);
        queryClient.invalidateQueries({ queryKey: workflowQueryKeys.versions(agentId).queryKey });
      },
      onError: (error) => {
        Log.warn('updateAgentVersion failed', error);
        toast.error('버전 이름 저장에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteVersion, isPending: isDeleting } = useDeleteAgentVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('버전을 삭제했습니다.');
        queryClient.invalidateQueries({ queryKey: workflowQueryKeys.versions(agentId).queryKey });
      },
      onError: (error) => {
        Log.warn('deleteAgentVersion failed', error);
        toast.error('버전 삭제에 실패했습니다.');
      },
    },
  });

  const startEditName = (versionNo: number, currentMemo?: string) => {
    setEditingVersionNo(versionNo);
    setDraftName(currentMemo ?? '');
  };

  const saveName = (versionNo: number) => {
    updateVersion({ params: { agentId, versionNo }, data: { memo: draftName.trim() } });
  };

  const { mutate: restoreVersion, isPending: isRestoring } = useRestoreAgentVersion({
    mutationOptions: {
      onSuccess: () => {
        toast.success('해당 버전으로 복원했습니다. 엔진에 반영하려면 다시 배포하세요.');
        // 복원된 그래프로 캔버스 갱신
        queryClient.invalidateQueries({ queryKey: workflowQueryKeys.graph(agentId).queryKey });
        // 복원 시 미배포(0) 로 되돌아가므로 배포 상태 즉시 반영 (테스트 버튼 비활성화)
        queryClient.setQueryData<AgentItem>(agentQueryKeys.getAgent({ agentId }).queryKey, (old) => (old ? { ...old, aoeDeployFlag: 0 as AoeDeployFlag } : old));
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgent({ agentId }).queryKey });
        setOpen(false);
      },
      onError: (error) => {
        Log.warn('restoreAgentVersion failed', error);
        toast.error('버전 복원에 실패했습니다.');
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  const latestVersionNo = versions.length > 0 ? versions[0].versionNo : undefined;

  return (
    <Drawer title="배포 이력" open={open} onClose={() => setOpen(false)} closable={{ placement: 'end' }} styles={{ wrapper: { width: 480 } }} destroyOnHidden>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-400">
          배포할 때마다 워크플로우 스냅샷이 버전으로 기록됩니다. 과거 버전을 불러오면 현재 편집본이 그 버전으로 교체되며, 엔진 반영은 다시 배포해야 적용됩니다.
        </p>

        {isFetching ? (
          <div className="flex justify-center py-10">
            <FallbackSpinner />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 border border-dashed border-gray-200 rounded-lg">
            <History className="size-6 text-gray-300" />
            <p className="text-sm text-gray-400">배포 이력이 없습니다.</p>
            <p className="text-xs text-gray-400">배포하면 버전이 기록됩니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map((version) => {
              const isLatest = version.versionNo === latestVersionNo;
              const isProtected = !!version.memo;
              const isEditing = editingVersionNo === version.versionNo;
              return (
                <div key={version.versionId} className="p-3 border border-gray-200 rounded-lg bg-white hover:border-[var(--color-bt-primary)]/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">v{version.versionNo}</span>
                      {isLatest && <Tag color="blue">최신</Tag>}
                      {version.restoredFromVersionNo != null && (
                        <Tooltip title={`v${version.restoredFromVersionNo} 내용을 불러와 다시 배포한 버전입니다.`}>
                          <Tag color="purple">v{version.restoredFromVersionNo} 복원</Tag>
                        </Tooltip>
                      )}
                      {isProtected && (
                        <Tooltip title="이름이 있는 버전은 자동 정리(보존 개수 제한)에서 제외됩니다.">
                          <Tag color="gold">보존</Tag>
                        </Tooltip>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Popconfirm
                        title="이 버전으로 복원할까요?"
                        description="현재 편집본이 이 버전으로 교체됩니다."
                        okText="복원"
                        cancelText="취소"
                        okButtonProps={{ loading: isRestoring }}
                        onConfirm={() => restoreVersion({ agentId, versionNo: version.versionNo })}
                      >
                        <Tooltip title={isLatest ? '현재 버전입니다.' : '이 버전으로 되돌립니다.'}>
                          <Button size="small" icon={<RotateCcw size={13} />} disabled={isLatest}>
                            불러오기
                          </Button>
                        </Tooltip>
                      </Popconfirm>
                      <Popconfirm
                        title="이 버전을 삭제할까요?"
                        description="삭제하면 이 버전으로 다시 복원할 수 없습니다."
                        okText="삭제"
                        cancelText="취소"
                        okButtonProps={{ danger: true, loading: isDeleting }}
                        onConfirm={() => deleteVersion({ agentId, versionNo: version.versionNo })}
                      >
                        <Button size="small" type="text" danger icon={<Trash2 size={13} />} aria-label="이 버전 삭제" />
                      </Popconfirm>
                    </span>
                  </div>

                  {/* 버전 이름(메모) — 인라인 편집 */}
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Input
                        size="small"
                        autoFocus
                        value={draftName}
                        maxLength={1000}
                        placeholder="버전 이름 (예: 운영 배포본)"
                        onChange={(e) => setDraftName(e.target.value)}
                        onPressEnter={() => saveName(version.versionNo)}
                      />
                      <Button size="small" type="text" icon={<Check size={14} />} loading={isSavingName} onClick={() => saveName(version.versionNo)} />
                      <Button size="small" type="text" icon={<X size={14} />} onClick={() => setEditingVersionNo(null)} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`text-sm truncate ${version.memo ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>{version.memo || '이름 없음'}</span>
                      <Tooltip title="이름 지정 (이름을 달면 보존됨)">
                        <Button
                          size="small"
                          type="text"
                          className="!px-1 text-gray-400 hover:!text-[var(--color-bt-primary)]"
                          icon={<Pencil size={12} />}
                          onClick={() => startEditName(version.versionNo, version.memo)}
                        />
                      </Tooltip>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">{version.workTime ? dayjs(version.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
});

AgentVersionHistoryDrawer.displayName = 'AgentVersionHistoryDrawer';
export default AgentVersionHistoryDrawer;
