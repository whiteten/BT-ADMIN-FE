/**
 * 시나리오 배포 사이드바.
 * <p>FCA `AggridDeployServerInfoSidebar` 패턴 응용 — 선택된 버전의 배포된 시스템 목록 표시 + 배포 실행 폼 포함.</p>
 *
 * <p>대상 시스템은 배포설정(deployConfig)에서 assignYn=1인 할당 시스템을 읽기 전용으로 표시.
 * HA 그룹 백업 시스템(assignYn=0)이 있으면 구분하여 함께 표시.
 * 배포 실행 시 대상 시스템을 서버에 전달하지 않고, 백엔드에서 내부 조회.</p>
 */
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, DatePicker, Drawer, Empty, Form, Radio, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Server, ServerOff, Shield } from 'lucide-react';
import { toast } from '@/shared-util';
import { scenarioQueryKeys, useGetDeployTargets, useGetDeployedSystems, usePublishScenario } from '../hooks/useScenarioQueries';
import { APPLY_STATUS_LABELS, type DeployTargetSystem, type DeployedSystem, type ScenarioVersion } from '../types';

interface ScenarioDeploySidebarProps {
  open: boolean;
  serviceId: number;
  /** 그리드에서 선택된 버전 (null이면 안내 메시지) */
  selectedVersion: ScenarioVersion | null;
  /** 사이드바 닫기 콜백 */
  onClose?: () => void;
}

