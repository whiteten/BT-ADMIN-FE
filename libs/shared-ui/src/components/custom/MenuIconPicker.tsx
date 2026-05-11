import { type MouseEvent, useMemo, useState } from 'react';
import { Input, Popover, Tooltip } from 'antd';
import { Search, X } from 'lucide-react';
import { menuIconRegistry } from './menuIconRegistry';
import { cn } from '../../lib/utils';

interface MenuIconPickerProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
}

const ICON_KEYS = Object.keys(menuIconRegistry);

const MenuIconPicker = ({ value, onChange, placeholder = '아이콘 선택' }: MenuIconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const Selected = value ? menuIconRegistry[value] : null;

  const filtered = useMemo(() => {
    if (!search) return ICON_KEYS;
    const lowered = search.toLowerCase();
    return ICON_KEYS.filter((key) => key.toLowerCase().includes(lowered));
  }, [search]);

  const handleSelect = (key: string) => {
    onChange?.(key);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onChange?.(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const popoverContent = (
    <div className="w-[360px]">
      <Input
        placeholder="아이콘 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        prefix={<Search className="w-4 h-4 text-gray-400" />}
        allowClear
        size="small"
        className="!mb-3"
      />
      {filtered.length > 0 ? (
        <div className="max-h-[280px] overflow-y-auto grid grid-cols-8 gap-1.5 pr-1">
          {filtered.map((key) => {
            const Icon = menuIconRegistry[key];
            const isSelected = key === value;
            return (
              <Tooltip key={key} title={key} mouseEnterDelay={0.3}>
                <button
                  type="button"
                  onClick={() => handleSelect(key)}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded border border-transparent hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors',
                    isSelected && '!border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)]/10',
                  )}
                >
                  <Icon className="w-6 h-6" />
                </button>
              </Tooltip>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-sm text-gray-400 py-8">검색 결과 없음</div>
      )}
    </div>
  );

  return (
    <Popover content={popoverContent} trigger="click" open={open} onOpenChange={handleOpenChange} placement="bottomLeft">
      <div
        role="button"
        tabIndex={0}
        className="flex items-center gap-2 w-full h-[32px] px-3 border border-gray-300 rounded cursor-pointer hover:border-[var(--color-bt-primary)] bg-white"
      >
        {Selected ? (
          <>
            <Selected className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-sm text-gray-700 truncate">{value}</span>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
              aria-label="아이콘 해제"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-400">{placeholder}</span>
        )}
      </div>
    </Popover>
  );
};

MenuIconPicker.displayName = 'MenuIconPicker';

export default MenuIconPicker;
