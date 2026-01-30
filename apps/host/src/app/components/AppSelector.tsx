import { Check } from 'lucide-react';
import { ReactComponent as IconAppSelect } from '../../assets/images/icon/icon-app-select.svg';
import useRemoteSelector from '../hooks/useRemoteSelector';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function AppSelector({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { remotes, selectedRemote, setSelectedRemote } = useRemoteSelector();

  const TriggerBtn = (
    <Button variant="ghost" className={cn('size-7', className)} {...props}>
      <IconAppSelect className="size-6" />
      <span className="sr-only">App Select</span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{TriggerBtn}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="end">
        <DropdownMenuLabel>Select Application</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {remotes.map((remote) => (
            <DropdownMenuItem key={remote.appId} onSelect={() => setSelectedRemote(remote)} className="hover:cursor-pointer">
              {remote.icon && <remote.icon />}
              <span className="truncate w-[150px]">{remote.appName}</span>
              {remote.appId === selectedRemote?.appId && <Check className="ml-auto stroke-green-500 stroke-[4]" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
