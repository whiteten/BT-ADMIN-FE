import { useEffect, useState } from 'react';
import { Input, Modal, Radio } from 'antd';
import { Lock, ShieldAlert } from 'lucide-react';

const { TextArea } = Input;

/** 사전 정의된 열람 사유 프리셋. '기타' 선택 시 자유 텍스트 입력이 활성화됩니다. */
const REASON_PRESETS = [
  { value: '민원 확인', label: '민원 확인' },
  { value: '품질 검수', label: '품질 검수' },
  { value: '보안 감사', label: '보안 감사' },
  { value: '법적 대응', label: '법적 대응' },
  { value: '고객 요청', label: '고객 요청' },
  { value: '__custom__', label: '기타(직접 입력)' },
] as const;

interface BubbleDecryptReasonModalProps {
  open: boolean;
  loading?: boolean;
  /** 닫기(취소) 콜백 */
  onCancel: () => void;
  /** 확인 콜백 — 최종 사유 문자열을 전달 */
  onConfirm: (reason: string) => void;
}

/**
 * 암호화 버블 복호화 사유 입력 모달.
 * 감사 로그에 남길 사유를 드롭다운 프리셋 또는 자유 입력으로 받습니다.
 * '기타' 선택 시 최소 2자 이상의 자유 입력이 필수입니다.
 */
export default function BubbleDecryptReasonModal({ open, loading, onCancel, onConfirm }: BubbleDecryptReasonModalProps) {
  const [selected, setSelected] = useState<string>(REASON_PRESETS[0].value);
  const [customReason, setCustomReason] = useState<string>('');

  // 모달이 열릴 때마다 초기 상태로 리셋 (이전 입력값 잔존 방지)
  useEffect(() => {
    if (open) {
      setSelected(REASON_PRESETS[0].value);
      setCustomReason('');
    }
  }, [open]);

  const isCustom = selected === '__custom__';
  const trimmedCustom = customReason.trim();
  const canConfirm = isCustom ? trimmedCustom.length >= 2 : true;

  const handleOk = () => {
    if (!canConfirm) return;
    const reason = isCustom ? trimmedCustom : selected;
    onConfirm(reason);
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
      destroyOnHidden
      maskClosable={!loading}
      closable={!loading}
    >
      <div className="flex flex-col gap-4 py-2">
        {/* 감사 안내 배너 */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50/60 border border-amber-100 rounded-md">
          <ShieldAlert size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-amber-800">
            선택하신 버블은 고객 개인정보가 포함될 수 있는 <strong>암호화된 대화</strong>입니다. 열람 이력(사용자 ID · 열람 시각 · 사유)이 서버 감사 로그에 기록되며, 부적절한
            열람은 추후 조회될 수 있습니다.
          </p>
        </div>

        {/* 사유 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-700">열람 사유 *</label>
          <Radio.Group value={selected} onChange={(e) => setSelected(e.target.value)} className="flex flex-col gap-1">
            {REASON_PRESETS.map((preset) => (
              <Radio key={preset.value} value={preset.value} className="text-[13px]">
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
