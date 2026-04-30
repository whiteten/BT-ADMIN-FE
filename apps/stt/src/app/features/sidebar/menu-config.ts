import { Component } from 'lucide-react';
import { IconMenuBotConfig, IconMenuMain } from '@/components/custom/Icons';

const appId = 'stt';
const appName = 'STT';
const menuConfig = {
  appId,
  appName,
  icon: Component,
  menus: [
    {
      menuKey: 'stt-main',
      label: '메인',
      path: 'main',
      index: 0,
      icon: IconMenuMain,
      hide: false,
    },
    {
      menuKey: 'stt-mgmt',
      label: 'STT 관리',
      icon: IconMenuBotConfig,
      index: 1,
      hide: false,
      children: [
        {
          menuKey: 'stt-mgmt-search',
          label: 'STT 검색',
          path: 'stt-config/search/list',
          index: 0,
          hide: false,
        },
        {
          menuKey: 'stt-mgmt-train',
          label: '학습 데이터 관리',
          path: 'stt-config/training/list',
          index: 1,
          hide: false,
        },
        {
          menuKey: 'stt-mgmt-dictionary',
          label: '사전 관리',
          path: 'stt-config/dictionary/list',
          index: 2,
          hide: false,
        },
        {
          menuKey: 'stt-mgmt-recog',
          label: '정답지 관리',
          path: 'stt-config/recog/list',
          index: 3,
          hide: false,
        },
        {
          menuKey: 'stt-mgmt-model',
          label: '모델 관리',
          path: 'stt-config/model/list',
          index: 4,
          hide: false,
        },
        {
          menuKey: 'stt-mgmt-dn',
          label: 'STT 내선 관리',
          path: 'stt-config/dn',
          index: 5,
          hide: false,
        },
        {
          menuKey: 'stt-mgmt-file-upload',
          label: 'STT 파일업로드',
          path: 'stt-config/file-upload',
          index: 6,
          hide: false,
        },
      ],
    },
  ],
};

export default menuConfig;
