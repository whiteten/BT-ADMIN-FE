/**
 * 메뉴 생성 Drawer.
 * IAM 재설계 v2.3: menuId → menuKey, parentId → parentKey.
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { useRemoteRoutesStore } from '@/shared-store';
import type { App } from '../../iam/api/appApi';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';
import { buildPathOptions } from '../utils/menuFormOptions';
import MenuIconPicker from '@/components/custom/MenuIconPicker';

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

type FormValues = Omit<MenuUpsertRequest, 'visible'> & { visible: boolean };

const MenuCreateDrawer = forwardRef<MenuCreateDrawerRef, MenuCreateDrawerProps>(({ menus, apps, onOk, confirmLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [parentMenu, setParentMenu] = useState<Menu | null>(null);
  const [presetAppId, setPresetAppId] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();

  const routes = useRemoteRoutesStore((s) => s.routes);

  const watchAppId = Form.useWatch('appId', form);
  const watchType = Form.useWatch('type', form);
  const watchParentKey = Form.useWatch('parentKey', form);

  const appOptions = useMemo(() => apps.map((a) => ({ label: a.appName, value: a.appId })), [apps]);
  const pathOptions = useMemo(() => buildPathOptions(routes, watchAppId), [routes, watchAppId]);

  const isPage = watchType === 'PAGE';
  const isTopLevel = !watchParentKey;

  /** 선택된 메뉴 기반으로 부모 메뉴 결정: FOLDER면 그대로, PAGE면 그 부모 */
  const resolveParent = (menu: Menu | null | undefined): Menu | null => {
    if (!menu) return null;
    if (menu.type === 'FOLDER') return menu;
    if (menu.parentKey) return menus.find((m) => m.menuKey === menu.parentKey) ?? null;
    return null;
  };

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
        setPresetAppId(null);
        form.setFieldsValue({ parentKey: resolved.menuKey, appId: resolved.appId });
      } else {
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
      const payload: MenuUpsertRequest = {
        ...values,
        visible: values.visible ? 1 : 0,
        ...(values.path ? { path: values.path } : {}),
        ...(values.iconKey ? { iconKey: values.iconKey } : {}),
      };
      onOk(payload);
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
        <Form.Item name="parentKey" hidden>
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
          <Input placeholder="예: manager-user" />
        </Form.Item>

        <Form.Item label="라벨" name="label" rules={[{ required: true, message: '라벨을 입력해주세요' }]}>
          <Input placeholder="메뉴 표시명" />
        </Form.Item>

        {isTopLevel && (
          <Form.Item label="아이콘" name="iconKey">
            <MenuIconPicker placeholder="아이콘 선택" />
          </Form.Item>
        )}

        {isPage && (
          <Form.Item label="화면 경로" name="path" rules={[{ required: true, message: '화면 경로를 선택해주세요' }]}>
            <Select placeholder="화면 경로 선택" options={pathOptions} allowClear showSearch optionFilterProp="value" notFoundContent="등록된 path 없음" />
          </Form.Item>
        )}

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
