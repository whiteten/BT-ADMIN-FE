import { botListVariants } from '../../pages/bot-config/BotList.variants';
import type { PageVariantConfig } from '@/components/custom/DynamicElement';

/**
 * fca 앱의 모든 page variants aggregator.
 *
 * 새 path에 변형 지원을 추가할 때:
 *  1. 페이지 옆에 *.variants.ts 파일 작성 (PageVariantConfig 형태)
 *  2. 여기에 import 추가
 *  3. pageVariants 객체에 등록
 *
 * MF './PageVariants'로 host에 노출되며, host는 메타만 추출해 picker UI에서 사용한다.
 */
export const pageVariants: Record<string, PageVariantConfig> = {
  [botListVariants.path]: botListVariants,
};
