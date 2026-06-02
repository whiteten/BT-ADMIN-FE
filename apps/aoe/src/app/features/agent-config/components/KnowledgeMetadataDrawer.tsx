import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Modal, Select, Tag } from 'antd';
import { Clock, Hash, Plus, ToggleLeft, Trash2, Type } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { knowledgeQueryKeys, useAddKnowledgeMetadata, useDeleteKnowledgeMetadata, useGetKnowledgeMetadata } from '../hooks/useKnowledgeQueries';
import type { MetaType } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export interface KnowledgeMetadataDrawerRef {
  open: (params: { documentId: string }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  documentId: string;
}

const META_TYPE_OPTIONS = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'time', value: 'time' },
  { label: 'boolean', value: 'boolean' },
];

function getTypeIcon(type: MetaType) {
  const cls = 'size-4 shrink-0';
  switch (type) {
    case 'string':
      return <Type className={`${cls} text-blue-500`} />;
    case 'number':
      return <Hash className={`${cls} text-purple-500`} />;
    case 'time':
      return <Clock className={`${cls} text-orange-500`} />;
    case 'boolean':
      return <ToggleLeft className={`${cls} text-green-500`} />;
  }
}

const KnowledgeMetadataDrawer = forwardRef<KnowledgeMetadataDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, documentId: '' });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form] = Form.useForm<{ metaName: string; metaType: MetaType }>();

  const { open, documentId } = drawerState;

  const { data: metadata, isFetching } = useGetKnowledgeMetadata({
    params: { documentId },
    queryOptions: { enabled: open && !!documentId },
  });

  const { mutate: addMetadata, isPending: isAdding } = useAddKnowledgeMetadata({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메타데이터가 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeMetadata({ documentId }).queryKey });
        setAddModalOpen(false);
        form.resetFields();
      },
      onError: (error) => Log.warn('addMetadata failed', error),
    },
  });

  const { mutate: deleteMetadata } = useDeleteKnowledgeMetadata({
    mutationOptions: {
      onSuccess: () => {
        toast.success('메타데이터가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeMetadata({ documentId }).queryKey });
      },
      onError: (error) => Log.warn('deleteMetadata failed', error),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (params) => setDrawerState({ open: true, documentId: params.documentId }),
    close: () => setDrawerState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setDrawerState((prev) => ({ ...prev, open: false }));

  const handleAddConfirm = () => {
    form.validateFields().then((values) => {
      addMetadata({ params: { documentId }, data: values });
    });
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    form.resetFields();
  };

  return (
    <>
      <Drawer
        title="메타데이터"
        extra={<span className="text-xs text-gray-400">이 지식에 모든 메타데이터를 관리할 수 있습니다</span>}
        open={open}
        onClose={handleClose}
        closable={{ placement: 'end' }}
        size={420}
        footer={
          <Button type="primary" block icon={<Plus className="size-4" />} onClick={() => setAddModalOpen(true)}>
            메타데이터 추가
          </Button>
        }
        destroyOnHidden
      >
        {isFetching ? (
          <div className="flex items-center justify-center h-32">
            <FallbackSpinner />
          </div>
        ) : !metadata?.length ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-500">아직 메타데이터가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {metadata.map((item) => (
              <div
                key={item.metaId}
                className="group flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:border-[var(--color-bt-primary)]/40 hover:bg-[#EAF2FB]/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {getTypeIcon(item.metaType)}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">이름</span>
                      <span className="text-sm font-medium font-mono">{item.metaName}</span>
                      {item.isBuiltIn && (
                        <Tag color="default" className="!text-[10px]">
                          내장
                        </Tag>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">타입</span>
                      <span className="text-xs text-gray-600">{item.metaType}</span>
                    </div>
                  </div>
                </div>
                {!item.isBuiltIn && (
                  <button type="button" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMetadata({ documentId, metaId: item.metaId })}>
                    <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Modal
        title="메타데이터 추가"
        open={addModalOpen}
        onCancel={handleCloseAddModal}
        onOk={handleAddConfirm}
        confirmLoading={isAdding}
        okText="추가"
        cancelText="취소"
        destroyOnHidden
        centered
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="metaName" label="이름" rules={[{ required: true, message: '이름을 입력해 주세요.' }]}>
            <Input placeholder="메타데이터 이름을 입력하세요." />
          </Form.Item>
          <Form.Item name="metaType" label="타입" initialValue="string" rules={[{ required: true }]}>
            <Select options={META_TYPE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
});

KnowledgeMetadataDrawer.displayName = 'KnowledgeMetadataDrawer';
export default KnowledgeMetadataDrawer;
