import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, InputNumber } from 'antd';
import { Check, X } from 'lucide-react';
import { toast } from '@/shared-util';
import type { ClusterAllocation, UpdateClusterRequest } from '../types/license.types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface ClusterAllocModalRef {
  open: (params: { licenseKind: string; kindName: string; clusters: ClusterAllocation[]; totalQty: number }) => void;
  close: () => void;
}

interface ClusterAllocModalProps {
  onSave: (data: { licenseKind: string; request: UpdateClusterRequest }) => void;
  isLoading?: boolean;
}

interface ClusterRow {
  clusterId: number;
  clusterName: string;
  quantity: number;
}

const ClusterAllocModal = forwardRef<ClusterAllocModalRef, ClusterAllocModalProps>(({ onSave, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [licenseKind, setLicenseKind] = useState<string>('');
  const [kindName, setKindName] = useState<string>('');
  const [totalQty, setTotalQty] = useState<number>(0);
  const [rows, setRows] = useState<ClusterRow[]>([]);

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setLicenseKind(params.licenseKind);
      setKindName(params.kindName);
      setTotalQty(params.totalQty);
      setRows(
        params.clusters.map((c) => ({
          clusterId: c.clusterId,
          clusterName: c.clusterName,
          quantity: c.allocatedQuantity,
        })),
      );
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const allocSum = rows.reduce((sum, row) => sum + row.quantity, 0);
  const isMatch = allocSum === totalQty;
  const isOverAllocated = allocSum > totalQty;

  const handleQtyChange = (index: number, value: number | null) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, quantity: value ?? 0 } : row)));
  };

  const handleSave = () => {
    if (isOverAllocated) {
      toast.warning(`할당 합계(${allocSum.toLocaleString()})가 총 수량(${totalQty.toLocaleString()})을 초과합니다.`);
      return;
    }
    onSave({
      licenseKind,
      request: {
        allocations: rows.map((row) => ({ clusterId: row.clusterId, quantity: row.quantity })),
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>클러스터 할당</DialogTitle>
          <DialogDescription>
            {kindName} - 총 {totalQty.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 font-medium">클러스터</th>
                <th className="text-right py-2 font-medium pr-2">할당 수량</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.clusterId} className="border-b border-slate-100">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-sm text-slate-700">{row.clusterName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-2">
                    <InputNumber
                      min={0}
                      max={totalQty}
                      value={row.quantity}
                      onChange={(value) => handleQtyChange(index, value)}
                      className="!w-28"
                      size="small"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => Number(value?.replace(/,/g, '') ?? 0)}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-sm text-slate-400">
                    클러스터 할당 정보가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 합계 + 상태 */}
        {rows.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">합계</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-600">{allocSum.toLocaleString()}</span>
              <span className="text-sm text-slate-400">/</span>
              <span className="text-sm text-slate-500">{totalQty.toLocaleString()}</span>
              {isMatch ? (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Check className="w-3 h-3" />
                  일치
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <X className="w-3 h-3" />
                  불일치 ({allocSum > totalQty ? '+' : ''}
                  {(allocSum - totalQty).toLocaleString()})
                </span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>취소</Button>
          <Button type="primary" onClick={handleSave} loading={isLoading} disabled={isOverAllocated}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ClusterAllocModal.displayName = 'ClusterAllocModal';
export default ClusterAllocModal;
