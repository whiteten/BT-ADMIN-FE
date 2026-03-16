/**
 * 메뉴 상세/편집 폼
 * - 선택된 메뉴의 상세 정보 편집
 * - 저장/삭제/취소 버튼
 */

import { useEffect, useMemo } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import type { App } from '../../iam/api/appApi';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';
import { IconDocument } from '@/components/custom/Icons';

interface MenuDetailFormProps {
  menu: Menu;
  apps: App[];
  onSave: (id: number, data: MenuUpsertRequest) => void;
  onDelete: (id: number) => void;
  saving?: boolean;
}

export default function MenuDetailForm({ menu, apps, onSave, onDelete, saving }: MenuDetailFormProps) {
  const [form] = Form.useForm<MenuUpsertRequest>();

  // 메뉴 변경 시 폼 초기화
  useEffect(() => {
    form.setFieldsValue({
      parentId: menu.parentId,
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
      onSave(menu.menuId, values);
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
      onOk: () => onDelete(menu.menuId),
    });
  };

  return (
    <div className="flex flex-col h-full bg-white bt-shadow overflow-hidden">
      <div className="flex-1 overflow-y-auto p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 items-center text-[var(--color-bt-primary)]">
            <IconDocument className="h-5 w-5" />
            <span className="text-[20px] font-bold">메뉴 상세</span>
          </div>
          <span className="text-sm text-gray-400">ID: {menu.menuId}</span>
        </div>

        <Form form={form} layout="vertical" className="max-w-2xl">
          <Form.Item name="parentId" hidden>
            <Input />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item label="메뉴키" name="menuKey" rules={[{ required: true, message: '메뉴키를 입력해주세요' }]}>
              <Input placeholder="예: resource.menu.list" />
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
        </Form>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-center gap-2 sticky bottom-0 bg-white z-10 pb-7 pt-4 border-t border-gray-100 px-7">
        {!menu.isSystem && (
          <Button color="red" variant="solid" onClick={handleDelete}>
            삭제
          </Button>
        )}
        <Button color="primary" variant="solid" onClick={handleSubmit} loading={saving}>
          저장
        </Button>
      </div>
    </div>
  );
}
