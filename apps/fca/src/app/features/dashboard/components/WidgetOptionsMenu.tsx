import { Fragment, useState } from 'react';
import { Settings } from 'lucide-react';
import type { WidgetMenuAction } from '../constants/BotDashboardLayoutRenderMapper';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface WidgetOptionsMenuProps {
  menuActions?: WidgetMenuAction[];
  widgetOptions: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
}

const WidgetOptionsMenu = ({ menuActions, widgetOptions, onOptionChange }: WidgetOptionsMenuProps) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  if (!menuActions?.length) return null;

  const handleClose = () => setActiveAction(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className="inline-flex items-center justify-center w-8 h-8 cursor-pointer rounded border border-gray-300 text-gray-400 transition-colors hover:bg-gray-100">
            <Settings size={16} />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dark" align="end">
          {menuActions.map((action) => (
            <DropdownMenuItem key={action.key} onClick={() => setActiveAction(action.key)}>
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {menuActions.map((action) => (
        <Fragment key={action.key}>
          {action.renderContent({
            widgetOptions,
            setOption: onOptionChange,
            open: activeAction === action.key,
            onClose: handleClose,
          })}
        </Fragment>
      ))}
    </>
  );
};

export default WidgetOptionsMenu;
