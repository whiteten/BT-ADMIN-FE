/**
 * 메뉴 관리 타입 정의.
 *
 * IAM 재설계 v2.3: menuId/parentId(number) → menuKey/parentKey(string).
 */

/** 백엔드 MenuResponse와 1:1 매핑 */
export interface Menu {
  menuKey: string;
  parentKey: string | null;
  appId: string;
  appName: string | null;
  label: string;
  type: 'FOLDER' | 'PAGE';
  i18nKey: string | null;
  sortOrder: number;
  featureFlag: string | null;
  visible: boolean;
  isSystem: boolean;
  path: string | null;
  iconKey: string | null;
}

/** 백엔드 MenuUpsertRequest와 1:1 매핑 */
export interface MenuUpsertRequest {
  parentKey?: string | null;
  menuKey: string;
  appId: string;
  label: string;
  type: 'FOLDER' | 'PAGE';
  i18nKey?: string;
  sortOrder?: number;
  featureFlag?: string;
  visible: number;
  path?: string;
  iconKey?: string;
}

/** Ant Design Tree 노드용 변환 타입 */
export interface MenuTreeNode {
  key: string;
  title: string;
  children: MenuTreeNode[];
  icon?: React.ReactNode;
  data?: Menu;
  selectable?: boolean;
}
