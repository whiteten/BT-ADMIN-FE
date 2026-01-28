interface BookmarkParams {
  menuId: number;
  sortOrder?: number;
}

export type BookmarkCreateDatas = BookmarkParams;
export type BookmarkUpdateDatas = Required<Pick<BookmarkParams, 'sortOrder'>>;
