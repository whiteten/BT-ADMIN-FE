import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

/**
 * insight 앱의 page variants aggregator.
 *
 * 변형이 필요한 화면이 생기면 *.variants.ts 파일을 작성하고 여기에 등록한다.
 * MF './PageVariantManifest'로 host에 노출되며, host는 메타만 추출해 picker UI에서 사용한다.
 */
export const pageVariantManifest: Record<string, PageVariantManifestConfig> = {};
