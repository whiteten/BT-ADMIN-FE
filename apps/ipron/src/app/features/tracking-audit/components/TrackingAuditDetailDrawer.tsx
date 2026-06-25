/**
 * 트래킹 조회이력 상세 Drawer — CRITERIA_JSON 원본 / 사유 / 승인 정보 표시.
 */
import { Descriptions, Drawer, Tag } from 'antd';
import { useGetTrackingAuditDetail } from '../hooks/useTrackingAuditQueries';
import type { TrackingAuditAction } from '../types/trackingAudit.types';

interface Props {
  open: boolean;
  auditId: number | null;
  onClose: () => void;
}

const ACTION_LABEL: Record<TrackingAuditAction, { label: string; color: string }> = {
  SEARCH: { label: '검색', color: 'blue' },
  EXPORT: { label: '다운로드', color: 'orange' },
  DETAIL_VIEW: { label: '상세조회', color: 'purple' },
};

export default function TrackingAuditDetailDrawer({ open, auditId, onClose }: Props) {
  const detailQ = useGetTrackingAuditDetail(open ? auditId : null);
  const audit = detailQ.data;

  return (
    <Drawer title="조회이력 상세" placement="right" width={520} open={open} onClose={onClose}>
      {!audit ? (
        <div className="text-center text-gray-400 py-12">{detailQ.isLoading ? '불러오는 중...' : '선택된 이력이 없습니다'}</div>
      ) : (
        <>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="시각">{audit.workTime ? new Date(audit.workTime).toLocaleString('ko-KR') : '-'}</Descriptions.Item>
            <Descriptions.Item label="사용자">{audit.userName ?? `#${audit.userId}`}</Descriptions.Item>
            <Descriptions.Item label="액션">
              <Tag color={ACTION_LABEL[audit.actionType]?.color}>{ACTION_LABEL[audit.actionType]?.label ?? audit.actionType}</Tag>
              {audit.trackingMode && <Tag>{audit.trackingMode.replace('_FRONT', '')}</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="요약">{audit.criteriaSummary}</Descriptions.Item>
            {audit.resultCount != null && <Descriptions.Item label="결과 건수">{audit.resultCount.toLocaleString()}</Descriptions.Item>}
            {audit.exportFormat && (
              <Descriptions.Item label="다운로드">
                {audit.exportFormat} · {(audit.exportBytes ?? 0).toLocaleString()} bytes
              </Descriptions.Item>
            )}
            {audit.targetUcid && <Descriptions.Item label="대상 UCID">{audit.targetUcid}</Descriptions.Item>}
            {audit.reason && (
              <Descriptions.Item label="사유">
                <div className="whitespace-pre-wrap">{audit.reason}</div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="승인">{audit.approvalStatus ?? '-'}</Descriptions.Item>
          </Descriptions>
          {audit.criteriaJson && (
            <div className="mt-4">
              <div className="text-[11px] font-semibold text-gray-500 mb-1">CRITERIA_JSON (원본)</div>
              <pre className="bg-gray-50 border border-gray-200 rounded p-2 text-[11px] font-mono text-gray-700 overflow-auto max-h-80">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(audit.criteriaJson), null, 2);
                  } catch {
                    return audit.criteriaJson;
                  }
                })()}
              </pre>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
