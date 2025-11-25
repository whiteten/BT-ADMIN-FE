import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { Map } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { FavoriteButton } from '../features/layout/components/FavoriteButton';
import { Button } from '@/components/ui/button';
import type { MenuConfigWithRootPath, MenuItem } from '@/libs/shared-store/src/types/menu.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

// ============ Sub Components ============

interface SitemapLeafItemProps {
  item: MenuItem;
  rootPath: string;
  onMenuClick: (rootPath: string, path: string) => void;
}

function SitemapLeafItem({ item, rootPath, onMenuClick }: SitemapLeafItemProps) {
  const leafPath = item.path;
  if (!leafPath) return null;

  return (
    <li className="group flex items-center justify-between rounded-md pl-2 pr-1 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-gray-300 text-[10px]">•</span>
        <button type="button" onClick={() => onMenuClick(rootPath, leafPath)} className="truncate hover:underline hover:text-sky-600 transition-colors text-left cursor-pointer">
          {item.label}
        </button>
      </div>
      <div className="ml-2 flex items-center gap-1">
        <FavoriteButton menuId={item.id} label={item.label} path={leafPath} rootPath={rootPath} />
      </div>
    </li>
  );
}

interface SitemapMenuItemProps {
  item: MenuItem;
  rootPath: string;
  itemIdx: number;
  onMenuClick: (rootPath: string, path: string) => void;
}

function SitemapMenuItem({ item, rootPath, itemIdx, onMenuClick }: SitemapMenuItemProps) {
  const itemPath = item.path;
  const hasChildren = (item.children ?? []).length > 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 group">
        <div className="min-w-0 flex-1">
          {itemPath ? (
            <button
              type="button"
              onClick={() => onMenuClick(rootPath, itemPath)}
              className="truncate text-sm font-semibold text-gray-800 hover:text-sky-600 hover:underline transition-colors text-left cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <div className="truncate text-sm font-semibold text-gray-700">{item.label}</div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">{itemPath && <FavoriteButton menuId={item.id} label={item.label} path={itemPath} rootPath={rootPath} />}</div>
      </div>

      {hasChildren && (
        <ul className="space-y-0.5 pl-2 border-l border-gray-200">
          {item.children?.map((childItem, childIdx) => (
            <SitemapLeafItem key={`${rootPath}-${itemIdx}-${childIdx}`} item={childItem} rootPath={rootPath} onMenuClick={onMenuClick} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface SitemapSectionProps {
  config: MenuConfigWithRootPath;
  onMenuClick: (rootPath: string, path: string) => void;
}

function SitemapSection({ config, onMenuClick }: SitemapSectionProps) {
  return (
    <section className="w-full">
      <div className="mb-6 pb-3 border-b border-sky-200">
        <h2 className="text-lg font-semibold text-sky-600">{config.groupLabel}</h2>
      </div>

      <div className="grid gap-x-8 gap-y-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {config.items.map((item, itemIdx) => (
          <SitemapMenuItem key={`${config.rootPath}-${itemIdx}`} item={item} rootPath={config.rootPath} itemIdx={itemIdx} onMenuClick={onMenuClick} />
        ))}
      </div>
    </section>
  );
}

// ============ Main Component ============
export default function Sitemap({ className, ...props }: React.ComponentProps<typeof Button>) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { menuConfigs } = useMenuStore();

  const handleMenuClick = (rootPath: string, path: string) => {
    navigate(`/${rootPath}/${path}`);
    setIsOpen(false);
  };

  return (
    <>
      <Button variant="ghost" className={cn('size-7', className)} aria-label="Open sitemap" {...props} onClick={() => setIsOpen(true)}>
        <Map className="size-5 text-[#495057]" />
        <span className="sr-only">sitemap</span>
      </Button>

      <Modal
        title={<h1 className="text-2xl font-bold">Sitemap</h1>}
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        footer={null}
        width="90vw"
        centered
        wrapClassName="!overflow-hidden"
      >
        <div className="h-[85vh] space-y-12 overflow-y-auto p-4">
          {menuConfigs.map((config) => (
            <SitemapSection key={config.rootPath} config={config} onMenuClick={handleMenuClick} />
          ))}
        </div>
      </Modal>
    </>
  );
}
