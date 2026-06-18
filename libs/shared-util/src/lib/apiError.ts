/**
 * axios 에러에서 사용자용 메시지를 추출한다.
 *
 * - 일반 JSON 응답: `error.response.data.message` (백엔드 ApiResponse) 사용.
 * - `responseType: 'blob'` 요청(다운로드/오디오 재생 등): 에러 본문도 Blob 이라
 *   text 로 풀어 JSON 의 message 를 파싱한다. (Blob 이면 `data.message` 가 undefined 라 일반 경로로는 못 읽음)
 *
 * @param error    axios 에러(또는 임의 에러)
 * @param fallback 메시지를 못 찾았을 때 표시할 기본 문구
 */
export async function extractApiErrorMessage(error: unknown, fallback = '요청 처리 중 오류가 발생했습니다.'): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  // blob 본문 → 텍스트로 풀어 JSON message 추출
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text()) as { message?: unknown };
      if (typeof json?.message === 'string' && json.message) return json.message;
    } catch {
      /* JSON 이 아니면 fallback */
    }
    return fallback;
  }

  // 일반 JSON 본문
  if (data && typeof data === 'object') {
    const obj = data as { message?: unknown; error_description?: unknown };
    const m = obj.message ?? obj.error_description;
    if (typeof m === 'string' && m) return m;
  }
  return fallback;
}
