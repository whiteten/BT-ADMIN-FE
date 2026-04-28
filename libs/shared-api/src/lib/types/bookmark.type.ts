/**
 * 북마크 API 요청 타입.
 *
 * IAM 재설계 v2.2: menuId(number) → menuKey(string).
 */
interface BookmarkParams {
  menuKey: string;
  sortOrder?: number;
}

export type BookmarkCreateDatas = BookmarkParams;

export interface BookmarkUpdateDatas {
  menuKeys: string[];
}
