/**
 * 메뉴 생성 Drawer.
 * IAM 재설계 v2.3: menuId → menuKey, parentId → parentKey.
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';

import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { useBreadcrumbStore, useRemoteRoutesStore } from '@/shared-store';

import type { App } from '../../iam/api/appApi';
import QuerySelectorRenderer from '../selectors/QuerySelectorRenderer';
import type { Menu, MenuUpsertRequest } from '../types';
import { buildPathOptions, joinPathQuery } from '../utils/menuFormOptions';
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
  const [queryValues, setQueryValues] = useState<Record<string, string | undefined>>({});
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({});
  const [form] = Form.useForm<FormValues>();

  const routes = useRemoteRoutesStore((s) => s.routes);

  const watchAppId = Form.useWatch('appId', form);
  const watchType = Form.useWatch('type', form);
  const watchParentKey = Form.useWatch('parentKey', form);
  const watchPath = Form.useWatch('path', form);
  const watchLabel = Form.useWatch('label', form);
  const watchDesc = Form.useWatch('desc', form);

  const appOptions = useMemo(() => apps.map((a) => ({ label: a.appName, value: a.appId })), [apps]);
  const pathOptions = useMemo(() => buildPathOptions(routes, watchAppId), [routes, watchAppId]);
  const querySpecs = useMemo(() => {
    if (!watchAppId || !watchPath) return [];
    const entry = routes[watchAppId]?.find((r) => r.path === watchPath);
    return entry?.queryParams ?? [];
  }, [routes, watchAppId, watchPath]);

  const isPage = watchType === 'PAGE';
  const isTopLevel = !watchParentKey;

  const appName = apps.find((a) => a.appId === watchAppId)?.appName;
  // 미리보기 breadcrumb의 부모 폴더 체인(top→immediate parent). watchParentKey부터 위로 순회.
  const ancestorLabels = useMemo(() => {
    const byKey = new Map(menus.map((m) => [m.menuKey, m]));
    const labels: string[] = [];
    let pk: string | null | undefined = watchParentKey;
    while (pk) {
      const p = byKey.get(pk);
      if (!p) break;
      labels.unshift(p.label);
      pk = p.parentKey;
    }
    return labels;
  }, [menus, watchParentKey]);

  const handleQueryChange = (key: string, value: string | undefined) => {
    setQueryValues((prev) => ({ ...prev, [key]: value }));
    setQueryErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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
      setQueryValues({});
      setQueryErrors({});

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

        {/* menuKey 는 PK 이자 수정/삭제 API 의 URL path 변수 — 슬래시/공백 들어가면 라우팅이 깨져 수정·삭제 불가.
            영문·숫자·_- 슬러그만 허용 (화면 경로는 아래 '화면 경로' path 컬럼에 별도 저장). */}
        <Form.Item
          label="메뉴키"
          name="menuKey"
          rules={[
            { required: true, message: '메뉴키를 입력해주세요' },
            { pattern: /^[A-Za-z0-9_-]+$/, message: '메뉴키는 영문·숫자·_- 만 가능합니다 (슬래시·공백 불가)' },
          ]}
          tooltip="고유 식별자(슬러그). 화면 경로(path)와 다름 — 슬래시 사용 불가. 예: insight-report-bsr"
        >
          <Input placeholder="예: insight-report-bsr" />
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

        {isPage && querySpecs.length > 0 && <QuerySelectorRenderer specs={querySpecs} values={queryValues} onChange={handleQueryChange} errors={queryErrors} />}

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

        <Form.Item label="설명" name="desc">
          <Input.TextArea placeholder="메뉴 설명 (선택사항)" rows={3} />
        </Form.Item>

        {/*
         * 메뉴 패널 미리보기 — MenuDetailForm과 동일. host 작게보기 우측 프리뷰(PanelDetailSplit) 재현.
         * PAGE만 노출. 텍스트 폭 344px 고정(우측 pane 400 - px-7 56). 근거는 MenuDetailForm 주석 참조.
         */}
        {isPage && (
          <Form.Item label="메뉴 패널 미리보기">
            <div className="inline-block rounded-lg border border-[#e9ecef] bg-[#fcfdfe] px-7 py-6">
              <p className="w-[344px] mb-2 text-xs text-[#868e96]">{[appName, ...ancestorLabels].filter(Boolean).join(' › ') || '메뉴'}</p>
              <h2 className="w-[344px] mb-3 text-xl font-bold text-[#212529]">{watchLabel || '메뉴 라벨'}</h2>
              {watchDesc?.trim() ? (
                <p className="w-[344px] whitespace-pre-wrap text-sm leading-7 text-[#495057]">{watchDesc}</p>
              ) : (
                <p className="w-[344px] text-sm text-[#adb5bd]">설명을 입력하면 이곳에 표시됩니다.</p>
              )}
            </div>
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
});

MenuCreateDrawer.displayName = 'MenuCreateDrawer';

export default MenuCreateDrawer;
