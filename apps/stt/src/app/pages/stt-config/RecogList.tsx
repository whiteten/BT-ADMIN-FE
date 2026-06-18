import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import RecogGroupTree, { type RecogTreeSelection } from '../../features/stt-config/components/RecogGroupTree';
import RecogTargetList from '../../features/stt-config/components/RecogTargetList';
import RecogTargetSearch from '../../features/stt-config/components/RecogTargetSearch';
import { recogQueryKeys, useCreateRecogGroup } from '../../features/stt-config/hooks/useRecogQueries';
import type { RecogGroupCreateData, RecogGroupItem } from '../../features/stt-config/types';
import { IconBubble, IconDocument } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '인식률측정 관리', path: '/stt/stt-config/recog/list' },
];

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

function GroupDetailPanel({ group }: { group: RecogGroupItem }) {
  const RegisterTab = () => <RecogTargetSearch groupCode={group.groupCode} engineCode={group.engineCode} />;
  const ListTab = () => <RecogTargetList groupCode={group.groupCode} groupName={group.groupName} engineCode={group.engineCode} />;

  const tabs: PageTab[] = [
    { id: 'register', label: '정답지 등록', icon: IconBubble, component: RegisterTab },
    { id: 'list', label: '정답지 목록', icon: IconDocument, component: ListTab },
  ];

  return <PageTabs tabs={tabs} />;
}

export default function RecogList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<RecogTreeSelection | null>(null);

  const handleGroupCreated = () => {
    queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList._def });
  };

  const handleGroupDeleted = (groupCode: string) => {
    if (selection?.type === 'group' && selection.group.groupCode === groupCode) {
      setSelection(null);
    }
  };

  const handleGroupUpdated = (updated: RecogGroupItem) => {
    setSelection({ type: 'group', group: updated });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-[280px] shrink-0 bg-white bt-shadow p-4 overflow-y-auto">
          <RecogGroupTree
            selection={selection}
            onSelectEngine={(engineCode) => setSelection({ type: 'engine', engineCode })}
            onSelectGroup={(group) => setSelection({ type: 'group', group })}
            onGroupDeleted={handleGroupDeleted}
            onGroupUpdated={handleGroupUpdated}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {!selection ? (
            <div className="flex-1 bg-white bt-shadow flex items-center justify-center">
              <NoData message="좌측 트리에서 항목을 선택해주세요." iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : selection.type === 'engine' ? (
            <EngineDetailPanel engineCode={selection.engineCode} onCreated={handleGroupCreated} />
          ) : (
            <GroupDetailPanel key={selection.group.groupCode} group={selection.group} />
          )}
        </div>
      </div>
    </div>
  );
}
