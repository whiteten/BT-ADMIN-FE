/**
 * 사용자 권한 할당 탭
 * - 역할과 무관하게 개별 사용자에게 권한 부여(GRANT) 또는 박탈(DENY)
 * - 다중 사용자 선택 가능
 * - 다중 권한 선택 가능 (Checkbox 트리)
 * - 만료일 지정 가능 (임시 권한)
 * - 사유 기록 필수
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Form, Input, Modal, Radio, Select, Tag, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import { Calendar, CheckCircle, Clock, Plus, Search, Shield, Trash2, Users, XCircle } from 'lucide-react';
import PermissionSelector from '../components/PermissionSelector';
import { appDummyData, userAuthDummyData, userRoleDummyData } from '../data/iam-dummy';
import type { UserAuth, UserAuthBatchGrantRequest, UserAuthStatus } from '../types/iam.types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const { RangePicker } = DatePicker;

// 사용자 옵션
const userOptions = [...new Set(userRoleDummyData.map((u) => u.userId))].map((userId) => ({
  label: userId,
  value: userId,
}));

// 권한 상태 계산
function getAuthStatus(auth: UserAuth): UserAuthStatus {
  const now = dayjs();
  const from = auth.effectiveFrom ? dayjs(auth.effectiveFrom) : null;
  const to = auth.effectiveTo ? dayjs(auth.effectiveTo) : null;

  if (to && now.isAfter(to)) return 'EXPIRED';
  if (from && now.isBefore(from)) return 'SCHEDULED';
  return 'ACTIVE';
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: number;
  valueColor?: string;
}

function StatCard({ icon: Icon, iconBg, label, value, valueColor = 'text-gray-900' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', iconBg)}>
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={cn('text-xl font-bold', valueColor)}>{value}</div>
      </div>
    </div>
  );
}

export default function UserOverrideTab() {
  const { gridOptions } = useAggridOptions();
  const [overrides, setOverrides] = useState<UserAuth[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  const columnDefs: ColDef<UserAuth>[] = useMemo(
    () => [
      { headerName: '사용자ID', field: 'userId', width: 130, pinned: 'left' },
      {
        headerName: '상태',
        field: 'id',
        width: 80,
        cellRenderer: (params: { data: UserAuth }) => {
          const status = getAuthStatus(params.data);
          if (status === 'EXPIRED') return <Tag color="default">만료</Tag>;
          if (status === 'SCHEDULED') return <Tag color="blue">예정</Tag>;
          return params.data.grantType === 'GRANT' ? <Tag color="green">허용</Tag> : <Tag color="red">차단</Tag>;
        },
      },
      {
        headerName: '유형',
        field: 'grantType',
        width: 90,
        cellRenderer: (params: { value: string; data: UserAuth }) => {
          const status = getAuthStatus(params.data);
          if (status === 'EXPIRED') return <span className="text-gray-400">{params.value === 'GRANT' ? '허용' : '차단'}</span>;
          return (
            <span className={cn('flex items-center gap-1', params.value === 'GRANT' ? 'text-green-600' : 'text-red-600')}>
              {params.value === 'GRANT' ? <CheckCircle className="size-3.5" /> : <XCircle className="size-3.5" />}
              {params.value === 'GRANT' ? '허용' : '차단'}
            </span>
          );
        },
      },
      {
        headerName: '앱',
        field: 'appId',
        width: 100,
        cellRenderer: (params: { value: string }) => <Tag color="cyan">{appDummyData.find((a) => a.appId === params.value)?.appName}</Tag>,
      },
      { headerName: '권한', field: 'permDescription', flex: 1, minWidth: 150 },
      {
        headerName: '권한 키',
        field: 'authKey',
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: { value: string }) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{params.value}</code>,
      },
      {
        headerName: '적용 기간',
        field: 'effectiveFrom',
        width: 200,
        cellRenderer: (params: { data: UserAuth }) => {
          const from = params.data.effectiveFrom;
          const to = params.data.effectiveTo;
          const status = getAuthStatus(params.data);

          if (!from && !to) return <span className="text-gray-400">무기한</span>;

          const fromStr = from ? dayjs(from).format('YYYY-MM-DD') : '즉시';
          const toStr = to ? dayjs(to).format('YYYY-MM-DD') : '무기한';

          return (
            <span className={cn(status === 'EXPIRED' && 'text-gray-400 line-through', status === 'SCHEDULED' && 'text-blue-600')}>
              {fromStr} ~ {toStr}
            </span>
          );
        },
      },
      {
        headerName: '사유',
        field: 'reason',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: { value: string }) => (
          <Tooltip title={params.value}>
            <span className="truncate">{params.value}</span>
          </Tooltip>
        ),
      },
      { headerName: '등록자', field: 'createdBy', width: 100 },
      {
        headerName: '',
        width: 60,
        pinned: 'right',
        cellRenderer: (params: { data: UserAuth }) => <Button type="text" danger size="small" icon={<Trash2 className="size-3.5" />} onClick={() => handleDelete(params.data)} />,
      },
    ],
    [],
  );

  const handleSearch = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      let filtered = userAuthDummyData;
      if (searchUserId) filtered = filtered.filter((u) => u.userId.includes(searchUserId));
      if (statusFilter) {
        filtered = filtered.filter((u) => {
          const status = getAuthStatus(u);
          if (statusFilter === 'ACTIVE') return status === 'ACTIVE';
          if (statusFilter === 'SCHEDULED') return status === 'SCHEDULED';
          if (statusFilter === 'EXPIRED') return status === 'EXPIRED';
          return true;
        });
      }
      setOverrides(filtered);
      setLoading(false);
    }, 300);
  }, [searchUserId, statusFilter]);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setSelectedPermissions(new Set());
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 선택된 사용자/권한 검증
      if (!values.userIds || values.userIds.length === 0) {
        message.warning('사용자를 선택해주세요.');
        return;
      }
      if (selectedPermissions.size === 0) {
        message.warning('권한을 선택해주세요.');
        return;
      }

      const request: UserAuthBatchGrantRequest = {
        userIds: values.userIds,
        authIds: Array.from(selectedPermissions),
        grantType: values.grantType,
        reason: values.reason,
        effectiveFrom: values.effectiveRange?.[0]?.format('YYYY-MM-DD HH:mm:ss'),
        effectiveTo: values.effectiveRange?.[1]?.format('YYYY-MM-DD HH:mm:ss'),
      };

      console.log('Save user auth override (batch):', request);

      // 생성될 레코드 수
      const totalRecords = request.userIds.length * request.authIds.length;

      // API 호출 시뮬레이션
      message.success(
        `${request.userIds.length}명의 사용자에게 ${request.authIds.length}개의 권한이 ${values.grantType === 'GRANT' ? '부여' : '박탈'}되었습니다. (총 ${totalRecords}건)`,
      );
      setModalOpen(false);
      handleSearch();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDelete = (item: UserAuth) => {
    Modal.confirm({
      title: '권한 설정 삭제',
      content: `사용자 [${item.userId}]의 "${item.permDescription}" 설정을 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        message.success('삭제되었습니다.');
        handleSearch();
      },
    });
  };

  // 통계 계산
  const stats = useMemo(() => {
    const all = userAuthDummyData;
    return {
      total: all.length,
      grants: all.filter((r) => r.grantType === 'GRANT' && getAuthStatus(r) === 'ACTIVE').length,
      denies: all.filter((r) => r.grantType === 'DENY' && getAuthStatus(r) === 'ACTIVE').length,
      scheduled: all.filter((r) => getAuthStatus(r) === 'SCHEDULED').length,
      expired: all.filter((r) => getAuthStatus(r) === 'EXPIRED').length,
    };
  }, []);

  const statusOptions = [
    { label: '전체 상태', value: '' },
    { label: '유효', value: 'ACTIVE' },
    { label: '예정', value: 'SCHEDULED' },
    { label: '만료', value: 'EXPIRED' },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 통계 카드 */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon={Shield} iconBg="from-slate-500 to-slate-600" label="전체" value={stats.total} />
        <StatCard icon={CheckCircle} iconBg="from-green-500 to-emerald-600" label="허용" value={stats.grants} valueColor="text-green-600" />
        <StatCard icon={XCircle} iconBg="from-red-500 to-rose-600" label="차단" value={stats.denies} valueColor="text-red-600" />
        <StatCard icon={Clock} iconBg="from-blue-500 to-indigo-600" label="예정" value={stats.scheduled} valueColor="text-blue-600" />
        <StatCard icon={Calendar} iconBg="from-gray-400 to-gray-500" label="만료" value={stats.expired} valueColor="text-gray-500" />
      </div>

      {/* 필터 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <Select
            showSearch
            allowClear
            placeholder="사용자 선택"
            options={userOptions}
            value={searchUserId || undefined}
            onChange={(v) => setSearchUserId(v || '')}
            className="!w-[180px]"
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <Select options={statusOptions} value={statusFilter} onChange={setStatusFilter} className="!w-[120px]" />
          <Button type="primary" icon={<Search className="size-4" />} onClick={handleSearch}>
            검색
          </Button>
        </div>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleAdd}>
          권한 부여/차단
        </Button>
      </div>

      {/* 그리드 */}
      <div className="flex-1">
        <AgGridReact<UserAuth> {...{ rowData: overrides, columnDefs, gridOptions, loading }} />
      </div>

      {/* 권한 부여/박탈 모달 (다중 선택) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Users className="size-5 text-blue-600" />
            <span>사용자 권한 부여/차단 (다중 선택)</span>
          </div>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="저장"
        cancelText="취소"
        width={700}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          {/* 사용자 다중 선택 */}
          <Form.Item
            label={
              <span className="flex items-center gap-2">
                <Users className="size-4 text-gray-500" />
                사용자 (다중 선택)
              </span>
            }
            name="userIds"
            rules={[{ required: true, message: '사용자를 선택해주세요' }]}
          >
            <Select
              mode="multiple"
              showSearch
              placeholder="사용자를 선택하세요 (여러 명 선택 가능)"
              options={userOptions}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              maxTagCount="responsive"
            />
          </Form.Item>

          {/* 유형 선택 */}
          <Form.Item label="유형" name="grantType" rules={[{ required: true, message: '유형을 선택해주세요' }]}>
            <Radio.Group className="w-full">
              <Radio.Button value="GRANT" className="w-1/2 text-center">
                <span className="inline-flex items-center justify-center gap-1">
                  <CheckCircle className="size-3.5 text-green-500" />
                  권한 허용
                </span>
              </Radio.Button>
              <Radio.Button value="DENY" className="w-1/2 text-center">
                <span className="inline-flex items-center justify-center gap-1">
                  <XCircle className="size-3.5 text-red-500" />
                  권한 차단
                </span>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* 권한 다중 선택 (Checkbox 트리) */}
          <Form.Item
            label={
              <span className="flex items-center gap-2">
                <Shield className="size-4 text-gray-500" />
                권한 (다중 선택)
                {selectedPermissions.size > 0 && <Tag color="blue">{selectedPermissions.size}개 선택</Tag>}
              </span>
            }
            required
          >
            <PermissionSelector value={selectedPermissions} onChange={setSelectedPermissions} />
          </Form.Item>

          {/* 적용 기간 */}
          <Form.Item label="적용 기간" name="effectiveRange" help="설정하지 않으면 즉시 적용, 무기한 유지됩니다.">
            <RangePicker showTime className="w-full" placeholder={['시작일', '종료일']} />
          </Form.Item>

          {/* 사유 */}
          <Form.Item label="사유" name="reason" rules={[{ required: true, message: '사유를 입력해주세요' }]}>
            <Input.TextArea rows={3} placeholder="권한 부여/차단 사유를 입력하세요" />
          </Form.Item>

          {/* 요약 정보 */}
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const userIds = getFieldValue('userIds') || [];
              const grantType = getFieldValue('grantType');
              const totalRecords = userIds.length * selectedPermissions.size;

              if (userIds.length > 0 && selectedPermissions.size > 0) {
                return (
                  <div className="bg-gray-50 border rounded-lg p-3 text-sm">
                    <div className="font-medium mb-2">생성 예정:</div>
                    <div className="text-gray-600">
                      <span className="text-blue-600 font-semibold">{userIds.length}</span>명의 사용자 x{' '}
                      <span className="text-blue-600 font-semibold">{selectedPermissions.size}</span>개의 권한 ={' '}
                      <span className={`font-bold ${grantType === 'GRANT' ? 'text-green-600' : 'text-red-600'}`}>
                        총 {totalRecords}건 {grantType === 'GRANT' ? '부여' : '차단'}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
