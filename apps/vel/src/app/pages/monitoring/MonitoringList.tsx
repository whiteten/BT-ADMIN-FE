import React, { useEffect, useRef, useState } from 'react';
import { AutoComplete, Button, Checkbox, Form, Input, Popover, Select, Space, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast, withBasePath } from '@/shared-util';
import icoWait from '../../../assets/ico_01.gif';
import icoRec from '../../../assets/ico_10.gif';
import imgRec0510 from '../../../assets/img_rec05_10.gif';
import imgRec1010 from '../../../assets/img_rec10_10.gif';
import imgRec1510 from '../../../assets/img_rec15_10.gif';
import imgRec01 from '../../../assets/img_rec_01.gif';
import imgRec10 from '../../../assets/img_rec_10.gif';
import imgRec99 from '../../../assets/img_rec_99.gif';
import { useGetAgents, useGetGroups, useGetTenants } from '../../features/common/hooks/useCommonQueries';
import { monitoringApi } from '../../features/monitoring/api/monitoringApi';
import MonitoringAgentPopup, { type MonitoringAgentPopupRef } from '../../features/monitoring/components/MonitoringAgentPopup';
import MonitoringGroupPopup, { type MonitoringGroupPopupRef } from '../../features/monitoring/components/MonitoringGroupPopup';
import { useGetMonitoringList, useGetMonitoringProcesses, useGetMonitoringSystems } from '../../features/monitoring/hooks/useMonitoringQueries';
import { type EavesdropInfo, GRANT_OPTIONS, type MonitoringItem, type MonitoringSearchParams, SORT_OPTIONS } from '../../features/monitoring/types/monitoring';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const breadcrumb = [{ title: 'VEL' }, { title: '상태모니터링' }, { title: '모니터링', path: '/vel/monitoring/list' }];
const FORM_ITEM_STYLE = { '--ant-form-item-margin-bottom': '0px' } as React.CSSProperties;
const SearchIcon = () => (
  <svg viewBox="64 64 896 896" width="14" height="14" fill="currentColor">
    <path d="M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" />
  </svg>
);
const STANDARD1 = 3;
const STANDARD2 = 7;
const AGENTS_PER_ROW = 10;

const REFRESH_OPTIONS = [
  { value: 5_000, label: '5초' },
  { value: 10_000, label: '10초' },
  { value: 20_000, label: '20초' },
  { value: 30_000, label: '30초' },
];

const INITIAL_VALUES = {
  findSort: 'dn',
  findStatusWait: true,
  findStatusRec: true,
  findLogin: true,
  findLogout: false,
  callFrmTm: dayjs('00:00:00', 'HH:mm:ss'),
  callEndTm: dayjs('00:00:00', 'HH:mm:ss'),
};

