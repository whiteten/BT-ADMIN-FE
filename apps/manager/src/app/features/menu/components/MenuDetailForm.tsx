/**
 * 메뉴 상세/편집 폼.
 * IAM 재설계 v2.3: menuId → menuKey.
 */

import { useEffect, useMemo } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { Trash2 } from 'lucide-react';
import type { App } from '../../iam/api/appApi';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';

interface MenuDetailFormProps {
  menu: Menu;
  apps: App[];
  onSave: (menuKey: string, data: MenuUpsertRequest) => void;
  onDelete: (menuKey: string) => void;
  saving?: boolean;
}

type FormValues = Omit<MenuUpsertRequest, 'visible'> & { visible: boolean };

export default function MenuDetailForm({ menu, apps, onSave, onDelete, saving }: MenuDetailFormProps) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({
      parentKey: menu.parentKey,
      menuKey: menu.menuKey,
      appId: menu.appId,
      label: menu.label,
      type: menu.type,
      i18nKey: menu.i18nKey ?? undefined,
      sortOrder: menu.sortOrder,
      featureFlag: menu.featureFlag ?? undefined,
      visible: menu.visible,
    });
  }, [menu, form]);

  const appOptions = useMemo(() => {
    return apps.map((a) => ({ label: a.appName, value: a.appId }));
  }, [apps]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave(menu.menuKey, { ...values, visible: values.visible ? 1 : 0 });
    } catch {
      // validation error
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '메뉴 삭제',
      content: `"${menu.label}" 메뉴를 삭제하시겠습니까?`,
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => onDelete(menu.menuKey),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">메뉴 상세</h3>
        <span className="text-sm text-gray-400 font-mono">Key: {menu.menuKey}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <Form form={form} layout="vertical" className="max-w-2xl">
          <Form.Item name="parentKey" hidden>
            <Input />
          </Form.Item>

          {/* 기본정보 */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">기본정보</h4>

            <div className="grid grid-cols-2 gap-x-4">
              <Form.Item label="메뉴키" name="menuKey" rules={[{ required: true, message: '메뉴키를 입력해주세요' }]}>
                <Input placeholder="예: manager-menu" disabled />
              </Form.Item>

              <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
                <Select placeholder="앱 선택" options={appOptions} />
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
                <Switch />
              </Form.Item>

              <Form.Item label="i18n 키" name="i18nKey">
                <Input placeholder="선택사항" />
              </Form.Item>

              <Form.Item label="기능 플래그" name="featureFlag">
                <Input placeholder="선택사항" />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
        {!menu.isSystem && (
          <Button danger icon={<Trash2 className="size-4" />} onClick={handleDelete}>
            삭제
          </Button>
        )}
        <Button type="primary" onClick={handleSubmit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}
