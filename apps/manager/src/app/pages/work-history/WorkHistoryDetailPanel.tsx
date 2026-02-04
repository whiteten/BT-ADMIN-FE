import { useState } from 'react';
import { Tabs } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Database, FileEdit, X, XCircle } from 'lucide-react';
import type { ApiCallDetail, DataChangeLog, IdsSyncLog, WorkHistoryDetail } from '../../features/workHistory/types/workHistory.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface Props {
  detail?: WorkHistoryDetail;
  isLoading: boolean;
  onClose: () => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle className="w-5 h-5 text-green-500" />,
  FAIL: <XCircle className="w-5 h-5 text-red-500" />,
  PARTIAL_FAIL: <AlertCircle className="w-5 h-5 text-yellow-500" />,
};

export default function WorkHistoryDetailPanel({ detail, isLoading, onClose }: Props) {
  if (isLoading) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <FallbackSpinner />
      </div>
    );
  }

  if (!detail) {
    return <div className="p-4 text-center text-gray-500">상세 정보를 불러올 수 없습니다.</div>;
  }

  const { master, apiCalls, idsLogs, dataChanges } = detail;

  return (
    <div className="p-4 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          {statusIcons[master.status]}
          <h3 className="text-lg font-semibold">상세 정보</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 마스터 정보 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-sm text-gray-700 mb-3">요청 정보</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-500">URI</span>
          <span className="font-mono text-xs break-all">
            {master.httpMethod} {master.requestUri}
          </span>

          <span className="text-gray-500">사용자</span>
          <span>
            {master.userName} ({master.userId})
          </span>

          <span className="text-gray-500">시작</span>
          <span>{dayjs(master.startedAt).format('YYYY-MM-DD HH:mm:ss')}</span>

          <span className="text-gray-500">소요시간</span>
          <span>{master.durationMs?.toLocaleString()}ms</span>

          <span className="text-gray-500">HTTP 상태</span>
          <span>{master.httpStatus}</span>

          <span className="text-gray-500">IP</span>
          <span>{master.requestIp}</span>
        </div>

        {master.errorMessage && (
          <div className="mt-3 p-2 bg-red-50 rounded text-red-700 text-xs">
            <strong>에러:</strong> {master.errorMessage}
          </div>
        )}
      </div>

      {/* 탭: API 호출 / IDS 동기화 */}
      <Tabs
        defaultActiveKey="apiCalls"
        className="flex-1"
        items={[
          {
            key: 'apiCalls',
            label: `API 호출 (${apiCalls.length})`,
            children: <ApiCallsTab apiCalls={apiCalls} />,
          },
          {
            key: 'idsLogs',
            label: (
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4" />
                IDS ({idsLogs.length})
              </span>
            ),
            children: <IdsLogsTab idsLogs={idsLogs} />,
          },
          {
            key: 'dataChanges',
            label: (
              <span className="flex items-center gap-1">
                <FileEdit className="w-4 h-4" />
                데이터 변경 ({dataChanges?.length ?? 0})
              </span>
            ),
            children: <DataChangesTab dataChanges={dataChanges ?? []} />,
          },
        ]}
      />
    </div>
  );
}

function ApiCallsTab({ apiCalls }: { apiCalls: ApiCallDetail[] }) {
  if (apiCalls.length === 0) {
    return <div className="text-center text-gray-500 py-8">API 호출 내역이 없습니다</div>;
  }

  return (
    <div className="space-y-2 overflow-auto max-h-[400px]">
      {apiCalls.map((call) => (
        <div key={call.detailId} className="p-3 border rounded-lg text-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">{call.httpMethod}</span>
              <span className="font-mono text-xs text-gray-700 break-all">{call.apiPath}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className={call.httpStatus < 400 ? 'text-green-600' : 'text-red-600'}>{call.httpStatus}</span>
            <span>{call.elapsedMs}ms</span>
            <span>{call.serviceName}</span>
          </div>
          {call.errorMessage && <div className="mt-2 text-xs text-red-600">{call.errorMessage}</div>}
        </div>
      ))}
    </div>
  );
}

function IdsLogsTab({ idsLogs }: { idsLogs: IdsSyncLog[] }) {
  if (idsLogs.length === 0) {
    return <div className="text-center text-gray-500 py-8">이 작업은 IDS 동기화 대상이 아닙니다</div>;
  }

  return (
    <div className="space-y-2 overflow-auto max-h-[400px]">
      {idsLogs.map((log) => (
        <div key={log.id} className="p-3 border rounded-lg text-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium uppercase">{log.actionType}</span>
              <span className="font-mono text-xs">{log.targetTable}</span>
            </div>
            {log.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{log.durationMs}ms</span>
            <span>{dayjs(log.createdAt).format('HH:mm:ss')}</span>
          </div>
          {log.errorMessage && <div className="mt-2 text-xs text-red-600">{log.errorMessage}</div>}
        </div>
      ))}
    </div>
  );
}

function DataChangesTab({ dataChanges }: { dataChanges: DataChangeLog[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (dataChanges.length === 0) {
    return <div className="text-center text-gray-500 py-8">이 작업에서 변경된 데이터가 없습니다</div>;
  }

  const actionColors: Record<string, string> = {
    INSERT: 'bg-green-100 text-green-800',
    UPDATE: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  const formatJson = (jsonStr: string | null): string => {
    if (!jsonStr) return '-';
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="space-y-2 overflow-auto max-h-[400px]">
      {dataChanges.map((change) => (
        <div key={change.id} className="border rounded-lg text-sm">
          <button
            type="button"
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
            onClick={() => setExpandedId(expandedId === change.id ? null : change.id)}
          >
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[change.actionType] ?? 'bg-gray-100'}`}>{change.actionType}</span>
              <span className="font-mono text-xs">{change.tableName}</span>
              <span className="text-gray-400 text-xs">#{change.rowKey}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{dayjs(change.createdAt).format('HH:mm:ss')}</span>
              {expandedId === change.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {expandedId === change.id && (
            <div className="px-3 pb-3 space-y-2 border-t bg-gray-50">
              {change.beforeData && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mt-2 mb-1">변경 전</div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">{formatJson(change.beforeData)}</pre>
                </div>
              )}
              {change.afterData && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mt-2 mb-1">변경 후</div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">{formatJson(change.afterData)}</pre>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">by {change.createdBy}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
