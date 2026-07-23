/**
 * DN 할당 Dialog (AS-IS IPR20S2055_UserAssign 팝업).
 *
 * 현재 할당 DN 표시 + 할당가능 DN(내선, 미할당+본인) prefix 검색 → 단일 선택 할당/해제.
 * 비활성 사용자는 페이지에서 버튼 자체를 비활성 처리(사유 툴팁).
 */
import { useState } from 'react';
import { Button, Input, Modal, Radio } from 'antd';
import { Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { useAssignIptUserDn, useGetAssignableDns, useUnassignIptUserDn } from '../hooks/useIptUserQueries';
import type { IptUserResponse } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface DnAssignDialogProps {
  open: boolean;
  user: IptUserResponse | null;
  onClose: () => void;
}

export default function DnAssignDialog({ open, user, onClose }: DnAssignDialogProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchDnNo, setSearchDnNo] = useState<string | undefined>(undefined);
  const [selectedDnId, setSelectedDnId] = useState<number | null>(null);

  const { data: dns = [], isLoading } = useGetAssignableDns(open ? user?.ieUserid : null, searchDnNo);

  const { mutate: assignDn, isPending: isAssigning } = useAssignIptUserDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DN이 할당되었습니다.');
        onClose();
      },
    },
  });
  const { mutate: unassignDn, isPending: isUnassigning } = useUnassignIptUserDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('DN 할당이 해제되었습니다.');
        onClose();
      },
    },
  });

  const handleClose = () => {
    setSearchInput('');
    setSearchDnNo(undefined);
    setSelectedDnId(null);
    onClose();
  };

  const handleAssign = () => {
    if (!user || selectedDnId == null) return;
    assignDn({ ieUserId: user.ieUserid, dnId: selectedDnId });
  };

  return (
    <Modal
      title={`DN 할당 — ${user?.userName ?? ''} (${user?.userId ?? ''})`}
      open={open}
      onCancel={handleClose}
      width={480}
      footer={
        <div className="flex justify-between">
          <Button danger disabled={!user?.dnId} loading={isUnassigning} onClick={() => user && unassignDn(user.ieUserid)}>
            할당 해제
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" disabled={selectedDnId == null} loading={isAssigning} onClick={handleAssign}>
              할당
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-3 text-[13px]">
        <span className="text-gray-500">현재 할당 DN: </span>
        <span className="font-semibold text-gray-800">{user?.dnNo ?? '미할당'}</span>
      </div>
      <Input.Search
        allowClear
        prefix={<Search className="size-3.5 text-gray-400" />}
        placeholder="DN번호 prefix 검색"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onSearch={(v) => setSearchDnNo(v || undefined)}
        className="mb-3"
      />
      <div className="max-h-72 overflow-auto rounded border border-gray-100">
        {isLoading && <FallbackSpinner size={32} />}
        {!isLoading && dns.length === 0 && <div className="py-8 text-center text-sm text-[var(--color-bt-fg-muted)]">할당 가능한 DN이 없습니다.</div>}
        {!isLoading &&
          dns.map((dn) => (
            <label key={dn.dnId} className="flex cursor-pointer items-center gap-2 border-b border-gray-50 px-3 py-2 hover:bg-gray-50">
              <Radio checked={selectedDnId === dn.dnId} onChange={() => setSelectedDnId(dn.dnId)} />
              <span className="flex-1 text-[13px] text-gray-800">{dn.dnNo}</span>
              {dn.assignedToSelf && <span className="text-[11px] text-[var(--color-bt-primary)]">현재 할당</span>}
            </label>
          ))}
      </div>
    </Modal>
  );
}
