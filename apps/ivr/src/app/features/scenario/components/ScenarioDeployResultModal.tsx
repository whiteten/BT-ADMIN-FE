/**
 * 시나리오 배포 결과 모달.
 * <p>FCA `BotVersionPublishResultModal` 패턴 미러링 — publish 응답의 시스템별
 * deploy(파일전송)/apply(적용) 결과를 표시. 부분 실패도 한눈에 보이도록 한다.</p>
 *
 * ⚠ IVR BFF는 단일 래핑 — publishScenario가 payload(ScenarioPublishResult)를 직접 반환하므로
 *    FCA처럼 data.data 가 아닌 result 필드를 직접 읽는다.
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Collapse, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle, XCircle } from 'lucide-react';
import type { ScenarioPublishResult } from '../types';

export interface ScenarioDeployResultModalRef {
  open: (data: ScenarioPublishResult) => void;
  close: () => void;
}

interface ModalState {
  open: boolean;
  data: ScenarioPublishResult | null;
}

interface MergedResultItem {
  systemId: number;
  systemName: string;
  deploySuccess: boolean;
  applySuccess: boolean;
  isFail: boolean;
  /** 실패 행 표시용 사유 (성공 행은 빈 문자열). */
  reason: string;
}

const ScenarioDeployResultModal = forwardRef<ScenarioDeployResultModalRef>((_, ref) => {
  const [{ open, data }, setModalState] = useState<ModalState>({ open: false, data: null });

  useImperativeHandle(ref, () => ({
    open: (resultData: ScenarioPublishResult) => setModalState({ open: true, data: resultData }),
    close: () => setModalState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setModalState((prev) => ({ ...prev, open: false }));

  if (!data) return null;

  const { deployResults, applyResults, deploySuccessCount, deployFailCount, applySuccessCount, applyFailCount, totalCount } = data;

  const isAllSuccess = deployFailCount === 0 && applyFailCount === 0;

  const mergedResults: MergedResultItem[] = deployResults.map((deploy) => {
    const apply = applyResults.find((a) => a.systemId === deploy.systemId);
    const applySuccess = apply?.success ?? false;
    const isFail = !deploy.success || !applySuccess;
    // 사유 우선순위: 파일전송 실패(근본 원인) > 적용 실패. 업로드 실패 시 적용은 'Skipped...' 포괄 메시지뿐이므로 파일전송 메시지가 더 정확하다.
    const failSource = !deploy.success ? deploy : apply && !apply.success ? apply : undefined;
    const reason = isFail ? failSource?.message?.trim() || failSource?.errorCode || '실패 사유 없음' : '';
    return {
      systemId: deploy.systemId,
      systemName: deploy.systemName ?? `시스템 ${deploy.systemId}`,
      deploySuccess: deploy.success,
      applySuccess,
      isFail,
      reason,
    };
  });

  const statusIcon = (success: boolean) => (success ? <CheckCircle className="inline-block size-5 text-green-500" /> : <XCircle className="inline-block size-5 text-red-500" />);

  const columns: ColumnsType<MergedResultItem> = [
    {
      title: '시스템',
      dataIndex: 'systemName',
      key: 'systemName',
      width: 150,
      render: (name: string, row: MergedResultItem) => <span className={row.isFail ? 'text-red-600' : 'text-gray-800'}>{name}</span>,
    },
    { title: '파일전송', dataIndex: 'deploySuccess', key: 'deploySuccess', align: 'center', width: 72, render: statusIcon },
    { title: '적용', dataIndex: 'applySuccess', key: 'applySuccess', align: 'center', width: 64, render: statusIcon },
    {
      title: '에러메시지',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) =>
        reason ? (
          <span className="text-[12px] leading-snug text-red-500 break-words line-clamp-2" title={reason}>
            {reason}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
  ];

  const collapseItems = [
    {
      key: 'detail',
      label: '시스템별 상세',
      children: (
        <div className="flex flex-col gap-3">
          <div className="flex gap-4 text-sm">
            <span>
              파일전송: {deploySuccessCount}/{totalCount} 성공
            </span>
            <span>
              적용: {applySuccessCount}/{totalCount} 성공
            </span>
          </div>
          <Table columns={columns} dataSource={mergedResults} rowKey="systemId" pagination={false} size="small" />
        </div>
      ),
    },
  ];

  return (
    <Modal
      centered
      title="배포 결과"
      open={open}
      onCancel={handleClose}
      onOk={handleClose}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="확인"
      width={isAllSuccess ? 480 : 680}
    >
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          {isAllSuccess ? (
            <>
              <CheckCircle className="size-6 text-green-500" />
              <span>배포 성공</span>
            </>
          ) : (
            <>
              <XCircle className="size-6 text-red-500" />
              <span>
                배포 일부 실패 (파일전송 {deployFailCount}건 · 적용 {applyFailCount}건 실패)
              </span>
            </>
          )}
        </div>
        <Collapse items={collapseItems} defaultActiveKey={isAllSuccess ? [] : ['detail']} />
      </div>
    </Modal>
  );
});

ScenarioDeployResultModal.displayName = 'ScenarioDeployResultModal';

export default ScenarioDeployResultModal;
