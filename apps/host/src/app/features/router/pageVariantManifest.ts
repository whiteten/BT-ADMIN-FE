import type { PageVariantManifestConfig } from '@/components/custom/DynamicElement';

/**
 * host 앱 자체 화면(로그인·메인 등)의 page variants aggregator.
 *
 * host는 MF host이므로 remote처럼 './PageVariantManifest'를 expose할 수 없다.
 * 대신 usePageVariantManifestLoader가 이 파일을 정적(직접) import해 메타를 적재한다.
 *
 * 새 path에 변형 지원을 추가할 때:
 *  1. 페이지 옆에 *.variants.ts 파일 작성 (PageVariantManifestConfig 형태)
 *  2. 여기에 import 추가
 *  3. pageVariantManifest 객체에 등록
 *
 * 변형이 없어도(빈 객체) routes.tsx에서 createPageVariantSocket('host')로 감싼 화면은
 * 현장 커스텀(site:) 교체가 가능하다.
 */
export const pageVariantManifest: Record<string, PageVariantManifestConfig> = {};
