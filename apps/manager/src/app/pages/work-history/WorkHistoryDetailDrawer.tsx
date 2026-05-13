import { forwardRef, useImperativeHandle, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Button, Drawer, Tabs } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Clock, Database, FileEdit, Globe, User, XCircle, Zap } from 'lucide-react';
import { useWorkHistoryDetail } from '../../features/workHistory/hooks/useWorkHistoryQueries';
import type { ApiCallDetail, DataChangeLog, IdsSyncLog, WorkHistoryDetail } from '../../features/workHistory/types/workHistory.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface WorkHistoryDetailDrawerRef {
  open: (workId: string) => void;
  close: () => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  SUCCESS: {
    icon: <CheckCircle className="w-5 h-5" />,
    label: '성공',
    className: 'text-green-600 bg-green-50',
  },
  FAIL: {
    icon: <XCircle className="w-5 h-5" />,
    label: '실패',
    className: 'text-red-600 bg-red-50',
  },
  PARTIAL_FAIL: {
    icon: <AlertCircle className="w-5 h-5" />,
    label: '부분실패',
    className: 'text-yellow-600 bg-yellow-50',
  },
};

export const WorkHistoryDetailDrawer = forwardRef<WorkHistoryDetailDrawerRef>(function WorkHistoryDetailDrawer(_, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [workId, setWorkId] = useState<string | null>(null);

  const { data: detail, isLoading } = useWorkHistoryDetail(workId);

  useImperativeHandle(ref, () => ({
    open: (id: string) => {
      setWorkId(id);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setWorkId(null);
    },
  }));

  const handleClose = () => {
    setIsOpen(false);
    setWorkId(null);
  };

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="작업 상세 정보"
      closable={{ placement: 'end' }}
      size={900}
      destroyOnHidden
      classNames={{
        body: '!p-0 !rounded-none',
      }}
      footer={
        <div className="flex items-center justify-end">
          <Button onClick={handleClose}>닫기</Button>
        </div>
      }
    >
      <div className="h-full overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <FallbackSpinner />
          </div>
        ) : !detail ? (
          <div className="text-center text-gray-500 py-8">상세 정보를 불러올 수 없습니다.</div>
        ) : (
          <DrawerContent detail={detail} />
        )}
      </div>
    </Drawer>
  );
});

