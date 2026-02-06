import { Activity } from 'lucide-react';
import { IconMenuMain, IconMenuStatistics } from '@/components/custom/Icons';

const appId = 'sd';
const appName = '통계 대시보드';
const menuConfig = {
  appId,
  appName,
  icon: Activity,
  menus: [
    {
      menuId: 25,
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuId: 26,
      label: '모니터링',
      index: 1,
      hide: false,
      icon: IconMenuStatistics,
      children: [
        {
          menuId: 27,
          label: '대시보드',
          path: 'monitoring/dashboard',
          index: 0,
          hide: false,
        },
        {
          menuId: 28,
          label: '이력 조회',
          path: 'monitoring/history',
          index: 1,
          hide: false,
        },
        {
          menuId: 29,
          label: '스케줄러 제어',
          path: 'monitoring/scheduler',
          index: 2,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
