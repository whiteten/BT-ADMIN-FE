interface BookmarkParams {
  menuId: number;
  sortOrder?: number;
}

export type BookmarkCreateDatas = BookmarkParams;
export interface BookmarkUpdateDatas {
  menuIds: number[];
}
