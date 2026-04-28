/**
 * 메뉴 관리 picker UI에 노출되는 단일 컴포넌트 변형 메타.
 * remote의 variants 파일에서 component 함수 참조를 제외한 정보만 추출해 host로 전달된다.
 */
export interface PageVariantManifestEntry {
  key: string;
  label: string;
  description?: string;
}

/**
 * 한 path에 대한 변형 목록과 기본값.
 */
export interface PageVariantManifestPath {
  appId: string;
  path: string;
  defaultKey: string;
  variants: PageVariantManifestEntry[];
}

/**
 * appId별 path → 변형 목록 맵.
 * picker UI는 appId/path로 lookup해 변형 카드를 렌더한다.
 */
export type PageVariantsManifestMap = Record<string, PageVariantManifestPath[]>;
