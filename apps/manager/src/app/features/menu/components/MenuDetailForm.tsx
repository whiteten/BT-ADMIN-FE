/**
 * 메뉴 상세/편집 폼.
 * IAM 재설계 v2.3: menuId → menuKey.
 */

import { useEffect, useMemo, useState } from 'react';

import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Switch } from 'antd';
import { useBreadcrumbStore, useRemoteRoutesStore } from '@/shared-store';

import type { App } from '../../iam/api/appApi';
import QuerySelectorRenderer from '../selectors/QuerySelectorRenderer';
import type { Menu, MenuUpsertRequest } from '../types';
import { buildPathOptions, joinPathQuery, splitPathQuery } from '../utils/menuFormOptions';
import { IconDocument } from '@/components/custom/Icons';
import MenuIconPicker from '@/components/custom/MenuIconPicker';

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
  const [queryValues, setQueryValues] = useState<Record<string, string | undefined>>({});
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({});

  const routes = useRemoteRoutesStore((s) => s.routes);

  const watchAppId = Form.useWatch('appId', form);
  const watchType = Form.useWatch('type', form);
  const watchParentKey = Form.useWatch('parentKey', form);
  const watchPath = Form.useWatch('path', form);

  useEffect(() => {
    const { basePath, queryValues: parsedQuery } = splitPathQuery(menu.path);
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
      path: basePath || undefined,
      iconKey: menu.iconKey ?? undefined,
      desc: menu.desc ?? undefined,
    });
    setQueryValues(parsedQuery);
    setQueryErrors({});
  }, [menu, form]);

  const appOptions = useMemo(() => apps.map((a) => ({ label: a.appName, value: a.appId })), [apps]);
  const pathOptions = useMemo(() => buildPathOptions(routes, watchAppId), [routes, watchAppId]);
  const querySpecs = useMemo(() => {
    if (!watchAppId || !watchPath) return [];
    const entry = routes[watchAppId]?.find((r) => r.path === watchPath);
    return entry?.queryParams ?? [];
  }, [routes, watchAppId, watchPath]);

  const isPage = watchType === 'PAGE';
  const isTopLevel = !watchParentKey;
  const showRow3 = isTopLevel || isPage;

  const handleQueryChange = (key: string, value: string | undefined) => {
    setQueryValues((prev) => ({ ...prev, [key]: value }));
    setQueryErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // handle.queryParams에 선언된 모든 query는 무조건 필수
      const newQueryErrors: Record<string, string> = {};
      querySpecs.forEach((spec) => {
        if (!queryValues[spec.key]) newQueryErrors[spec.key] = `${spec.label}을(를) 선택해주세요`;
      });
      if (Object.keys(newQueryErrors).length > 0) {
        setQueryErrors(newQueryErrors);
        return;
      }
      setQueryErrors({});

      const composedPath = values.path ? joinPathQuery(values.path, queryValues) : undefined;
      const payload: MenuUpsertRequest = {
        ...values,
        visible: values.visible ? 1 : 0,
        ...(composedPath ? { path: composedPath } : {}),
        ...(values.iconKey ? { iconKey: values.iconKey } : {}),
      };
      onSave(menu.menuKey, payload);
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
    <div className="flex flex-col h-full bg-white bt-shadow overflow-hidden">
      <div className="flex-1 overflow-y-auto p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 items-center text-[var(--color-bt-primary)]">
            <IconDocument className="h-5 w-5" />
            <span className="text-[20px] font-bold">메뉴 상세</span>
          </div>
        </div>
        <Form form={form} layout="vertical">
          <Form.Item name="parentKey" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
                <Select placeholder="앱 선택" options={appOptions} disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="메뉴키" name="menuKey" rules={[{ required: true, message: '메뉴키를 입력해주세요' }]}>
                <Input placeholder="예: manager-menu" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="라벨" name="label" rules={[{ required: true, message: '라벨을 입력해주세요' }]}>
                <Input placeholder="메뉴 표시명" />
              </Form.Item>
            </Col>
            <Col span={8}>
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

          {showRow3 && (
            <Row gutter={16}>
              {isTopLevel && (
                <Col span={8}>
                  <Form.Item label="아이콘" name="iconKey">
                    <MenuIconPicker placeholder="아이콘 선택" />
                  </Form.Item>
                </Col>
              )}
              {isPage && (
                <Col span={8}>
                  <Form.Item label="화면 경로" name="path" rules={[{ required: true, message: '화면 경로를 선택해주세요' }]}>
                    <Select placeholder="화면 경로 선택" options={pathOptions} allowClear showSearch optionFilterProp="value" notFoundContent="등록된 path 없음" />
                  </Form.Item>
                </Col>
              )}
            </Row>
          )}

          {isPage && querySpecs.length > 0 && (
            <Row gutter={16}>
              <Col span={16}>
                <QuerySelectorRenderer specs={querySpecs} values={queryValues} onChange={handleQueryChange} errors={queryErrors} />
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="정렬순서" name="sortOrder">
                <InputNumber min={0} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="표시여부" name="visible" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="i18n 키" name="i18nKey">
                <Input placeholder="선택사항" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="기능 플래그" name="featureFlag">
                <Input placeholder="선택사항" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="설명" name="desc">
                <Input.TextArea placeholder="메뉴 설명 (선택사항)" rows={3} />
              </Form.Item>
            </Col>
          </Row>
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