function DrawerContent({ detail }: { detail: WorkHistoryDetail }) {
  const { master, apiCalls, idsLogs, dataChanges } = detail;

  return (
    <div className="space-y-6">
      {/* 상태 배지 */}
      {master && (
        <div className="flex items-center gap-3 pb-4 border-b">
          <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[master.status]?.className || 'bg-gray-100'}`}>
            {statusConfig[master.status]?.icon}
            {statusConfig[master.status]?.label}
          </span>
        </div>
      )}

      {/* 마스터 정보 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          icon={<Globe className="w-4 h-4 text-blue-500" />}
          label="요청"
          value={
            <span className="font-mono text-xs">
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded mr-2">{master.httpMethod}</span>
              {master.requestUri}
            </span>
          }
          className="col-span-2 md:col-span-4"
        />
        <InfoCard icon={<User className="w-4 h-4 text-purple-500" />} label="사용자" value={`${master.userName} (${master.userId})`} />
        <InfoCard icon={<Clock className="w-4 h-4 text-orange-500" />} label="시작 시각" value={master.startedAt ? dayjs(master.startedAt).format('YYYY-MM-DD HH:mm:ss') : '-'} />
        <InfoCard icon={<Zap className="w-4 h-4 text-yellow-500" />} label="소요 시간" value={`${master.durationMs?.toLocaleString() ?? '-'}ms`} />
        <InfoCard icon={<Globe className="w-4 h-4 text-gray-500" />} label="클라이언트 IP" value={master.requestIp} />
      </div>

      {/* 에러 메시지 */}
      {master.errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
            <XCircle className="w-4 h-4" />
            오류 발생
          </div>
          <p className="text-red-600 text-sm">{master.errorMessage}</p>
          {master.errorCode && <p className="text-red-500 text-xs mt-1">코드: {master.errorCode}</p>}
        </div>
      )}

      {/* 탭 콘텐츠 */}
      <div className="flex-1 min-h-0">
        <Tabs
          defaultActiveKey="apiCalls"
          className="[&_.ant-tabs-content]:min-h-[280px]"
          items={[
            {
              key: 'apiCalls',
              label: (
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  API 호출 ({apiCalls.length})
                </span>
              ),
              children: <ApiCallsTab apiCalls={apiCalls} />,
            },
            {
              key: 'idsLogs',
              label: (
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  IDS 동기화 ({idsLogs.length})
                </span>
              ),
              children: <IdsLogsTab idsLogs={idsLogs} />,
            },
            {
              key: 'dataChanges',
              label: (
                <span className="flex items-center gap-2">
                  <FileEdit className="w-4 h-4" />
                  데이터 변경 ({dataChanges?.length ?? 0})
                </span>
              ),
              children: <DataChangesTab dataChanges={dataChanges ?? []} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900 break-all">{value}</div>
    </div>
  );
}

function ApiCallsTab({ apiCalls }: { apiCalls: ApiCallDetail[] }) {
  if (apiCalls.length === 0) {
    return <EmptyState message="API 호출 내역이 없습니다" />;
  }

  return (
    <div className="space-y-2">
      {apiCalls.map((call) => (
        <div key={call.detailId} className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-medium">{call.httpMethod}</span>
              <span className="font-mono text-sm text-gray-700">{call.apiPath}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${call.httpStatus < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {call.httpStatus}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {call.elapsedMs}ms
            </span>
            <span>{call.serviceName}</span>
          </div>
          {call.errorMessage && <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">{call.errorMessage}</div>}
        </div>
      ))}
    </div>
  );
}

function IdsLogsTab({ idsLogs }: { idsLogs: IdsSyncLog[] }) {
  if (idsLogs.length === 0) {
    return <EmptyState message="IDS 동기화 대상이 아닙니다" />;
  }

  return (
    <div className="space-y-2">
      {idsLogs.map((log) => (
        <div key={log.id} className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium uppercase">{log.actionType}</span>
              <span className="font-mono text-sm">{log.targetTable}</span>
            </div>
            {log.success ? (
              <span className="flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle className="w-4 h-4" />
                성공
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 text-xs">
                <XCircle className="w-4 h-4" />
                실패
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{log.durationMs}ms</span>
            <span>{dayjs(log.createdAt).format('HH:mm:ss')}</span>
          </div>
          {log.errorMessage && <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">{log.errorMessage}</div>}
        </div>
      ))}
    </div>
  );
}

function DataChangesTab({ dataChanges }: { dataChanges: DataChangeLog[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (dataChanges.length === 0) {
    return <EmptyState message="변경된 데이터가 없습니다" />;
  }

  const actionColors: Record<string, string> = {
    INSERT: 'bg-green-100 text-green-700',
    UPDATE: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  const formatJson = (jsonStr: string | null): string => {
    if (!jsonStr) return '';
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="space-y-2">
      {dataChanges.map((change) => (
        <div key={change.id} className="border rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
          >
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[change.actionType] ?? 'bg-gray-100'}`}>{change.actionType}</span>
              <span className="font-mono text-sm font-medium">{change.tableName}</span>
              <span className="text-gray-400 text-xs">ID: {change.rowKey}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{change.createdBy}</span>
              <span>{dayjs(change.createdAt).format('HH:mm:ss')}</span>
              {expandedId === change.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {expandedId === change.id && (
            <div className="border-t">
              {change.actionType === 'INSERT' ? (
                <div className="p-4">
                  <div className="text-xs font-medium text-green-600 mb-2">새로 추가된 데이터</div>
                  <pre className="text-xs bg-green-50 p-3 rounded border border-green-200 overflow-auto max-h-48">{formatJson(change.afterData)}</pre>
                </div>
              ) : change.actionType === 'DELETE' ? (
                <div className="p-4">
                  <div className="text-xs font-medium text-red-600 mb-2">삭제된 데이터</div>
                  <pre className="text-xs bg-red-50 p-3 rounded border border-red-200 overflow-auto max-h-48">{formatJson(change.beforeData)}</pre>
                </div>
              ) : (
                <div className="diff-viewer-wrapper">
                  <ReactDiffViewer
                    oldValue={formatJson(change.beforeData)}
                    newValue={formatJson(change.afterData)}
                    splitView={true}
                    compareMethod={DiffMethod.WORDS}
                    leftTitle="변경 전"
                    rightTitle="변경 후"
                    styles={{
                      variables: {
                        light: {
                          diffViewerBackground: '#fff',
                          addedBackground: '#e6ffec',
                          addedColor: '#24292f',
                          removedBackground: '#ffebe9',
                          removedColor: '#24292f',
                          wordAddedBackground: '#abf2bc',
                          wordRemovedBackground: '#ff8182',
                          addedGutterBackground: '#ccffd8',
                          removedGutterBackground: '#ffd7d5',
                          gutterBackground: '#f6f8fa',
                          gutterBackgroundDark: '#f0f1f2',
                          highlightBackground: '#fffbdd',
                          highlightGutterBackground: '#fff5b1',
                        },
                      },
                      contentText: {
                        fontSize: '12px',
                        fontFamily: 'ui-monospace, monospace',
                      },
                      titleBlock: {
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '8px 12px',
                        background: '#f6f8fa',
                      },
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Database className="w-10 h-10 mb-3 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

export default WorkHistoryDetailDrawer;
