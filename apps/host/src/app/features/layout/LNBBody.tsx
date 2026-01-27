import { useMenuStore } from '@/shared-store';
import { MenuItem } from './components/MenuItem';
import { MenuSpinner } from './components/MenuSpinner';
import useRemoteSelector from '../../hooks/useRemoteSelector';
import NoData from '@/components/custom/NoData';
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar';

const LNBBody = () => {
  const { menuConfigs, isLoading } = useMenuStore();
  const { selectedRemote } = useRemoteSelector();
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
        <NoData message="전체 메뉴 정보를 찾을 수 없습니다." />
      </SidebarContent>
    );
  }

  const selectedRemoteMenuConfig = menuConfigs.find((menuConfig) => menuConfig.appId === selectedRemote.key);
  if (!selectedRemoteMenuConfig) {
    return (
      <SidebarContent>
        <NoData message="메뉴 정보를 찾을 수 없습니다." />
      </SidebarContent>
    );
  }

  return (
    <SidebarContent>
      <SidebarGroup key={selectedRemoteMenuConfig.appId}>
        <SidebarGroupLabel>{selectedRemoteMenuConfig.appName}</SidebarGroupLabel>
        <SidebarMenu>
          {selectedRemoteMenuConfig.menus.map((item) => (
            <MenuItem key={item.menuKey} item={item} appId={selectedRemoteMenuConfig.appId} />
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>북마크</SidebarGroupLabel>
        <SidebarMenu></SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>최근 이용 메뉴</SidebarGroupLabel>
        <SidebarMenu></SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
};

export default LNBBody;
