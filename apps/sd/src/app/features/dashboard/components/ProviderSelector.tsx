import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProviderSelectorProps {
  providers: string[] | undefined;
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  cronExpression?: string;
}

export default function ProviderSelector({
  providers,
  selectedProvider,
  onProviderChange,
  cronExpression,
}: ProviderSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">Provider</span>
      <Select value={selectedProvider} onValueChange={onProviderChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Provider 선택" />
        </SelectTrigger>
        <SelectContent>
          {providers?.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {cronExpression && <Badge variant="default">Cron: {cronExpression}</Badge>}
    </div>
  );
}
