interface BookmarkParams {
  menuId: string;
  sortOrder: number;
}

export type BookmarkCreateDatas = BookmarkParams;
export type BookmarkUpdateDatas = Pick<BookmarkParams, 'sortOrder'>;
