/**
 * 메뉴 생성 모달
 * - 부모 메뉴 선택 (TreeSelect)
 * - 기본 정보 입력
 */

import { useMemo } from 'react';
import { Form, Input, InputNumber, Modal, Select, Switch, TreeSelect } from 'antd';
import { useGetApps } from '../../iam/hooks/useAppQueries';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';

interface MenuCreateModalProps {
  open: boolean;
  menus: Menu[];
  onOk: (data: MenuUpsertRequest) => void;
  onCancel: () => void;
  confirmLoading?: boolean;
}

interface TreeSelectNode {
  value: number;
  title: string;
  children: TreeSelectNode[];
}

/** flat 메뉴 목록을 TreeSelect 구조로 변환 */
function buildTreeSelectData(menus: Menu[]): TreeSelectNode[] {
  const map = new Map<number, TreeSelectNode>();
  const roots: TreeSelectNode[] = [];

  for (const menu of menus) {
    if (menu.type !== 'FOLDER') continue;
    map.set(menu.menuId, {
      value: menu.menuId,
      title: menu.label,
      children: [],
    });
  }

  for (const menu of menus) {
    if (menu.type !== 'FOLDER') continue;
    const node = map.get(menu.menuId);
    if (!node) continue;
    const parent = menu.parentId ? map.get(menu.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default function MenuCreateModal({ open, menus, onOk, onCancel, confirmLoading }: MenuCreateModalProps) {
  const [form] = Form.useForm<MenuUpsertRequest>();
  const { data: apps = [] } = useGetApps();

  const appOptions = useMemo(() => {
    return apps.map((a) => ({ label: a.appName, value: a.appId }));
  }, [apps]);

  const treeSelectData = useMemo(() => buildTreeSelectData(menus), [menus]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
    } catch {
      // validation error
    }
  };

  const handleAfterClose = () => {
    form.resetFields();
  };

  return (
    <Modal
      title="메뉴 추가"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="생성"
      cancelText="취소"
      confirmLoading={confirmLoading}
      afterClose={handleAfterClose}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4" initialValues={{ type: 'PAGE', visible: true, sortOrder: 0 }}>
        <Form.Item label="부모 메뉴" name="parentId">
          <TreeSelect placeholder="최상위 메뉴 (선택 안 함)" treeData={treeSelectData} treeDefaultExpandAll allowClear />
        </Form.Item>

        <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
          <Select placeholder="앱 선택" options={appOptions} />
        </Form.Item>

        <Form.Item label="메뉴키" name="menuKey" rules={[{ required: true, message: '메뉴키를 입력해주세요' }]}>
          <Input placeholder="예: resource.menu.list" />
        </Form.Item>

        <Form.Item label="라벨" name="label" rules={[{ required: true, message: '라벨을 입력해주세요' }]}>
          <Input placeholder="메뉴 표시명" />
        </Form.Item>

        <Form.Item label="타입" name="type" rules={[{ required: true, message: '타입을 선택해주세요' }]}>
          <Select
            options={[
              { label: 'FOLDER (폴더)', value: 'FOLDER' },
              { label: 'PAGE (페이지)', value: 'PAGE' },
            ]}
          />
        </Form.Item>

        <Form.Item label="정렬순서" name="sortOrder">
          <InputNumber min={0} className="!w-full" />
        </Form.Item>

        <Form.Item label="표시여부" name="visible" valuePropName="checked">
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </Modal>
  );
}
