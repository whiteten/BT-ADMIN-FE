import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { toast } from '@/shared-util';
import RecogGroupEditModal from '../../features/stt-config/components/RecogGroupEditModal';
import RecogGroupTree, { type RecogTreeSelection } from '../../features/stt-config/components/RecogGroupTree';
import { recogQueryKeys, useCreateRecogGroup, useDeleteRecogGroup, useGetRecogGroupList } from '../../features/stt-config/hooks/useRecogQueries';
import RecogTargetList from '../../features/stt-config/tabs/RecogTargetList';
import RecogTargetSearch from '../../features/stt-config/tabs/RecogTargetSearch';
import type { RecogGroupCreateData, RecogGroupItem } from '../../features/stt-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '정답지 관리', path: '/stt/stt-config/recog/list' },
];

// 엔진 선택 시: 그룹 추가 폼
function EngineDetailPanel({ engineCode, onCreated }: { engineCode: string; onCreated: () => void }) {
  const [form] = Form.useForm<RecogGroupCreateData>();
  const { mutate: createGroup, isPending } = useCreateRecogGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('정답지 그룹이 추가되었습니다.');
        form.resetFields();
        onCreated();
      },
      onError: () => {
        toast.error('추가에 실패했습니다.');
      },
    },
  });

  const onFinish: FormProps<RecogGroupCreateData>['onFinish'] = (values) => {
    createGroup({ groupName: values.groupName, engineCode });
  };

  return (
    <div className="flex-1 bg-white bt-shadow p-7">
      <div className="flex items-center gap-2 text-[var(--color-bt-primary)] mb-6">
        <span className="text-[20px] font-bold">그룹 추가</span>
      </div>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="groupName" label="그룹명" required hasFeedback rules={[{ required: true, message: '그룹명을 입력해주세요.' }]}>
              <Input placeholder="그룹명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
          <Col>
            <Button color="primary" variant="solid" htmlType="submit" loading={isPending}>
              추가
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

// 그룹 선택 시: 정답지 등록 + 정답지 목록
function GroupDetailPanel({ group, onGroupDeleted, onGroupUpdated }: { group: RecogGroupItem; onGroupDeleted: () => void; onGroupUpdated: (group: RecogGroupItem) => void }) {
  const modal = useModal();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteRecogGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList.queryKey });
        onGroupDeleted();
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleDelete = () => {
    modal.confirm.delete({ onOk: () => deleteGroup(group.groupCode) });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* 그룹 액션 버튼 */}
      <div className="flex justify-end gap-2">
        <Button color="orange" variant="solid" loading={isDeleting} onClick={handleDelete}>
          그룹삭제
        </Button>
        <Button color="primary" variant="solid" onClick={() => setEditModalOpen(true)}>
          그룹수정
        </Button>
      </div>

      {/* 상단: 정답지 등록 */}
      <div className="flex-1 min-h-0 bg-white bt-shadow p-7 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 text-[var(--color-bt-primary)] mb-4">
          <span className="text-[20px] font-bold">정답지 등록</span>
        </div>
        <div className="flex-1 min-h-0">
          <RecogTargetSearch groupCode={group.groupCode} />
        </div>
      </div>

      {/* 하단: 정답지 목록 */}
      <div className="flex-1 min-h-0 bg-white bt-shadow p-7 overflow-hidden flex flex-col">
        <RecogTargetList groupCode={group.groupCode} />
      </div>

      <RecogGroupEditModal open={editModalOpen} group={group} onClose={() => setEditModalOpen(false)} onUpdated={onGroupUpdated} />
    </div>
  );
}

export default function RecogGroupList() {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<RecogTreeSelection | null>(null);

  const { data: groupList = [], isLoading } = useGetRecogGroupList();

  const handleGroupCreated = () => {
    queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList.queryKey });
  };

  const handleGroupDeleted = () => setSelection(null);

  const handleGroupUpdated = (updated: RecogGroupItem) => {
    setSelection({ type: 'group', group: updated });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {isLoading ? (
        <div className="flex items-center justify-center flex-1 bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* 좌측: 트리 */}
          <div className="w-[280px] shrink-0 bg-white bt-shadow p-4 overflow-y-auto">
            <RecogGroupTree
              groupList={groupList}
              selection={selection}
              onSelectEngine={(engineCode) => setSelection({ type: 'engine', engineCode })}
              onSelectGroup={(group) => setSelection({ type: 'group', group })}
            />
          </div>

          {/* 우측: 상세 */}
          <div className="flex-1 min-h-0 flex flex-col">
            {!selection ? (
              <div className="flex-1 bg-white bt-shadow flex items-center justify-center">
                <NoData message="좌측 트리에서 항목을 선택해주세요." iconSize={50} fontSize="text-lg" gap={2} />
              </div>
            ) : selection.type === 'engine' ? (
              <EngineDetailPanel engineCode={selection.engineCode} onCreated={handleGroupCreated} />
            ) : (
              <GroupDetailPanel group={selection.group} onGroupDeleted={handleGroupDeleted} onGroupUpdated={handleGroupUpdated} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
