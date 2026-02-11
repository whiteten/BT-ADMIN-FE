/**
 * 클라이언트 시크릿 1회 표시 다이얼로그
 * - 생성/재생성 시에만 1회 표시
 * - 복사 기능 제공
 * - 경고 메시지 표시
 */

import { useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ClientSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientSecret: string;
  clientKey: string;
}

export function ClientSecretDialog({ open, onOpenChange, clientSecret, clientKey }: ClientSecretDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(clientSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>클라이언트 시크릿 생성 완료</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-950/30">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">⚠️ 중요: 이 시크릿은 다시 확인할 수 없습니다.</p>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">지금 안전한 곳에 저장하세요. 분실 시 시크릿을 재생성해야 합니다.</p>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">클라이언트 키</label>
                <p className="mt-1 rounded-md bg-gray-100 p-3 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">{clientKey}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">클라이언트 시크릿</label>
                <div className="mt-1 flex items-center gap-2">
                  <p className="flex-1 rounded-md bg-gray-100 p-3 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">{clientSecret}</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                    {copied ? (
                      <>
                        <CheckCircle2 className="mr-1 size-4" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-4" />
                        복사
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
