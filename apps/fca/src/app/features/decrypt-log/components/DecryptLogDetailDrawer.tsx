import React from 'react';
import { Descriptions, Drawer, Tag } from 'antd';
import dayjs from 'dayjs';
import { type DecryptLogItem, REASON_CODE_LABELS, RESULT_LABELS } from '../types/decryptLog.types';

interface DecryptLogDetailDrawerProps {
  open: boolean;
  item: DecryptLogItem | null;
  onClose: () => void;
}

const fmt = (v: string | number | null | undefined, fallback = '-') => {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
};

const fmtDateTime = (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-');

const resultColor = (result: string): string => {
  switch (result) {
    case 'SUCCESS':
      return 'green';
    case 'DECRYPT_FAIL':
      return 'red';
    case 'FORBIDDEN':
      return 'orange';
    case 'NOT_FOUND':
      return 'default';
    default:
      return 'default';
  }
};

const dialogRoleColor = (role: string | null): string => {
  switch (role) {
    case 'BOT':
      return 'blue';
    case 'CUSTOMER':
      return 'green';
    default:
      return 'default';
  }
};

const DecryptLogDetailDrawer: React.FC<DecryptLogDetailDrawerProps> = ({ open, item, onClose }) => {
  return (
    <Drawer open={open} onClose={onClose} title="감사 이력 상세" width={620} destroyOnHidden closable={{ placement: 'end' }}>
      {item && (
        <div className="flex flex-col gap-4">
          {/* 요약 영역 */}
          <Descriptions column={1} size="small" bordered title="요약">
            <Descriptions.Item label="열람 시각">{fmtDateTime(item.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="결과">
              <Tag color={resultColor(item.result)}>{RESULT_LABELS[item.result] ?? item.result}</Tag>
              {item.failureReason && <span className="ml-2 text-xs text-slate-500">{item.failureReason}</span>}
            </Descriptions.Item>
            <Descriptions.Item label="사유">
              <div className="flex flex-col gap-0.5">
                <span>{item.reasonCode ? (REASON_CODE_LABELS[item.reasonCode] ?? item.reasonCode) : '-'}</span>
                {item.reasonText && item.reasonText !== REASON_CODE_LABELS[item.reasonCode ?? ''] && <span className="text-xs text-slate-500 break-all">{item.reasonText}</span>}
              </div>
            </Descriptions.Item>
          </Descriptions>

          {/* 열람자 */}
          <Descriptions column={1} size="small" bordered title="열람자">
            <Descriptions.Item label="이름">{fmt(item.userName)}</Descriptions.Item>
            <Descriptions.Item label="로그인 계정">{fmt(item.userAccount)}</Descriptions.Item>
            <Descriptions.Item label="사용자 ID">{fmt(item.userId)}</Descriptions.Item>
          </Descriptions>

          {/* 대상 콜/버블 */}
          <Descriptions column={1} size="small" bordered title="대상 콜 / 버블">
            <Descriptions.Item label="UCID">
              <span className="font-mono text-xs break-all">{fmt(item.ucid)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="봇 서비스">
              {fmt(item.serviceName)}
              {item.serviceId != null && <span className="ml-2 text-xs text-slate-400">(ID: {item.serviceId})</span>}
            </Descriptions.Item>
            <Descriptions.Item label="발신번호">{fmt(item.ani)}</Descriptions.Item>
            <Descriptions.Item label="착신번호">{fmt(item.dnis)}</Descriptions.Item>
            <Descriptions.Item label="콜 시작 시각">{fmtDateTime(item.callStartTime)}</Descriptions.Item>
            <Descriptions.Item label="버블 키">
              <span className="font-mono text-xs">{fmt(item.bubbleKey)}</span>
              {item.bubbleType != null && <span className="ml-2 text-xs text-slate-400">(Type: {item.bubbleType})</span>}
            </Descriptions.Item>
            <Descriptions.Item label="화자">
              {item.dialogRole ? (
                <Tag color={dialogRoleColor(item.dialogRole)}>{item.dialogRole === 'BOT' ? '봇' : item.dialogRole === 'CUSTOMER' ? '고객' : item.dialogRole}</Tag>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="버블 시점">{fmt(item.bubbleStartTime)}</Descriptions.Item>
          </Descriptions>

          {/* 클라이언트 컨텍스트 */}
          <Descriptions column={1} size="small" bordered title="클라이언트 컨텍스트">
            <Descriptions.Item label="IP">{fmt(item.clientIp)}</Descriptions.Item>
            <Descriptions.Item label="User-Agent">
              <span className="text-xs break-all">{fmt(item.userAgent)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Trace ID">
              <span className="font-mono text-xs">{fmt(item.traceId)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Request ID">
              <span className="font-mono text-xs">{fmt(item.requestId)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Log ID">
              <span className="font-mono text-xs">{fmt(item.logId)}</span>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </Drawer>
  );
};

export default DecryptLogDetailDrawer;
