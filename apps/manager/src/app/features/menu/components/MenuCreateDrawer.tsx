/**
 * 메뉴 생성 Drawer
 * - 트리에서 선택된 노드 기반 부모 메뉴 자동 결정
 * - 기본 정보 입력
 * - ref.open(selectedMenu, fallbackAppId) / ref.close()
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import type { App } from '../../iam/api/appApi';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';

export interface MenuCreateDrawerRef {
  open: (selectedMenu?: Menu | null, fallbackAppId?: string) => void;
  close: () => void;
}

interface MenuCreateDrawerProps {
  menus: Menu[];
  apps: App[];
  onOk: (data: MenuUpsertRequest) => void;
  confirmLoading?: boolean;
}

const MenuCreateDrawer = forwardRef<MenuCreateDrawerRef, MenuCreateDrawerProps>(({ menus, apps, onOk, confirmLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [parentMenu, setParentMenu] = useState<Menu | null>(null);
  const [presetAppId, setPresetAppId] = useState<string | null>(null);
  const [form] = Form.useForm<MenuUpsertRequest>();

  const appOptions = useMemo(() => {
    return apps.map((a) => ({ label: a.appName, value: a.appId }));
  }, [apps]);

  /** 선택된 메뉴 기반으로 부모 메뉴 결정: FOLDER면 그대로, PAGE면 그 부모 */
  const resolveParent = (menu: Menu | null | undefined): Menu | null => {
    if (!menu) return null;
    if (menu.type === 'FOLDER') return menu;
    if (menu.parentId) return menus.find((m) => m.menuId === menu.parentId) ?? null;
    return null;
  };

  /** 부모 메뉴 표시 텍스트 */
  const getParentDisplay = () => {
    if (parentMenu) {
      return `[${parentMenu.appName ?? parentMenu.appId}] ${parentMenu.label}`;
    }
    if (presetAppId) {
      const app = apps.find((a) => a.appId === presetAppId);
      return `[${app?.appName ?? presetAppId}] 최상위`;
    }
    return '최상위 (없음)';
  };

  useImperativeHandle(ref, () => ({
    open: (selected?: Menu | null, fallbackAppId?: string) => {
      const resolved = resolveParent(selected);
      setParentMenu(resolved);
      form.resetFields();

      if (resolved) {
        // 부모 폴더가 결정됨 → parentId, appId 모두 부모에서 상속
        setPresetAppId(null);
        form.setFieldsValue({ parentId: resolved.menuId, appId: resolved.appId });
      } else {
        // 부모 없음 → 선택된 메뉴의 appId 또는 fallback appId 사용
        const appId = selected?.appId ?? fallbackAppId ?? null;
        setPresetAppId(appId);
        if (appId) {
          form.setFieldsValue({ appId });
        }
      }
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
    } catch {
      // validation error
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmit} loading={confirmLoading}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={isOpen} onClose={handleClose} title="메뉴 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={{ type: 'PAGE', visible: true, sortOrder: 0 }}>
        <Form.Item label="부모 메뉴">
          <Input value={getParentDisplay()} disabled />
        </Form.Item>
        <Form.Item name="parentId" hidden>
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
              <Select placeholder="앱 선택" options={appOptions} disabled={!!parentMenu || !!presetAppId} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="타입" name="type" rules={[{ required: true, message: '타입을 선택해주세요' }]}>
              <Select
                options={[
                  { label: 'FOLDER (폴더)', value: 'FOLDER' },
                  { label: 'PAGE (페이지)', value: 'PAGE' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="메뉴키" name="menuKey" rules={[{ required: true, message: '메뉴키를 입력해주세요' }]}>
          <Input placeholder="예: resource.menu.list" />
        </Form.Item>

        <Form.Item label="라벨" name="label" rules={[{ required: true, message: '라벨을 입력해주세요' }]}>
          <Input placeholder="메뉴 표시명" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="정렬순서" name="sortOrder">
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="표시여부" name="visible" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

MenuCreateDrawer.displayName = 'MenuCreateDrawer';

export default MenuCreateDrawer;
