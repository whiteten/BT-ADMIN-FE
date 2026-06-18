/**
 * 멘트파일 재생 hook — AS-IS IPR30S3020.jsp playSound 동등.
 *
 * <p>그리드의 여러 행에서 동시에 호출될 수 있으므로 단일 재생 보장 (한 번에 하나만 재생).
 * 동일 ID 재클릭 시 토글 (정지).</p>
 *
 * <p>BFF 의 GET /ivr-mentfile-audio (audio/wav) 를 Bearer 토큰 포함 fetch 후
 * Blob URL 로 변환해 {@code new Audio()} 에 주입. Audio.src 가 fetch 헤더를 직접 못 받으므로 필수 패턴.</p>
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import ApiClient, { extractApiErrorMessage, toast } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export interface UseMentFilePlayerResult {
  /** 현재 재생 중인 mentfileId — UI 토글 상태 표시용. null 이면 정지 상태 */
  playingId: number | null;
  /** 재생 토글 — 동일 ID 재클릭 시 정지. 다른 ID 클릭 시 이전 정지 후 새 재생. */
  toggle: (mentfileId: number) => Promise<void>;
  /** 명시적 정지 */
  stop: () => void;
}

export function useMentFilePlayer(): UseMentFilePlayerResult {
  const [playingId, setPlayingId] = useState<number | null>(null);
  // toggle 안에서 최신 playingId 를 의존성 없이 읽기 위함 — toggle 함수 안정화 (columnDefs 재생성 빈도 줄임)
  const playingIdRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // race guard: fetch 중에 사용자가 또 클릭하면 첫 응답을 무시
  const requestSeqRef = useRef(0);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      // 핸들러를 먼저 제거 — pause/src='' 가 트리거하는 의도된 MediaError 가 onerror 로 false positive 발생 방지
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setPlaying = useCallback((id: number | null) => {
    playingIdRef.current = id;
    setPlayingId(id);
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setPlaying(null);
  }, [cleanup, setPlaying]);

  const toggle = useCallback(
    async (mentfileId: number) => {
      // 동일 ID 재클릭 → 정지 (ref 로 최신값 비교 — playingId 의존성 제거)
      if (playingIdRef.current === mentfileId) {
        stop();
        return;
      }
      // 다른 ID 재생 중 → 정지 후 새 재생
      cleanup();
      const seq = ++requestSeqRef.current;

      try {
        const response = await apiClient.get<Blob>('/ivr-mentfile-audio', {
          params: { mentfileId },
          responseType: 'blob',
          // 에러는 아래 catch 에서 blob 본문을 파싱해 직접 토스트 → 전역 핸들러 중복/오파싱 방지
          silent: true,
        });
        // race: 이 응답이 도착하는 동안 다른 클릭/정지가 있었으면 폐기
        if (seq !== requestSeqRef.current) return;

        const blob = response.data;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        // 일부 브라우저에서 readyState 미준비 상태에 즉시 onended 가 false 발화하는 경우 가드
        audio.onended = () => {
          // 의도된 정지 (pause + src='') 가 아닌, 자연 종료에만 반응
          if (audioRef.current === audio) {
            stop();
          }
        };
        audio.onerror = () => {
          if (audioRef.current !== audio) return;
          toast.error('재생 중 오류가 발생했습니다.');
          stop();
        };

        await audio.play();
        // play() 가 정상 resolve 된 후에만 state 갱신
        if (seq === requestSeqRef.current) {
          setPlaying(mentfileId);
        }
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        // blob 응답이라 에러 본문도 Blob → 헬퍼가 텍스트로 풀어 백엔드 message 추출
        const msg = await extractApiErrorMessage(err, '재생에 실패했습니다.');
        toast.error(msg);
        cleanup();
        setPlaying(null);
      }
    },
    [cleanup, stop, setPlaying], // playingId 의존성 제거 — toggle 함수 안정화
  );

  // 언마운트 시 정리
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { playingId, toggle, stop };
}
