import { AlertTriangle, ClipboardCopy } from 'lucide-react';
import { toast } from '@/shared-util';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ExceptionRecord } from '../types/sd.types';
import { formatDate } from '../hooks/useSdHelpers';

interface ExceptionDetailDialogProps {
  exception: ExceptionRecord | null;
  onClose: () => void;
}

export default function ExceptionDetailDialog({ exception, onClose }: ExceptionDetailDialogProps) {
  const handleCopy = async () => {
    if (!exception) return;
    const text = `시간: ${exception.errTime}\n프로세스: ${exception.triggerName}\n\n${exception.errMessage}`;
    await navigator.clipboard.writeText(text);
    toast.success('에러 메시지가 복사되었습니다.');
  };

  return (
    <Dialog open={!!exception} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            에러 상세
          </DialogTitle>
        </DialogHeader>
        {exception && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">시간: </span>
                <span className="font-medium">{formatDate(exception.errTime, 'DATETIME')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">프로세스: </span>
                <span className="font-medium">{exception.triggerName}</span>
              </div>
            </div>
            <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
              {exception.errMessage}
            </pre>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <ClipboardCopy className="mr-1 h-3 w-3" /> 복사
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
