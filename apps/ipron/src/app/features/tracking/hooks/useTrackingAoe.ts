/**
 * 트래킹 STT 결과 → AOE 대화 요약 hook.
 *
 * 흐름:
 *  1) FE 가 sentences 를 화자 prefix 포함 텍스트로 직렬화 ([Agent]/[Customer]/[Mixed] + \n)
 *  2) UUID 생성 → serviceId="test_{uuid}", threadId="{agentId}_{uuid}" (agentId 는 BE 가 박음)
 *  3) POST /bff/ipron-tracking-aoe-summarize { userInput, firstYn, serviceId, threadId }
 *  4) data.result 반환
 *
 * 같은 ucidGkey 의 재요청은 firstYn=N + 같은 serviceId 유지.
 */
import { useCallback, useRef, useState } from 'react';
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { SttSentence } from './useTrackingStt';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/** 대화 요약용 AOE Agent ID (시연 시급으로 하드코드, 추후 application.yml 또는 admin 설정으로 이동). */
const AOE_SUMMARY_AGENT_ID = '107d1843-e6fe-4e78-a074-6dc994bbe961';

export type AoeStatus = 'idle' | 'summarizing' | 'done' | 'error';

export interface AoeResult {
  status: AoeStatus;
  result?: string;
  message?: string;
}

interface SummarizeRequest {
  userInput: string;
  firstYn: 'Y' | 'N';
  serviceId: string;
  threadId: string;
}

interface SummarizeResponseData {
  result: string;
}

/** sec → "mm:ss" */
function fmtMmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * STT 문장 배열 → AOE userInput 텍스트.
 *
 * AOE 관리 화면(playground)의 동작 입력 형식과 동일:
 * {@code "상담원 00:04 text  고객 00:06 text  ..."} — 한국어 화자 prefix + mm:ss 시각.
 * 이전 영문 prefix({@code [Agent]/[Customer]}) 는 agent prompt 와 안 맞아 빈 응답 반환.
 */
export function buildUserInput(sentences: SttSentence[]): string {
  return sentences
    .map((s) => {
      const text = s.orgSentence || s.sentence || '';
      const rxtx = String(s.rxtxKind);
      const prefix = rxtx === '1' ? '고객' : rxtx === '2' ? '상담원' : '대화';
      const time = fmtMmss(s.armsoffset);
      return `${prefix} ${time} ${text}`;
    })
    .filter((line) => line.trim().length > 0)
    .join('  '); // 두 칸 띄우기 (AOE 화면 동작 형식)
}

export function useTrackingAoe() {
  const [result, setResult] = useState<AoeResult>({ status: 'idle' });
  // 한 ucidGkey(=한 대화) 의 첫 호출 vs 후속 호출 판정용 — 마지막 호출한 ucidGkey 기억.
  const lastUcidRef = useRef<string | null>(null);

  const summarize = useCallback(async (ucidGkey: string, sentences: SttSentence[]) => {
    if (sentences.length === 0) {
      setResult({ status: 'error', message: '요약할 대화가 없습니다' });
      return;
    }

    const userInput = buildUserInput(sentences);
    // 2026-06-24: firstYn=Y 첫 호출 시 외부 엔진이 빈 응답 반환하는 패턴 확인됨 → 항상 N 으로 고정.
    // (AOE 관리 화면도 N 으로 호출 시 정상 응답 확인)
    const firstYn: 'Y' | 'N' = 'N';
    lastUcidRef.current = ucidGkey;

    // 2026-06-24 변경:
    //  - endpoint: 별도 conversation/summary → /aoe-agents-test (검증된 playground/run)
    //  - userInput: [Agent]/[Customer] → 한국어 prefix + mm:ss (agent prompt 형식)
    //  - threadId: random uuid → UCID 자체 (한 대화 = 한 thread, AOE 가 thread 추적 가능)
    const body: SummarizeRequest = {
      userInput,
      firstYn,
      serviceId: `test_${ucidGkey}`,
      threadId: ucidGkey,
    };

    setResult({ status: 'summarizing' });
    try {
      const r = await apiClient.post<ApiResponse<SummarizeResponseData>>('/aoe-agents-test', body, {
        params: { agentId: AOE_SUMMARY_AGENT_ID },
      });
      const resultText = r.data?.data?.result;
      if (!resultText) {
        setResult({ status: 'error', message: '요약 응답이 비어있음' });
        return;
      }
      setResult({ status: 'done', result: resultText });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '요약 호출 실패';
      setResult({ status: 'error', message: msg });
    }
  }, []);

  const reset = useCallback(() => {
    lastUcidRef.current = null;
    setResult({ status: 'idle' });
  }, []);

  return { result, summarize, reset };
}
