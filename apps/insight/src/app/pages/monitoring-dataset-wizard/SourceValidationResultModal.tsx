import { forwardRef, useImperativeHandle, useState } from 'react';
import { Collapse, type CollapseProps, Modal, Tag } from 'antd';
import { CheckCircle, CircleAlert, XCircle } from 'lucide-react';
import type { ValidateSourceResult } from '../../features/monitoring/hooks/useDatasetQueries';

interface ModalState {
  open: boolean;
  data: ValidateSourceResult | null;
}

export interface SourceValidationResultModalRef {
  open: (data: ValidateSourceResult) => void;
  close: () => void;
}

/**
 * 데이터 소스 검증 결과 모달 — 봇 모듈의 ExcelImportResultModal / BotVersionPublishResultModal 패턴 채용.
 * <p>
 * 실패·경고가 있는 경우에만 노출. 통과(경고 없음)는 토스트로 가볍게 처리.
 */
const SourceValidationResultModal = forwardRef<SourceValidationResultModalRef>((_, ref) => {
  const [modalState, setModalState] = useState<ModalState>({ open: false, data: null });
  const { open, data } = modalState;

  useImperativeHandle(ref, () => ({
    open: (d) => setModalState({ open: true, data: d }),
    close: () => setModalState((p) => ({ ...p, open: false })),
  }));

  const handleClose = () => setModalState((p) => ({ ...p, open: false }));

  if (!data) return null;

  const errors = data.errors ?? [];
  const warnings = data.warnings ?? [];
  const detectedColumns = data.detectedColumns ?? [];
  const hasWarnings = data.ok && warnings.length > 0;

  // 헤더 — 봇 결과 모달과 동일 컨벤션(size-6 + text-lg font-medium)
  const header = (() => {
    if (!data.ok) {
      return { icon: <XCircle className="size-6 text-red-500" />, text: errors.length > 0 ? `검증 실패 (오류 ${errors.length}건)` : '검증 실패' };
    }
    if (hasWarnings) {
      return { icon: <CircleAlert className="size-6 text-[#faad14]" />, text: `검증 통과 (경고 ${warnings.length}건)` };
    }
    return { icon: <CheckCircle className="size-6 text-green-500" />, text: '검증 통과' };
  })();

  const collapseItems: CollapseProps['items'] = [];

  if (errors.length > 0) {
    collapseItems.push({
      key: 'errors',
      label: `오류 ${errors.length}건`,
      children: (
        <ul className="space-y-2 text-[12.5px]">
          {errors.map((e, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{i + 1}</span>
              <span className="font-mono whitespace-pre-wrap break-all leading-relaxed text-gray-800">{e}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (warnings.length > 0) {
    collapseItems.push({
      key: 'warnings',
      label: `경고 ${warnings.length}건`,
      children: (
        <ul className="space-y-2 text-[12.5px]">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2">
              <CircleAlert className="size-4 shrink-0 text-[#faad14] mt-0.5" />
              <span className="whitespace-pre-wrap break-all leading-relaxed text-gray-800">{w}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (detectedColumns.length > 0) {
    collapseItems.push({
      key: 'detected',
      label: `자동 추출된 컬럼 ${detectedColumns.length}개`,
      children: (
        <div className="flex flex-wrap gap-1.5">
          {detectedColumns.map((c) => (
            <Tag key={c.columnName} className="!m-0 !text-[11px] font-mono">
              {c.columnName} · <span className="text-gray-500">{c.dataType}</span>
            </Tag>
          ))}
        </div>
      ),
    });
  }

  // 모든 섹션을 기본 열림 — 사용자가 모달 열자마자 모든 정보 확인 가능
  const defaultActiveKey = collapseItems.map((i) => i.key as string);

  return (
    <Modal
      centered
      title="데이터 소스 검증 결과"
      open={open}
      onCancel={handleClose}
      onOk={handleClose}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="확인"
      width={720}
    >
      <div className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-lg font-medium">
          {header.icon}
          <span>{header.text}</span>
        </div>
        {collapseItems.length > 0 && <Collapse items={collapseItems} defaultActiveKey={defaultActiveKey} />}
      </div>
    </Modal>
  );
});

SourceValidationResultModal.displayName = 'SourceValidationResultModal';
export default SourceValidationResultModal;
