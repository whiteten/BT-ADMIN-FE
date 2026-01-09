import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer } from 'antd';
import type { SnapshotListItem } from '../types/snapshot';

/**
 * SnapshotCompareDrawer ref 타입
 */
export interface SnapshotCompareDrawerRef {
  open: (params: { modelId: string; data: SnapshotListItem }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
  data: SnapshotListItem | null;
}

/**
 * 스냅샷 비교 Drawer
 */
const SnapshotCompareDrawer = forwardRef<SnapshotCompareDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
    data: null,
  });

  const { open, data } = drawerState;

  useImperativeHandle(ref, () => ({
    open: ({ modelId, data }) => {
      setDrawerState({ open: true, modelId, data });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        닫기
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="스냅샷 비교"
      closable={{ placement: 'end' }}
      size={800}
      footer={footer}
      destroyOnHidden
      classNames={{
        body: '!p-0 !rounded-none',
        footer: '!py-2',
      }}
    >
      <div className="flex flex-col w-full h-full p-6 gap-6">
        {/* TODO: 스냅샷 비교 내용 구현 */}
        <div className="text-[#495057]">스냅샷 비교 내용.</div>
      </div>
    </Drawer>
  );
});

export default SnapshotCompareDrawer;
