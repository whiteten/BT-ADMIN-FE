/**
 * 모니터링 설정 — 탭형 설정 허브.
 * <p>
 * 통계 설정(StatConfigPage)과 동일 컨셉. 지금은 "Redis 키 프리픽스" 탭만 있으나,
 * 향후 폴링 주기·임계 정책·표시 형식 등 설정이 탭으로 추가된다.
 * 각 탭은 TB_BT_IS_MON_CONFIG 의 한 카테고리를 담당한다.
 */

import { type ReactNode, useEffect, useState } from 'react';
import { type BreadcrumbProps } from 'antd';
import { Database } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import RedisPrefixSettingTab from '../../features/monitoring/components/config/RedisPrefixSettingTab';
import { cn } from '@/lib/utils';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '설정', path: '/insight/monitoring/config' },
];

type TabKey = 'redis-prefix';

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [{ key: 'redis-prefix', label: 'Redis 키 프리픽스', icon: <Database className="h-5 w-5" /> }];

export default function MonitoringConfigPage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [activeTab, setActiveTab] = useState<TabKey>('redis-prefix');

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col bg-white bt-shadow">
        {/* 탭 헤더 — StatConfigPage 스타일 */}
        <div className="flex h-[58px] min-h-[58px] w-full border-b border-[#E9EBEC] bg-white">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'inline-flex h-full w-auto cursor-pointer items-center border border-transparent border-r-[#E9EBEC] px-4 text-[#495057] transition-colors',
                activeTab === t.key && 'border-b-2 border-b-[var(--color-bt-primary)] font-semibold text-[var(--color-bt-primary)]',
              )}
            >
              <div className="flex min-w-[150px] items-center justify-center gap-2">
                {t.icon}
                <span>{t.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="min-h-0 flex-1 overflow-hidden p-6">{activeTab === 'redis-prefix' && <RedisPrefixSettingTab />}</div>
      </div>
    </div>
  );
}
