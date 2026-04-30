/**
 * (appId, path) → componentKey 매핑.
 * DynamicElement가 path 기준으로 lookup해 지정된 컴포넌트를 결정한다.
 */
export type PageMappingsMap = Record<string /* appId */, Record<string /* path */, string /* componentKey */>>;
