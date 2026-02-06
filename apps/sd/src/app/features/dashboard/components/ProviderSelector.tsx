import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProviderSelectorProps {
  providers: string[] | undefined;
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  /** 선택된 Provider의 Cron 표현식 (선택사항) */
  cronExpression?: string;
}

/**
 * Provider 선택 컴포넌트
 * - Provider 목록을 드롭다운으로 표시
 * - 선택된 Provider의 Cron 표현식을 Badge로 표시 (선택사항)
 */
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
      {cronExpression && (
        <Badge variant="default">Cron: {cronExpression}</Badge>
      )}
    </div>
  );
}
