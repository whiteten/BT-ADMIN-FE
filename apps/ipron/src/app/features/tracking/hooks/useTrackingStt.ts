/**
 * 트래킹 녹취 STT 변환 요청 + 변환 이력 조회 hook.
 *
 * 같은 filename 으로 여러 번 변환할 수 있으므로 (각각 다른 ucidGkey),
 * 변환 시점(since) 이후 새로 등록된 ucidGkey 가 sentenceCount > 0 으로 나타날 때까지 polling.
 *
 * 노출:
 *  - requestStt(blob, filename) : 변환 요청 (업로드 + WebSocket + polling)
 *  - listByFilename(filename)   : filename 매칭 변환 이력 (시간 역순)
 *  - loadSentences(ucidGkey)    : 특정 ucidGkey 의 문장 전체 로드
 *  - reset()                    : hook 상태 초기화
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import ApiClient, { type ApiResponse, WebSocketClient, buildWsUrl } from '@/shared-util';

const apiClient = new ApiClient({ serviceURL: '/bff' });

interface UploadedFile {
  uploadedFilename: string;
  uploadPath: string;
}

interface FtsAckMessage {
  command: string;
  fileName: string;
  success: boolean;
  error?: string;
}

export interface SttSentence {
  ucidGkey: string;
  armsoffset: number;
  rxtxKind: string;
  sentence: string;
  orgSentence: string;
}

export interface SttHistoryItem {
  ucidGkey: string;
  filename: string;
  convertedAt: string; // ISO datetime
  /** STT raw WORK_KIND 값 (디버그용). */
  workKind?: number | null;
  /** STT 처리 상태 라벨 — '대기중' / '실패' / '진행중' / '종료'. 완료 판정에 사용. */
  workKindLabel?: string | null;
  /** 변환된 문장 수 — 처리중에도 증가 (스트리밍 적재). */
  sentenceCount: number;
  agentId?: string | null;
  agentName?: string | null;
}

export type SttStatus = 'idle' | 'uploading' | 'requesting' | 'transcribing' | 'done' | 'error';

export interface SttResult {
  status: SttStatus;
  message?: string;
  fileName?: string;
  newUcidGkey?: string; // 변환 완료 시 새 ucidGkey (history refresh + 자동 선택용)
  elapsedSec?: number;
}

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5분
const CLOCK_SKEW_MARGIN_MS = 30 * 1000; // 서버/클라이언트 시각 차이 마진

