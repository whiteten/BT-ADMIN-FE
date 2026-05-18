/**
 * 즐겨찾기 API 요청 타입.
 *
 * IAM 재설계 v2.2: menuId(number) → menuKey(string).
 */
interface FavoriteParams {
  menuKey: string;
  sortOrder?: number;
}

export type FavoriteCreateDatas = FavoriteParams;

export interface FavoriteUpdateDatas {
  menuKeys: string[];
}