export default function ScenarioDeploySidebar({ open, serviceId, selectedVersion, onClose }: ScenarioDeploySidebarProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ rtResvKind: 'REALTIME' | 'RESERVED'; applyDatetime?: Dayjs }>();
  const [rtResvKind, setRtResvKind] = useState<'REALTIME' | 'RESERVED'>('REALTIME');

  // 선택된 버전 변경 시 폼 초기화
  useEffect(() => {
    form.resetFields();
    setRtResvKind('REALTIME');
  }, [form, selectedVersion?.serviceVer]);

  // 배포된(또는 예약된) 시스템 목록 — 현재 상태 표시
  const { data: deployedSystems = [] } = useGetDeployedSystems({
    params: selectedVersion ? { serviceId, serviceVer: selectedVersion.serviceVer } : undefined,
    queryOptions: { enabled: !!selectedVersion?.serviceVer },
  });

  // 배포 대상 시스템 — 할당(assignSystem=1) + HA 백업(assignSystem=0) 포함
  const { data: deployTargets = [] } = useGetDeployTargets({
    params: { serviceId },
    queryOptions: { enabled: !!selectedVersion?.serviceVer },
  });
  const assignedSystems = useMemo(() => deployTargets.filter((item) => item.assignSystem === 1), [deployTargets]);
  const haBackupSystems = useMemo(() => deployTargets.filter((item) => item.assignSystem === 0), [deployTargets]);

  const { mutate: publishMutate, isPending: isPublishing } = usePublishScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success(rtResvKind === 'REALTIME' ? '실시간 배포가 시작되었습니다.' : '예약 배포가 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getDeployedSystems._def });
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getDeployConfig._def });
        form.resetFields();
        setRtResvKind('REALTIME');
      },
    },
  });

  const handleSubmit = (values: { rtResvKind: 'REALTIME' | 'RESERVED'; applyDatetime?: Dayjs }) => {
    if (!selectedVersion) return;
    publishMutate({
      params: { serviceId, serviceVer: selectedVersion.serviceVer },
      data: {
        rtResvKind: values.rtResvKind,
        // REALTIME 인 경우 사용자가 DatePicker 잔존 값 가지고 있어도 무시 (disabled 라 변경 못함 + 백엔드도 REALTIME 시 무시)
        applyDatetime: values.rtResvKind === 'RESERVED' ? values.applyDatetime?.toISOString() : undefined,
      },
    });
  };

  return (
    <Drawer title="배포" placement="right" width={480} open={open} onClose={onClose}>
      {!selectedVersion ? (
        <div className="flex flex-col items-center justify-center gap-3 text-gray-400" style={{ minHeight: 300 }}>
          <ServerOff className="size-12" />
          <p className="text-sm text-center">
            버전을 선택하면
            <br />
            배포 정보가 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 선택된 버전 정보 */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-[11px] text-slate-500 mb-0.5">선택된 버전</div>
            <div className="text-[13px] font-semibold text-slate-800">
              v{selectedVersion.serviceVer}
              {selectedVersion.versionName && <span className="text-slate-500 font-normal"> · {selectedVersion.versionName}</span>}
            </div>
            {selectedVersion.scenarioFile && <div className="text-[11px] text-slate-500 mt-1 truncate">{selectedVersion.scenarioFile}</div>}
          </div>

          {/* 적용 서버 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-700">적용 서버 ({deployedSystems.length})</span>
              <span className="text-[10px] text-slate-400">v{selectedVersion.serviceVer} 기준</span>
            </div>
            {deployedSystems.length === 0 ? (
              <div className="text-center text-slate-400 text-[12px] py-4 border border-dashed border-slate-200 rounded-md">
                <ServerOff className="size-8 mx-auto mb-1 opacity-60" />
                <span>배포된 서버가 없습니다.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {deployedSystems.map((s: DeployedSystem) => (
                  <div key={s.systemId} className="flex items-center gap-2 p-2.5 rounded-md border border-slate-200 bg-white">
                    <Server className="size-4 text-[#405189]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-slate-800 truncate">{s.systemName ?? `System ${s.systemId}`}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {s.systemRole ?? '-'}
                        {s.ipAddress ? ` · ${s.ipAddress}` : ''}
                      </div>
                    </div>
                    <Tag
                      color={
                        s.applyStatus === 'APPLIED'
                          ? 'green'
                          : s.applyStatus === 'SEND_FAIL' || s.applyStatus === 'CMD_FAIL' || s.applyStatus === 'APPLY_FAIL'
                            ? 'red'
                            : s.applyStatus === 'PENDING' || s.applyStatus === 'SEND_OK' || s.applyStatus === 'CMD_OK'
                              ? 'blue'
                              : 'default'
                      }
                    >
                      {(s.applyStatus && APPLY_STATUS_LABELS[s.applyStatus]) ?? s.applyStatus ?? '-'}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* 배포 실행 폼 */}
          <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ rtResvKind: 'REALTIME' }}>
            <div className="text-[12px] font-semibold text-slate-700 mb-2">배포 실행</div>

            {!selectedVersion.scenarioFile && (
              <Alert type="warning" showIcon message="시나리오 파일 미업로드" description="버전 추가 시 파일을 업로드해주세요." className="!mb-3" />
            )}

            {/* 배포 방식 + 예약 시각 인라인. DatePicker 는 REALTIME 모드에서도 자리 점유 (disabled).
                AS-IS SleeConfigList 패턴과 동일 — layout shift 방지. */}
            <Form.Item label="배포 방식" required className="!mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Form.Item name="rtResvKind" noStyle rules={[{ required: true }]}>
                  <Radio.Group onChange={(e) => setRtResvKind(e.target.value)}>
                    <Radio value="REALTIME">즉시</Radio>
                    <Radio value="RESERVED">예약</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  name="applyDatetime"
                  noStyle
                  rules={[
                    {
                      validator: async (_r, value: Dayjs | undefined) => {
                        if (rtResvKind !== 'RESERVED') return;
                        if (!value) throw new Error('예약 일시는 필수입니다');
                        if (!value.isAfter(dayjs())) throw new Error('예약 일시는 현재 시각 이후여야 합니다');
                      },
                    },
                  ]}
                >
                  <DatePicker
                    showTime={{ format: 'HH:mm', minuteStep: 5 }}
                    format="YYYY-MM-DD HH:mm"
                    disabled={rtResvKind !== 'RESERVED'}
                    disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                    placeholder="예약 시각"
                    style={{ width: 200 }}
                  />
                </Form.Item>
              </div>
            </Form.Item>

            {/* 대상 시스템 — 읽기 전용 목록 (할당 + HA 백업) */}
            <div className="mb-4">
              <div className="text-[12px] font-semibold text-slate-700 mb-2">대상 시스템 ({deployTargets.length})</div>
              <div className="border border-slate-200 rounded-md">
                {deployTargets.length === 0 ? (
                  <div className="p-3">
                    <Empty description="배포 가능한 시스템이 없습니다. 배포 설정에서 시스템을 먼저 할당하세요." imageStyle={{ height: 40 }} />
                  </div>
                ) : (
                  deployTargets.map((sys: DeployTargetSystem, idx: number) => (
                    <div
                      key={sys.systemId}
                      className={`flex items-center gap-2 p-2 ${sys.assignSystem === 0 ? 'bg-slate-50' : ''} ${idx < deployTargets.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      {sys.assignSystem === 1 ? <Server className="size-3.5 text-[#405189] flex-shrink-0" /> : <Shield className="size-3.5 text-slate-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[12px] truncate ${sys.assignSystem === 0 ? 'text-slate-400' : 'text-slate-800'}`}>{sys.systemName}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {sys.serviceVer ? `현재 v${sys.serviceVer}` : ''}
                          {sys.haGroupName ? `${sys.serviceVer ? ' · ' : ''}${sys.haGroupName}` : ''}
                        </div>
                      </div>
                      {sys.assignSystem === 0 && (
                        <Tag color="default" className="!m-0 !text-[10px] !leading-4 !py-0">
                          백업
                        </Tag>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button type="primary" htmlType="submit" block loading={isPublishing} disabled={!selectedVersion.scenarioFile || assignedSystems.length === 0}>
              적용
            </Button>
          </Form>
        </div>
      )}
    </Drawer>
  );
}