export function useTrackingStt() {
  const [result, setResult] = useState<SttResult>({ status: 'idle' });
  const wsRef = useRef<WebSocketClient | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current != null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /** filename 매칭 변환 이력 목록 (시간 역순). 결과 없으면 빈 배열. */
  const listByFilename = useCallback(async (filename: string): Promise<SttHistoryItem[]> => {
    if (!filename) return [];
    try {
      const r = await apiClient.get<ApiResponse<{ items: SttHistoryItem[] }>>('/stt-search-result-history', {
        params: { filename },
      });
      return r.data?.data?.items ?? [];
    } catch {
      return [];
    }
  }, []);

  /** 특정 ucidGkey 의 문장 전체 로드. */
  const loadSentences = useCallback(async (ucidGkey: string): Promise<SttSentence[]> => {
    if (!ucidGkey) return [];
    try {
      const r = await apiClient.get<ApiResponse<{ items: SttSentence[] }>>('/stt-search-result-sentence', {
        params: { ucidGkey },
      });
      return r.data?.data?.items ?? [];
    } catch {
      return [];
    }
  }, []);

  /**
   * 변환 요청 후 polling.
   * since 이후 등록된 row 중 sentenceCount > 0 인 가장 최근 항목을 찾으면 완료.
   */
  const pollHistory = useCallback(
    async (filename: string, since: Date) => {
      try {
        const items = await listByFilename(filename);
        const elapsedSec = Math.round((Date.now() - since.getTime()) / 1000);
        const sinceMs = since.getTime() - CLOCK_SKEW_MARGIN_MS;

        // 완료 판정 — workKindLabel='종료' 이어야 진짜 완료.
        // (STT FileUploadList 의 status 라벨 로직과 동일: WORK_KIND + RECORDING_INDEX.SA_COMPLETE 결합)
        const completed = items
          .filter((it) => new Date(it.convertedAt).getTime() >= sinceMs && it.workKindLabel === '종료' && it.sentenceCount > 0)
          .sort((a, b) => new Date(b.convertedAt).getTime() - new Date(a.convertedAt).getTime())[0];

        if (completed) {
          setResult({
            status: 'done',
            fileName: filename,
            newUcidGkey: completed.ucidGkey,
            elapsedSec,
          });
          return;
        }

        if (Date.now() - since.getTime() > POLL_TIMEOUT_MS) {
          setResult({
            status: 'error',
            message: 'STT 변환이 5분 내 완료되지 않았습니다. STT > 파일업로드 메뉴에서 확인하세요.',
            fileName: filename,
          });
          return;
        }

        setResult((prev) => ({ ...prev, status: 'transcribing', elapsedSec }));
        pollTimerRef.current = window.setTimeout(() => pollHistory(filename, since), POLL_INTERVAL_MS);
      } catch {
        if (Date.now() - since.getTime() > POLL_TIMEOUT_MS) {
          setResult({ status: 'error', message: '결과 조회 실패 (timeout)', fileName: filename });
          return;
        }
        pollTimerRef.current = window.setTimeout(() => pollHistory(filename, since), POLL_INTERVAL_MS);
      }
    },
    [listByFilename],
  );

  const requestStt = useCallback(
    async (blob: Blob, filename: string, menuId = 'sttfile') => {
      setResult({ status: 'uploading', fileName: filename });

      // 1) 업로드
      let uploaded: UploadedFile;
      try {
        const file = new File([blob], filename, { type: blob.type || 'audio/mpeg' });
        const formData = new FormData();
        formData.append('uploadFile', file);
        formData.append('menuId', menuId);
        const r = await apiClient.post<ApiResponse<UploadedFile>>('/stt-file-upload', formData);
        if (!r.data?.data?.uploadedFilename) throw new Error('업로드 응답 비어있음');
        uploaded = r.data.data;
      } catch (e) {
        setResult({ status: 'error', message: e instanceof Error ? e.message : '파일 업로드 실패' });
        return;
      }

      // 2) WebSocket + STT 요청
      setResult({ status: 'requesting', fileName: uploaded.uploadedFilename });
      const requestedAt = new Date(); // polling 기준 — 이 이후 등록된 row 만 새 변환으로 간주

      const wsUrl = buildWsUrl('/ws/proxy/stt/file-upload');
      const client = new WebSocketClient(wsUrl, { messageLog: false });
      wsRef.current = client;

      client.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data) as FtsAckMessage;
          if (msg.command === 'SEND_TO_FTS_SINGLE_ACK') {
            if (msg.success) {
              setResult({ status: 'transcribing', fileName: msg.fileName, elapsedSec: 0 });
              clearPolling();
              pollTimerRef.current = window.setTimeout(() => pollHistory(msg.fileName, requestedAt), POLL_INTERVAL_MS);
            } else {
              setResult({ status: 'error', message: msg.error ?? 'STT 변환 요청 실패', fileName: msg.fileName });
            }
            client.disconnect();
            wsRef.current = null;
          }
        } catch {
          /* ignore */
        }
      };
      client.onclose = () => {
        wsRef.current = null;
      };

      try {
        await client.connect();
        client.send({ command: 'SEND_TO_FTS_SINGLE', fileName: uploaded.uploadedFilename, filePath: uploaded.uploadPath });
      } catch (e) {
        setResult({ status: 'error', message: e instanceof Error ? e.message : 'WebSocket 연결 실패' });
        wsRef.current = null;
      }
    },
    [clearPolling, pollHistory],
  );

  const reset = useCallback(() => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    clearPolling();
    setResult({ status: 'idle' });
  }, [clearPolling]);

  useEffect(() => {
    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
      clearPolling();
    };
  }, [clearPolling]);

  return { result, requestStt, reset, listByFilename, loadSentences };
}