const formatElapsedTime = (seconds: number | null | undefined): string => {
  if (seconds == null) return '';
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

function getStatusIcon(item: MonitoringItem): string {
  if (item.agentStatus !== '01') return imgRec99;
  if (item.dnStatus === '10') {
    if (item.rtFlag === '1' && item.rtUserName) return imgRec1510;
    const diff = item.diffTime ?? 0;
    if (diff < STANDARD1) return imgRec10;
    if (diff < STANDARD2) return imgRec0510;
    return imgRec1010;
  }
  return imgRec01;
}

function AgentIcon({ item, onDoubleClick }: { item: MonitoringItem; onDoubleClick?: (item: MonitoringItem) => void }) {
  const isLoggedIn = item.agentStatus === '01';

  const rows: { label: string; value: string | null | undefined }[] = [
    { label: '상담원ID', value: item.userId },
    { label: '이름', value: item.userName },
    { label: '내선번호', value: item.dnNo },
    { label: '그룹', value: item.groupName },
    { label: '상담원IP', value: item.userIp },
    { label: '전화기IP', value: item.phoneIp },
    { label: '상태', value: isLoggedIn ? '로그인' : '로그아웃' },
    { label: '최종변경', value: item.lastUptDate },
    { label: '시스템', value: item.systemName },
    ...(item.rtUserName ? [{ label: '감청자', value: item.rtUserName }] : []),
  ];

  const content = (
    <table className="text-xs border-collapse" style={{ minWidth: 200 }}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-600 whitespace-nowrap">{row.label}</td>
            <td className="border border-gray-200 px-2 py-1 text-gray-800">{row.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Popover content={content} trigger="hover" placement="rightTop">
      <img
        src={getStatusIcon(item)}
        alt={isLoggedIn ? '로그인' : '로그아웃'}
        className="cursor-pointer mx-auto block"
        style={{ width: 36, height: 36 }}
        onDoubleClick={() => onDoubleClick?.(item)}
        title={item.dnStatus === '10' ? '더블클릭: 실시간 감청' : undefined}
      />
    </Popover>
  );
}

function MonitoringBoard({ data, onAgentDoubleClick }: { data: MonitoringItem[]; onAgentDoubleClick?: (item: MonitoringItem) => void }) {
  const groups: (MonitoringItem | null)[][] = [];
  for (let i = 0; i < data.length; i += AGENTS_PER_ROW) {
    const chunk = data.slice(i, i + AGENTS_PER_ROW);
    const padded: (MonitoringItem | null)[] = [...chunk];
    while (padded.length < AGENTS_PER_ROW) padded.push(null);
    groups.push(padded);
  }

  if (groups.length === 0) {
    return <div className="py-16 text-center text-gray-400 text-sm">조회된 데이터가 없습니다</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse w-full" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 64 }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-600">구분</th>
            {Array.from({ length: AGENTS_PER_ROW }, (_, i) => (
              <th key={i} colSpan={2} className="border border-gray-200 px-2 py-1.5 text-center text-xs text-gray-600">
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => {
            const start = gi * AGENTS_PER_ROW + 1;
            const end = start + group.filter(Boolean).length - 1;
            return (
              <React.Fragment key={gi}>
                {/* Row 1: icon + DN */}
                <tr>
                  <td rowSpan={4} className="border border-gray-200 px-2 text-center text-xs text-gray-600 bg-gray-50 align-middle">
                    {start} ~ {end}
                  </td>
                  {group.map((item, idx) =>
                    item ? (
                      <React.Fragment key={idx}>
                        <td rowSpan={2} className="border border-gray-200 py-1 text-center align-middle">
                          <AgentIcon item={item} onDoubleClick={onAgentDoubleClick} />
                        </td>
                        <td className={`border border-gray-200 px-1 py-0.5 text-center text-xs ${item.agentStatus === '01' ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                          [{item.dnNo ?? '-'}]
                        </td>
                      </React.Fragment>
                    ) : (
                      <React.Fragment key={idx}>
                        <td rowSpan={2} className="border border-gray-200 bg-gray-50" />
                        <td className="border border-gray-200 bg-gray-50" />
                      </React.Fragment>
                    ),
                  )}
                </tr>
                {/* Row 2: agent name */}
                <tr>
                  {group.map((item, idx) => (
                    <td key={idx} className={`border border-gray-200 px-1 py-0.5 text-center text-xs ${item?.agentStatus === '01' ? 'text-blue-700' : 'text-gray-400'}`}>
                      {item?.userName ?? ''}
                    </td>
                  ))}
                </tr>
                {/* Row 3: customer phone */}
                <tr>
                  {group.map((item, idx) => (
                    <td key={idx} colSpan={2} className="border border-gray-200 px-1 py-0.5 h-5 text-center text-xs text-gray-500">
                      {item?.dnStatus === '10' ? (item.recCustTel ?? '') : ''}
                    </td>
                  ))}
                </tr>
                {/* Row 4: elapsed time */}
                <tr>
                  {group.map((item, idx) => (
                    <td key={idx} colSpan={2} className="border border-gray-200 px-1 py-0.5 h-5 text-center text-xs text-gray-600">
                      {item?.dnStatus === '10' || item?.agentStatus === '01' ? formatElapsedTime(item?.elapsedTime) : ''}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MonitoringList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [form] = Form.useForm();
  const [searchParams, setSearchParams] = useState<MonitoringSearchParams | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5_000);
  const [updateTime, setUpdateTime] = useState('');

  const groupPopupRef = useRef<MonitoringGroupPopupRef>(null);
  const agentPopupRef = useRef<MonitoringAgentPopupRef>(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [groupOptions, setGroupOptions] = useState<{ value: string; label: string; groupId: string }[]>([]);
  const [agentOptions, setAgentOptions] = useState<{ value: string; label: string }[]>([]);

  const userInfo = useAuthStore((s) => s.userInfo);

  const { data: tenantsData } = useGetTenants();
  const tenantOptions = [{ value: '', label: '선택하세요!' }, ...(Array.isArray(tenantsData) ? tenantsData.map((t) => ({ value: t.tenantId, label: t.tenantName })) : [])];

  const { data: systemsData } = useGetMonitoringSystems();
  const systemOptions = [{ value: '', label: '선택하세요!' }, ...(Array.isArray(systemsData) ? systemsData.map((s) => ({ value: String(s.code), label: s.codeNm })) : [])];

  const tenantId = Form.useWatch('tenantId', form) as string | undefined;
  const selectedSystemId = Form.useWatch('findSystemId', form) as string | undefined;

  const { data: processesData = [] } = useGetMonitoringProcesses({ systemId: selectedSystemId });
  const { data: allGroups = [] } = useGetGroups({
    params: tenantId ? { tenantId, userId: userInfo?.userAccount, grantId: userInfo?.roles?.[0] } : undefined,
    queryOptions: { enabled: !!tenantId },
  });
  const allGroupMap = new Map(allGroups.map((g) => [g.groupId, g]));

  const { data: allAgents = [] } = useGetAgents({
    params: tenantId ? { tenantId, userId: userInfo?.userAccount, grantId: userInfo?.roles?.[0] } : undefined,
    queryOptions: { enabled: !!tenantId },
  });

  const getGroupPath = (groupId: string): string => {
    const parts: string[] = [];
    let cur = allGroupMap.get(groupId);
    while (cur) {
      parts.unshift(cur.groupName);
      cur = cur.parentId ? allGroupMap.get(cur.parentId) : undefined;
    }
    return parts.join('/');
  };

  const handleGroupInputSearch = (val: string) => {
    setSelectedGroupId('');
    if (!val.trim()) {
      setGroupOptions([]);
      return;
    }
    const filtered = allGroups.filter((g) => g.groupName.includes(val) || g.groupId.includes(val));
    setGroupOptions(
      filtered.slice(0, 20).map((g) => ({
        value: g.groupId, // 유니크한 key로 사용
        label: getGroupPath(g.groupId), // 드롭다운에 표시
        groupId: g.groupId,
      })),
    );
  };

  const handleGroupOptionSelect = (_val: string, option: { value: string; label: string; groupId: string }) => {
    setSelectedGroupId(option.groupId);
    form.setFieldsValue({ findGroupId: option.label }); // 입력창에 full path 표시
    setGroupOptions([]);
  };

  const { data: monitoringData, isFetching } = useGetMonitoringList({
    params: searchParams ? { ...searchParams } : undefined,
    queryOptions: {
      refetchInterval: autoRefresh && searchParams ? refreshInterval : false,
    },
  });

  // 자동갱신 시 updateTime 표시
  useEffect(() => {
    if (!autoRefresh || !searchParams) return;
    setUpdateTime(new Date().toLocaleString('ko-KR'));
    const timer = setInterval(() => {
      setUpdateTime(new Date().toLocaleString('ko-KR'));
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [autoRefresh, searchParams, refreshInterval]);

  const rowData = monitoringData ?? [];

  const loginCount = rowData.filter((i) => i.agentStatus === '01').length;
  const logoutCount = rowData.filter((i) => i.agentStatus !== '01').length;
  const waitCount = rowData.filter((i) => i.agentStatus === '01' && i.dnStatus === '01').length;
  const callCount = rowData.filter((i) => i.dnStatus === '10').length;
  const et0Count = rowData.filter((i) => i.dnStatus === '10' && (i.diffTime ?? 0) < STANDARD1).length;
  const et5Count = rowData.filter((i) => i.dnStatus === '10' && (i.diffTime ?? 0) >= STANDARD1 && (i.diffTime ?? 0) < STANDARD2).length;
  const et10Count = rowData.filter((i) => i.dnStatus === '10' && (i.diffTime ?? 0) >= STANDARD2).length;

  const buildPopupParams = () => ({
    tenantId: form.getFieldValue('tenantId') as string,
    userId: userInfo?.userAccount,
    grantId: userInfo?.roles?.[0],
  });

  const handleOpenGroupPopup = () => {
    groupPopupRef.current?.open(buildPopupParams(), (group, fullPath) => {
      setSelectedGroupId(group.groupId);
      form.setFieldsValue({ findGroupId: fullPath });
    });
  };

  const handleAgentInputSearch = (val: string) => {
    setSelectedAgentId('');
    if (!val.trim()) {
      setAgentOptions([]);
      return;
    }
    const kw = val.toLowerCase();
    const filtered = allAgents.filter((a) => a.userId.toLowerCase().includes(kw) || a.userName.toLowerCase().includes(kw));
    setAgentOptions(filtered.slice(0, 20).map((a) => ({ value: a.userId, label: `[${a.userId}]${a.userName}` })));
  };

  const handleAgentOptionSelect = (val: string) => {
    const agent = allAgents.find((a) => a.userId === val);
    setSelectedAgentId(val);
    form.setFieldsValue({ findUserNameText: agent ? `${agent.userName}(${agent.userId})` : val });
    setAgentOptions([]);
  };

  const handleOpenAgentPopup = () => {
    agentPopupRef.current?.open(buildPopupParams(), (agent) => {
      setSelectedAgentId(agent.userId);
      form.setFieldsValue({ findUserNameText: `${agent.userName}(${agent.userId})` });
    });
  };

  const handleSearch = () => {
    form
      .validateFields()
      .then((values) => {
        const frmTm = values.callFrmTm as Dayjs | undefined;
        const endTm = values.callEndTm as Dayjs | undefined;
        setSearchParams({
          tenantId: (values.tenantId as string) || undefined,
          findSort: (values.findSort as string) || 'dn',
          findGrantId: (values.findGrantId as string) || undefined,
          findGroupId: selectedGroupId || undefined,
          findGroupName: (values.findGroupId as string) || undefined,
          findUserNameText: selectedAgentId || undefined,
          findDnText: (values.findDnText as string) || undefined,
          findSystemId: (values.findSystemId as string) || undefined,
          findProcessId: (values.findProcessId as string) || undefined,
          callFrmTm: frmTm ? frmTm.format('HHmmss') : undefined,
          callEndTm: endTm ? endTm.format('HHmmss') : undefined,
          findStatusWait: values.findStatusWait ? 'true' : undefined,
          findStatusRec: values.findStatusRec ? 'true' : undefined,
          findLogin: values.findLogin ? 'true' : undefined,
          findLogout: values.findLogout ? 'true' : undefined,
          userId: userInfo?.userAccount,
          grantId: userInfo?.roles?.[0],
        });
        setUpdateTime(new Date().toLocaleString('ko-KR'));
      })
      .catch(() => {
        // validation error shown inline by Ant Design
      });
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedGroupId('');
    setSelectedAgentId('');
    setGroupOptions([]);
    setAgentOptions([]);
    setSearchParams(null);
    setAutoRefresh(false);
    setUpdateTime('');
  };

  const handleAgentDoubleClick = async (item: MonitoringItem) => {
    if (item.dnStatus !== '10') {
      toast.warning('통화 중인 상담원만 감청할 수 있습니다.');
      return;
    }
    if (!item.systemId || !item.processId) {
      toast.warning('MRU 시스템 정보가 없습니다.');
      return;
    }

    try {
      const mfuIp = await monitoringApi.getMfuIp();

      const key = `vel-eavesdrop-${Date.now()}`;
      const eavesdropInfo: EavesdropInfo = {
        mfuIp,
        dnNo: item.dnNo,
        tenantId: item.tenantId,
        userId: item.userId,
        userName: item.userName,
        workerId: userInfo?.userAccount ?? '',
        workerName: userInfo?.username ?? userInfo?.userAccount ?? '',
      };
      localStorage.setItem(key, JSON.stringify(eavesdropInfo));

      window.open(withBasePath(`/vel/monitoring/eavesdrop?eavesdropId=${key}`), `Eavesdrop-${key}`, 'width=560,height=500,resizable=yes');
    } catch {
      toast.error('감청 시작에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 검색 조건 */}
      <div
        className="bg-white bt-shadow px-7 py-5"
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
      >
        <Form
          form={form}
          layout="horizontal"
          labelAlign="left"
          colon={false}
          labelCol={{ style: { width: '60px', flexShrink: 0, display: 'flex', alignItems: 'center' } }}
          initialValues={{ ...INITIAL_VALUES, tenantId: userInfo?.tenant ?? '' }}
        >
          <div className="grid grid-cols-24 gap-x-4 gap-y-2">
            {/* Row 1: 테넌트(4) | 정렬(3) | 권한(3) | empty(2) */}
            <div className="col-span-5">
              <Form.Item name="tenantId" label="테넌트" style={FORM_ITEM_STYLE}>
                <Select
                  placeholder="선택하세요!"
                  options={tenantOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={() => {
                    setSelectedGroupId('');
                    setSelectedAgentId('');
                    setGroupOptions([]);
                    setAgentOptions([]);
                    form.setFieldsValue({ findGroupId: '', findUserNameText: '' });
                  }}
                />
              </Form.Item>
            </div>
            <div className="col-span-5">
              <Form.Item name="findSort" label="정렬" style={FORM_ITEM_STYLE}>
                <Select options={SORT_OPTIONS} />
              </Form.Item>
            </div>
            <div className="col-span-5">
              <Form.Item name="findGrantId" label="권한" style={FORM_ITEM_STYLE}>
                <Select placeholder="선택하세요!" options={GRANT_OPTIONS} />
              </Form.Item>
            </div>
            <div className="col-span-9" />

            {/* Row 2: 그룹(3) | 상담사ID(3) | 내선(3) | 통화상태(2) | empty(1) */}
            <div className="col-span-5">
              <Form.Item label="그룹" style={FORM_ITEM_STYLE}>
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="findGroupId" noStyle>
                    <AutoComplete
                      options={groupOptions}
                      onSearch={handleGroupInputSearch}
                      onSelect={handleGroupOptionSelect}
                      onChange={(val) => {
                        if (!val) {
                          setSelectedGroupId('');
                          setGroupOptions([]);
                        }
                      }}
                      placeholder="그룹명"
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Button onClick={handleOpenGroupPopup}>
                    <SearchIcon />
                  </Button>
                </Space.Compact>
              </Form.Item>
            </div>
            <div className="col-span-5">
              <Form.Item label="상담사ID" style={FORM_ITEM_STYLE}>
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="findUserNameText" noStyle>
                    <AutoComplete
                      options={agentOptions}
                      onSearch={handleAgentInputSearch}
                      onSelect={handleAgentOptionSelect}
                      onChange={(val) => {
                        if (!val) {
                          setSelectedAgentId('');
                          setAgentOptions([]);
                        }
                      }}
                      placeholder="ID 또는 이름"
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Button onClick={handleOpenAgentPopup}>
                    <SearchIcon />
                  </Button>
                </Space.Compact>
              </Form.Item>
            </div>
            <div className="col-span-5">
              <Form.Item name="findDnText" label="내선" style={FORM_ITEM_STYLE}>
                <Input placeholder="내선번호" />
              </Form.Item>
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0" style={{ width: '80px' }}>
                통화상태
              </span>
              <Form.Item name="findStatusWait" valuePropName="checked" noStyle>
                <Checkbox
                  onChange={(e) => {
                    if (e.target.checked) {
                      form.setFieldsValue({
                        ...(!form.getFieldValue('findLogin') && { findLogin: true }),
                        findLogout: false,
                      });
                    }
                  }}
                >
                  대기
                </Checkbox>
              </Form.Item>
              <Form.Item name="findStatusRec" valuePropName="checked" noStyle>
                <Checkbox>통화</Checkbox>
              </Form.Item>
            </div>
            <div className="col-span-5" />

            {/* Row 3: 시스템(3) | 프로세스(3) | 경과시간(4) | 로그인상태(2) */}
            <div className="col-span-5">
              <Form.Item name="findSystemId" label="시스템" style={FORM_ITEM_STYLE}>
                <Select placeholder="선택하세요!" options={systemOptions} onChange={() => form.setFieldsValue({ findProcessId: undefined })} />
              </Form.Item>
            </div>
            <div className="col-span-5">
              <Form.Item name="findProcessId" label="프로세스" style={FORM_ITEM_STYLE}>
                <Select placeholder="전체" disabled={!selectedSystemId} options={processesData.map((p) => ({ value: String(p.code), label: p.codeNm }))} />
              </Form.Item>
            </div>
            <div className="col-span-5 flex items-center gap-1">
              <span className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0" style={{ width: '56px' }}>
                경과시간
              </span>
              <Form.Item name="callFrmTm" noStyle>
                <TimePicker format="HH:mm:ss" placeholder="시작" style={{ width: 140 }} />
              </Form.Item>
              <span className="text-gray-400 px-1">~</span>
              <Form.Item name="callEndTm" noStyle>
                <TimePicker format="HH:mm:ss" placeholder="종료" style={{ width: 140 }} />
              </Form.Item>
            </div>
            <div className="col-span-9 flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0" style={{ width: '80px' }}>
                로그인상태
              </span>
              <Form.Item name="findLogin" valuePropName="checked" noStyle>
                <Checkbox>로그인</Checkbox>
              </Form.Item>
              <Form.Item name="findLogout" valuePropName="checked" noStyle>
                <Checkbox
                  onChange={(e) => {
                    if (e.target.checked) {
                      form.setFieldsValue({ findStatusWait: false, findLogin: false });
                    }
                  }}
                >
                  로그아웃
                </Checkbox>
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>

      {/* 툴바 */}
      <div className="bg-white bt-shadow px-7 py-3 flex items-center gap-3">
        <Select value={refreshInterval} onChange={setRefreshInterval} options={REFRESH_OPTIONS} style={{ width: 72 }} size="small" />
        <Checkbox checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}>
          Auto Refresh
        </Checkbox>
        {updateTime && <span className="text-xs text-gray-400">최근업데이트: {updateTime}</span>}
        <div className="ml-auto flex items-center gap-3">
          <Button style={{ backgroundColor: '#ed8f14', borderColor: '#ed8f14', color: '#fff' }} onClick={handleSearch} loading={isFetching}>
            조회
          </Button>
          <Button onClick={handleReset}>초기화</Button>
        </div>
      </div>

      {/* 요약 + 모니터링 보드 */}
      <div className="flex-1 bg-white bt-shadow overflow-hidden flex flex-col">
        {/* 요약 패널 */}
        <div className="px-6 py-3 border-b border-gray-100">
          <table className="text-sm border-collapse w-full">
            <tbody>
              <tr>
                <td rowSpan={2} className="border border-gray-200 px-5 py-2 text-center font-semibold text-gray-700 bg-gray-50 text-base">
                  요약
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">로그인</td>
                <td className="border border-gray-200 px-6 py-2 text-center text-blue-600 font-bold text-base">{loginCount}</td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">로그아웃</td>
                <td className="border border-gray-200 px-6 py-2 text-center text-gray-600 font-bold text-base">{logoutCount}</td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">
                  <span className="inline-flex items-center gap-1">
                    <img src={icoWait} alt="대기" />
                    대기
                  </span>
                </td>
                <td className="border border-gray-200 px-6 py-2 text-center text-blue-500 font-bold text-base">{waitCount}</td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">
                  <span className="inline-flex items-center gap-1">
                    <img src={icoRec} alt="녹음중" />
                    녹음중
                  </span>
                </td>
                <td className="border border-gray-200 px-6 py-2 text-center text-green-600 font-bold text-base">{callCount}</td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">
                  경과시간
                </td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">{STANDARD1}분 미만</td>
                <td className="border border-gray-200 px-6 py-2 text-center text-green-600 font-bold text-base">{et0Count}</td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">{STANDARD2}분 미만</td>
                <td className="border border-gray-200 px-6 py-2 text-center text-yellow-600 font-bold text-base">{et5Count}</td>
                <td className="border border-gray-200 px-4 py-2 text-center font-medium text-gray-600 bg-gray-50">{STANDARD2}분 경과</td>
                <td className="border border-gray-200 px-6 py-2 text-center text-red-600 font-bold text-base">{et10Count}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 타일 보드 */}
        <div className="flex-1 overflow-auto p-4">
          {isFetching && monitoringData === undefined ? <FallbackSpinner /> : <MonitoringBoard data={rowData} onAgentDoubleClick={handleAgentDoubleClick} />}
        </div>
      </div>

      <MonitoringGroupPopup ref={groupPopupRef} />
      <MonitoringAgentPopup ref={agentPopupRef} />
    </div>
  );
}
