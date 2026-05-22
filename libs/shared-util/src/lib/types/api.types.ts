/**
 * API Response 타입 정의
 */

/**
 * API 응답 엔벨로프.
 *
 * 모든 BFF 응답은 HTTP 본문이 `{ data: T }` 형태로 한 겹 감싸여 옵니다.
 * 이 타입은 그 바깥 엔벨로프 **한 겹만** 보장하며, 안쪽 `T`의 형태(목록·단건·
 * 통계·페이징 등)는 엔드포인트마다 다르므로 각 api 함수가 직접 책임집니다.
 *
 * axios 응답까지 합치면 실제 접근 경로는 `response.data.data` 입니다.
 * (axios 의 `response.data` = HTTP 본문 = `ApiResponse<T>`, 그 안의 `.data` = `T`)
 *
 * @example 목록 응답
 * const res = await apiClient.get<ApiResponse<{ items: Foo[] }>>('/foo-list');
 * return res.data?.data?.items ?? [];
 *
 * @example 단건 응답
 * const res = await apiClient.get<ApiResponse<Foo>>('/foo-detail');
 * return res.data?.data;
 */
export interface ApiResponse<T> {
  data: T;
}
