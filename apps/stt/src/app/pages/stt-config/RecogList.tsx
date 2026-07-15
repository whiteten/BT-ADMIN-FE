import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row, Segmented } from 'antd';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import RecogGroupTree, { type RecogTreeSelection } from '../../features/stt-config/components/RecogGroupTree';
import { modelQueryKeys } from '../../features/stt-config/hooks/useModelQueries';
import { recogQueryKeys, useCreateRecogGroup } from '../../features/stt-config/hooks/useRecogQueries';
import RecogEvaluate from '../../features/stt-config/tabs/RecogEvaluate';
import RecogTargetList from '../../features/stt-config/tabs/RecogTargetList';
import RecogTargetSearch from '../../features/stt-config/tabs/RecogTargetSearch';
import type { RecogGroupCreateData, RecogGroupItem } from '../../features/stt-config/types';
import { IconBubble, IconChartLine, IconDocument } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import ScopeSelect from '@/components/custom/ScopeSelect';

const RecogGroupContext = createContext<RecogGroupItem | null>(null);

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

function RegisterTabContent() {
  const group = useContext(RecogGroupContext)!;
  return <RecogTargetSearch groupCode={group.groupCode} engineCode={group.engineCode} />;
}

function ListTabContent() {
  const group = useContext(RecogGroupContext)!;
  return <RecogTargetList groupCode={group.groupCode} groupName={group.groupName} engineCode={group.engineCode} />;
}

function EvaluateTabContent() {
  const group = useContext(RecogGroupContext)!;
  return <RecogEvaluate groupCode={group.groupCode} groupName={group.groupName} engineCode={group.engineCode} />;
}

type GroupDetailMode = 'register' | 'list' | 'evaluate';

const GROUP_DETAIL_MODE_LABELS: Record<GroupDetailMode, string> = {
  register: '정답지 등록',
  list: '정답지 목록',
  evaluate: '인식률 측정',
};

const GROUP_DETAIL_MODE_ICONS: Record<GroupDetailMode, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  register: IconBubble,
  list: IconDocument,
  evaluate: IconChartLine,
};

/** 탭 대신 Segmented 토글 (SearchList.tsx 패턴 동일) — 선택된 토글만 primary 색으로 강조. */
function buildGroupDetailModeOptions(mode: GroupDetailMode) {
  return (Object.keys(GROUP_DETAIL_MODE_LABELS) as GroupDetailMode[]).map((value) => {
    const Icon = GROUP_DETAIL_MODE_ICONS[value];
    return {
      value,
      label: (
        <span
          className={`flex items-center justify-center gap-2 w-[150px] px-2 py-0.5 text-[15px] ${
            value === mode ? 'font-bold text-[var(--color-bt-primary)]' : 'font-medium text-gray-500'
          }`}
        >
          <Icon className="h-5 w-5" />
          {GROUP_DETAIL_MODE_LABELS[value]}
        </span>
      ),
    };
  });
}

function GroupDetailPanel({ group, scopeSelect }: { group: RecogGroupItem; scopeSelect?: React.ReactNode }) {
  const [mode, setMode] = useState<GroupDetailMode>('register');

  return (
    <RecogGroupContext.Provider value={group}>
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center gap-4 w-full flex-wrap flex-shrink-0">
          <Segmented options={buildGroupDetailModeOptions(mode)} value={mode} onChange={setMode} size="large" />
          {scopeSelect}
        </header>
        <div className="flex-1 min-h-0 flex flex-col">
          {mode === 'register' && <RegisterTabContent />}
          {mode === 'list' && <ListTabContent />}
          {mode === 'evaluate' && <EvaluateTabContent />}
        </div>
      </div>
    </RecogGroupContext.Provider>
  );
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

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): apiClient 가 X-Act-As-Tenant 주입 → X 테넌트로 조회 스코프
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);

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

  // 그룹 상세 탭바(GROUP_DETAIL_TABS)의 extra 슬롯에 얹는다 — SearchList의 헤더 행(Segmented+ScopeSelect)과
  // 동일하게, 탭바와 한 행에 나란히 붙어야 한다(별도 박스로 떼어두지 않는다).
  const scopeSelect = operatorMode ? (
    <ScopeSelect
      kind="tenant"
      options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
      value={actAsTenantId}
      onChange={(id) => {
        setActAsTenant(id);
        void queryClient.invalidateQueries({ queryKey: recogQueryKeys._def });
        void queryClient.invalidateQueries({ queryKey: modelQueryKeys._def });
      }}
    />
  ) : null;

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
            <GroupDetailPanel group={selection.group} scopeSelect={scopeSelect} />
          )}
        </div>
      </div>
    </div>
  );
}
