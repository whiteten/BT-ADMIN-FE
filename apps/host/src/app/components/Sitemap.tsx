// import { useMenuStore } from '@/shared-store';
import { useState } from 'react';
import { Drawer, Input } from 'antd';
import { Search } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import { ReactComponent as IconSitemap } from '../../assets/images/icon/icon-sitemap.svg';
import { Button } from '@/components/ui/button';
import { cn } from '@/libs/shared-ui/src/lib/utils';

export default function Sitemap({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { menuConfigs } = useMenuStore();
  const [open, setOpen] = useState(false);
  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button variant="ghost" className={cn('size-7', className)} aria-label="Open sitemap" {...props} onClick={() => setOpen(true)}>
        <IconSitemap className="size-5.5 text-[#495057]" />
        <span className="sr-only">sitemap</span>
      </Button>
      <Drawer open={open} onClose={onClose} title="Sitemap" closable={{ placement: 'end' }} size={1128} className="!overflow-hidden">
        <div className="w-full h-full overflow-y-auto">
          <div className="sticky top-0 z-10 w-full h-auto bg-white/90 flex items-center justify-center mb-4">
            <Input placeholder="메뉴 검색" prefix={<Search className="size-4 text-gray-400" />} className="!w-[400px]" />
          </div>
          <div className="w-full">
            {/* TODO: 메뉴 데이터 기반 사이트맵 생성 및 북마크 기능 구현 */}
            <pre>{JSON.stringify(menuConfigs, null, 4)}</pre>
          </div>
        </div>
      </Drawer>
    </>
  );
}
