import { useEffect, useState } from 'react';
import { Input, Modal, Radio } from 'antd';
import { Lock, ShieldAlert } from 'lucide-react';

const { TextArea } = Input;

/**
 * 사전 정의된 열람 사유 프리셋.
 * `code`는 서버 감사 로그 테이블(`REASON_CODE`)에 그대로 저장되고,
 * `label`은 표시용 + 서버 `REASON_TEXT`에 복제 저장됩니다.
 * `CUSTOM` 선택 시 사용자가 자유 입력한 텍스트가 `REASON_TEXT`로 전송됩니다.
 */
const REASON_PRESETS = [
  { code: 'MINWON', label: '민원 확인' },
  { code: 'QUALITY', label: '품질 검수' },
  { code: 'SECURITY', label: '보안 감사' },
  { code: 'LEGAL', label: '법적 대응' },
  { code: 'CUSTOMER', label: '고객 요청' },
  { code: 'CUSTOM', label: '기타(직접 입력)' },
] as const;

export interface BubbleDecryptReason {
  /** 서버 `REASON_CODE` 컬럼 (프리셋 코드) */
  reasonCode: string;
  /** 서버 `REASON_TEXT` 컬럼 (프리셋 라벨 또는 자유입력) */
  reasonText: string;
}

interface BubbleDecryptReasonModalProps {
  open: boolean;
  loading?: boolean;
  /** 닫기(취소) 콜백 */
  onCancel: () => void;
  /** 확인 콜백 — 사유 코드 + 사유 텍스트 전달 */
  onConfirm: (reason: BubbleDecryptReason) => void;
}

/**
 * 암호화 버블 복호화 사유 입력 모달.
 * 감사 로그에 남길 사유를 드롭다운 프리셋 또는 자유 입력으로 받습니다.
 * '기타' 선택 시 최소 2자 이상의 자유 입력이 필수입니다.
 */
export default function BubbleDecryptReasonModal({ open, loading, onCancel, onConfirm }: BubbleDecryptReasonModalProps) {
  const [selectedCode, setSelectedCode] = useState<string>(REASON_PRESETS[0].code);
  const [customReason, setCustomReason] = useState<string>('');

  // 모달이 열릴 때마다 초기 상태로 리셋 (이전 입력값 잔존 방지)
  useEffect(() => {
    if (open) {
      setSelectedCode(REASON_PRESETS[0].code);
      setCustomReason('');
    }
  }, [open]);

  const isCustom = selectedCode === 'CUSTOM';
  const trimmedCustom = customReason.trim();
  const canConfirm = isCustom ? trimmedCustom.length >= 2 : true;

  const handleOk = () => {
    if (!canConfirm) return;
    const preset = REASON_PRESETS.find((p) => p.code === selectedCode);
    const reasonText = isCustom ? trimmedCustom : (preset?.label ?? selectedCode);
    onConfirm({ reasonCode: selectedCode, reasonText });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="열람"
      cancelText="취소"
      okButtonProps={{ disabled: !canConfirm, loading, danger: true, icon: <Lock size={13} /> }}
      title={
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 border border-amber-200">
            <ShieldAlert size={15} className="text-amber-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">암호화 대화 열람</span>
            <span className="text-[11px] font-normal text-slate-400">감사 로그에 기록되는 작업입니다</span>
          </div>
        </div>
      }
      width={480}
      centered
      destroyOnHidden
      mask={{ closable: !loading }}
      closable={!loading}
    >
      <div className="flex flex-col gap-4 py-2">
        {/* 감사 안내 배너 */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50/60 border border-amber-100 rounded-md">
          <ShieldAlert size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-amber-800">
            선택하신 버블은 고객 개인정보가 포함될 수 있는 <strong>암호화된 대화</strong>입니다. 열람 이력(사용자 ID · 열람 시각 · 사유)이 기록되며, 부적절한 열람은 추후 감사
            대상이 될 수 있습니다.
          </p>
        </div>

        {/* 사유 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-700">열람 사유 *</label>
          <Radio.Group value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)} className="flex flex-col gap-1">
            {REASON_PRESETS.map((preset) => (
              <Radio key={preset.code} value={preset.code} className="text-[13px]">
                {preset.label}
              </Radio>
            ))}
          </Radio.Group>
        </div>

        {/* 자유 입력 (기타 선택 시) */}
        {isCustom && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">상세 사유 *</label>
            <TextArea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
              maxLength={200}
              showCount
              placeholder="열람 사유를 입력해주세요 (최소 2자)"
              autoFocus
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
