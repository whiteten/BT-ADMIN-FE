import type { PageMapping } from '@/shared-api';

/**
 * 화면 지정 mock data.
 *
 * 백엔드 API가 준비되기 전까지 부팅 시 fallback으로 사용된다.
 * (apps/host/src/app/features/layout/hooks/usePageMappingsLoader.ts에서 catch 시 import)
 *
 * 실제 API가 붙으면 이 파일은 제거하거나 빈 배열만 남긴다.
 */
export const mockPageMappings: PageMapping[] = [];
