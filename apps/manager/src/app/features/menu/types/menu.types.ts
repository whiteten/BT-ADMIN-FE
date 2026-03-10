/**
 * 메뉴 관리 타입 정의
 */

/** 백엔드 MenuResponse와 1:1 매핑 */
export interface Menu {
  menuId: number;
  parentId: number | null;
  menuKey: string;
  appId: string;
  appName: string | null;
  label: string;
  type: 'FOLDER' | 'PAGE';
  i18nKey: string | null;
  sortOrder: number;
  featureFlag: string | null;
  visible: boolean;
  isSystem: boolean;
}

/** 백엔드 MenuUpsertRequest와 1:1 매핑 */
export interface MenuUpsertRequest {
  parentId?: number | null;
  menuKey: string;
  appId: string;
  label: string;
  type: 'FOLDER' | 'PAGE';
  i18nKey?: string;
  sortOrder?: number;
  featureFlag?: string;
  visible: boolean;
}

/** Ant Design Tree 노드용 변환 타입 */
export interface MenuTreeNode {
  key: string | number;
  title: string;
  children: MenuTreeNode[];
  icon?: React.ReactNode;
  data?: Menu;
  selectable?: boolean;
}
