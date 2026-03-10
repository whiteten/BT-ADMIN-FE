/**
 * 메뉴 관리 페이지
 * - 좌측: 메뉴 트리 (앱 필터)
 * - 우측: 메뉴 상세/편집 폼
 */

import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BreadcrumbProps } from 'antd';
import { toast } from '@/shared-util';
import { useGetApps } from '../../features/iam/hooks/useAppQueries';
import MenuCreateDrawer, { type MenuCreateDrawerRef } from '../../features/menu/components/MenuCreateDrawer';
import MenuDetailForm from '../../features/menu/components/MenuDetailForm';
import MenuTree from '../../features/menu/components/MenuTree';
import { menuQueryKeys, useCreateMenu, useDeleteMenu, useGetMenus, useUpdateMenu } from '../../features/menu/hooks/useMenuQueries';
import type { Menu, MenuUpsertRequest } from '../../features/menu/types/menu.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '시스템', path: '/manager/resource/menu' },
  { title: '플랫폼', path: '/manager/resource/menu' },
  { title: '메뉴', path: '/manager/resource/menu' },
];

export default function MenuManagement() {
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedTreeAppId, setSelectedTreeAppId] = useState<string | null>(null);
  const drawerRef = useRef<MenuCreateDrawerRef>(null);

  // 데이터 조회
  const { data: menus = [], isLoading } = useGetMenus();
  const { data: apps = [] } = useGetApps();

  // 앱 필터 옵션
  const appFilterOptions = useMemo(() => {
    return [{ label: '전체 앱', value: '' }, ...apps.map((a) => ({ label: a.appName, value: a.appId }))];
  }, [apps]);

  // 메뉴 목록 무효화 헬퍼
  const invalidateMenus = () => {
    queryClient.invalidateQueries({ queryKey: menuQueryKeys.getMenus.queryKey });
  };

  // 메뉴 생성
  const createMenuMutation = useCreateMenu({
    mutationOptions: {
      onSuccess: (newMenu) => {
        toast.success('메뉴가 생성되었습니다');
        drawerRef.current?.close();
        invalidateMenus();
        // 새로 생성된 메뉴 자동 선택
        if (newMenu) {
          setSelectedMenu(newMenu);
        }
      },
    },
  });

  // 메뉴 수정
  const updateMenuMutation = useUpdateMenu({
    mutationOptions: {
      onSuccess: (updatedMenu) => {
        toast.success('메뉴가 저장되었습니다');
        invalidateMenus();
        if (updatedMenu) {
          setSelectedMenu(updatedMenu);
        }
      },
    },
  });

  // 메뉴 삭제
  const deleteMenuMutation = useDeleteMenu({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메뉴가 삭제되었습니다');
        setSelectedMenu(null);
        invalidateMenus();
      },
    },
  });

  const handleSave = (id: number, data: MenuUpsertRequest) => {
    updateMenuMutation.mutate({ id, data });
  };

  const handleDelete = (id: number) => {
    deleteMenuMutation.mutate(id);
  };

  const handleCreate = (data: MenuUpsertRequest) => {
    createMenuMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader breadcrumb={breadcrumb} />
        <div className="flex items-center justify-center flex-1">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Tree + Detail Split */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 메뉴 트리 */}
        <div className="w-[300px] shrink-0">
          <MenuTree
            menus={menus}
            apps={appFilterOptions}
            selectedAppId={selectedAppId}
            onAppChange={setSelectedAppId}
            selectedMenuId={selectedMenu?.menuId ?? null}
            selectedTreeAppId={selectedTreeAppId}
            onSelect={(menu) => {
              setSelectedMenu(menu);
              setSelectedTreeAppId(null);
            }}
            onTreeAppSelect={(appId) => {
              setSelectedTreeAppId(appId);
              setSelectedMenu(null);
            }}
            onAdd={() => {
              const fallbackAppId = selectedMenu?.appId || selectedTreeAppId || selectedAppId || undefined;
              drawerRef.current?.open(selectedMenu, fallbackAppId);
            }}
          />
        </div>

        {/* 우측: 상세 폼 */}
        <div className="flex-1 border border-gray-200 rounded-lg p-4 overflow-auto">
          {selectedMenu ? (
            <MenuDetailForm menu={selectedMenu} apps={apps} onSave={handleSave} onDelete={handleDelete} saving={updateMenuMutation.isPending} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <NoData message="좌측 트리에서 메뉴를 선택해주세요" />
            </div>
          )}
        </div>
      </div>

      {/* 메뉴 생성 Drawer */}
      <MenuCreateDrawer ref={drawerRef} menus={menus} apps={apps} onOk={handleCreate} confirmLoading={createMenuMutation.isPending} />
    </div>
  );
}
