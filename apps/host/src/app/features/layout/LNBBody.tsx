import { useState } from 'react';
import { Button } from 'antd';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import { MenuItem } from './components/MenuItem';
import { MenuSpinner } from './components/MenuSpinner';
import useRemoteSelector from '../../hooks/useRemoteSelector';
import NoData from '@/components/custom/NoData';
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar';

const LNBBody = () => {
  const { menuConfigs, isLoading } = useMenuStore();
  const { selectedRemote } = useRemoteSelector();
  const { favorites } = useNavigationStore();
  const [isEditMode, setIsEditMode] = useState(false);
  if (isLoading) {
    return (
      <SidebarContent>
        <MenuSpinner className="text-white" />
      </SidebarContent>
    );
  }

  if (!menuConfigs.length) {
    return (
      <SidebarContent>
        <NoData message={`메뉴 정보를\n찾을 수 없습니다.\n(전체)`} color="!text-white" />
      </SidebarContent>
    );
  }

  const selectedRemoteMenuConfig = menuConfigs.find((menuConfig) => menuConfig.appId === selectedRemote.key);
  if (!selectedRemoteMenuConfig) {
    return (
      <SidebarContent>
        <NoData message={`메뉴 정보를\n찾을 수 없습니다.`} color="!text-white" />
      </SidebarContent>
    );
  }

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <SidebarContent>
      <SidebarGroup key={selectedRemoteMenuConfig.appId}>
        <SidebarGroupLabel>{selectedRemoteMenuConfig.appName}</SidebarGroupLabel>
        <SidebarMenu>
          {selectedRemoteMenuConfig.menus.map((item) => (
            <MenuItem key={item.menuId} item={item} appId={selectedRemoteMenuConfig.appId} />
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>
          <div className="flex items-center justify-between w-full">
            <span>{isEditMode ? '드래그 하여 순서변경' : '북마크'}</span>
            {favorites?.length > 0 && (
              <Button size="small" className="!text-xs !px-1 !py-0.25 !h-auto !bg-transparent !border-white !text-white" onClick={handleToggleEditMode}>
                {isEditMode ? 'DONE' : 'EDIT'}
              </Button>
            )}
          </div>
        </SidebarGroupLabel>
        <SidebarMenu>
          <pre className="text-xs">{JSON.stringify(favorites, null, 2)}</pre>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
};

export default LNBBody;
