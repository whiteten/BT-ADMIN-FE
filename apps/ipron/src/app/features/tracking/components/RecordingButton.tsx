/**
 * 녹취 재생 버튼 — 외부 미디어 플레이어 redirect.
 *
 * 사용처: 콜 상세 페이지의 Agent segment / 헤더.
 * 권한: ipron:tracking:listen-recording (FE 노출 + BE 재검증)
 *
 * 동작:
 *  1. 클릭 → BFF /ipron-tracking-recording-redirect?ucid&userid&type
 *  2. 응답으로 외부 미디어 플레이어 URL 받음 → window.open(_blank)
 *  3. 권한 없거나 녹취 미존재 → 알림
 */
import { useState } from 'react';
import { Button, Dropdown, type MenuProps, message } from 'antd';
import { Headphones, Lock } from 'lucide-react';
import { useGetRecordingRedirect } from '../hooks/useTrackingQueries';
import type { RecordingType } from '../types/tracking.types';

interface Props {
  ucid: string;
  /** 상담사 ID (segment에서 추출) */
  userid: string | null;
  /** 녹취 청취 권한 보유 여부 — 미보유 시 잠금 아이콘 + disabled */
  canListen: boolean;
  /** STT/Screen 녹취 사용 여부 (대부분 false → VOICE만 노출) */
  hasStt?: boolean;
  hasScreen?: boolean;
}

export default function RecordingButton({ ucid, userid, canListen, hasStt = false, hasScreen = false }: Props) {
  const redirect = useGetRecordingRedirect();
  const [pendingType, setPendingType] = useState<RecordingType | null>(null);

  const playRecording = (type: RecordingType) => {
    if (!userid) {
      message.warning('상담사 segment가 없는 콜은 녹취가 없습니다.');
      return;
    }
    setPendingType(type);
    redirect.mutate(
      { ucid, userid, type },
      {
        onSuccess: (data) => {
          if (!data.allowed) {
            message.error(data.reason ?? '녹취 청취 권한이 없습니다');
            return;
          }
          // 외부 미디어 플레이어 열기 (Range 헤더 지원)
          window.open(data.url, '_blank', 'noopener,noreferrer');
        },
        onError: (err: unknown) => {
          const m = err instanceof Error ? err.message : '녹취 URL 조회 중 오류가 발생했습니다';
          message.error(m);
        },
        onSettled: () => setPendingType(null),
      },
    );
  };

  if (!canListen) {
    return (
      <Button size="small" icon={<Lock className="size-3" />} disabled title="녹취 청취 권한(ipron:tracking:listen-recording)이 필요합니다">
        녹취 (권한 없음)
      </Button>
    );
  }

  // STT/Screen 미사용 → 단일 버튼
  if (!hasStt && !hasScreen) {
    return (
      <Button size="small" type="primary" icon={<Headphones className="size-3" />} loading={pendingType === 'VOICE'} onClick={() => playRecording('VOICE')} disabled={!userid}>
        녹취 재생
      </Button>
    );
  }

  // 다중 미디어 → Dropdown
  const items: MenuProps['items'] = [
    { key: 'VOICE', label: '🎧 음성 녹취', onClick: () => playRecording('VOICE') },
    ...(hasStt ? [{ key: 'STT', label: '💬 STT 결과', onClick: () => playRecording('STT') }] : []),
    ...(hasScreen ? [{ key: 'SCREEN', label: '🖥 화면 녹화', onClick: () => playRecording('SCREEN') }] : []),
  ];

  return (
    <Dropdown menu={{ items }} disabled={!userid}>
      <Button size="small" type="primary" icon={<Headphones className="size-3" />} loading={!!pendingType}>
        녹취 재생 ▾
      </Button>
    </Dropdown>
  );
}
