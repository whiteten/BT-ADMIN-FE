/**
 * 화면 지정(componentKey) 정의.
 * 메뉴와 무관하게 (appId, path) 단위로 보관되며, 메뉴에 등록되지 않은 path도 포함될 수 있다.
 */
export interface PageVariant {
  appId: string;
  path: string;
  componentKey: string;
}

export interface PageVariantUpsertRequest {
  appId: string;
  path: string;
  componentKey: string;
}
