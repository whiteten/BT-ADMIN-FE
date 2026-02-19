/**
 * 메뉴 상세/편집 폼
 * - 선택된 메뉴의 상세 정보 편집
 * - 권한 매핑 (체크박스)
 * - 저장/삭제/취소 버튼
 */

import { useEffect, useMemo } from 'react';
import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { Trash2 } from 'lucide-react';
import type { App } from '../../iam/api/appApi';
import { useGetAuthList } from '../../iam/hooks/usePermissionQueries';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';

interface MenuDetailFormProps {
  menu: Menu;
  apps: App[];
  onSave: (id: number, data: MenuUpsertRequest) => void;
  onDelete: (id: number) => void;
  saving?: boolean;
}

export default function MenuDetailForm({ menu, apps, onSave, onDelete, saving }: MenuDetailFormProps) {
  const [form] = Form.useForm<MenuUpsertRequest>();
  const { data: allPermissions = [] } = useGetAuthList();
  const watchedAppId = Form.useWatch('appId', form);

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
      permissions: menu.permissions ?? [],
    });
  }, [menu, form]);

  // 앱에 해당하는 권한만 필터 (앱 변경 시 동적 반영)
  const permissionOptions = useMemo(() => {
    const effectiveAppId = watchedAppId ?? menu.appId;
    return allPermissions
      .filter((p) => p.appId === effectiveAppId)
      .map((p) => ({
        label: `${p.authKey}${p.description ? ` - ${p.description}` : ''}`,
        value: p.authKey,
      }));
  }, [allPermissions, watchedAppId, menu.appId]);

  const appOptions = useMemo(() => {
    return apps.map((a) => ({ label: a.appName, value: a.appId }));
  }, [apps]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // 현재 앱에 속하는 권한만 필터 (앱 전환 시 이전 앱 권한 누수 방지)
      const validPermKeys = new Set(permissionOptions.map((o) => o.value));
      values.permissions = (values.permissions ?? []).filter((p) => validPermKeys.has(p));
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">메뉴 상세</h3>
        <span className="text-sm text-gray-400">ID: {menu.menuId}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <Form form={form} layout="vertical" className="max-w-2xl">
          <Form.Item name="parentId" hidden>
            <Input />
          </Form.Item>

          {/* 기본정보 */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">기본정보</h4>

            <div className="grid grid-cols-2 gap-x-4">
              <Form.Item label="메뉴키" name="menuKey" rules={[{ required: true, message: '메뉴키를 입력해주세요' }]}>
                <Input placeholder="예: resource.menu.list" />
              </Form.Item>

              <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
                <Select placeholder="앱 선택" options={appOptions} onChange={() => form.setFieldValue('permissions', [])} />
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

          {/* 필요 권한 */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">필요 권한</h4>
            <Form.Item name="permissions" noStyle>
              <Checkbox.Group className="flex flex-col gap-1">
                {permissionOptions.map((opt) => (
                  <Checkbox key={opt.value} value={opt.value} className="!ml-0">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{opt.label}</code>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
            {permissionOptions.length === 0 && <div className="text-sm text-gray-400">등록된 권한이 없습니다.</div>}
          </div>
        </Form>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {!menu.isSystem && (
            <Button danger icon={<Trash2 className="size-4" />} onClick={handleDelete}>
              삭제
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="primary" onClick={handleSubmit} loading={saving}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
