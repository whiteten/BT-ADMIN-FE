/**
 * 시나리오 배포 사이드바.
 * <p>FCA `AggridDeployServerInfoSidebar` 패턴 응용 — 선택된 버전의 배포된 시스템 목록 표시 + 배포 실행 폼 포함.</p>
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Checkbox, DatePicker, Empty, Form, Radio, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Server, ServerOff } from 'lucide-react';
import { toast } from '@/shared-util';
import { scenarioQueryKeys, useGetDeployedSystems, usePublishScenario } from '../hooks/useScenarioQueries';
import { APPLY_RESULT_LABELS, APPLY_STATUS_LABELS, type DeployedSystem, type ScenarioVersion } from '../types/scenario.types';

interface ScenarioDeploySidebarProps {
  serviceId: number;
  /** 그리드에서 선택된 버전 (null이면 안내 메시지) */
  selectedVersion: ScenarioVersion | null;
  /**
   * 배포 가능한 시스템 후보 목록.
   * AS-IS의 시스템 할당 가능 목록과 동일 (현재는 props로 부모가 주입; P4에서 API 분리).
   */
  candidateSystems?: { systemId: number; systemName: string; systemRole?: string }[];
  /** 사이드바 닫기 콜백 */
  onClose?: () => void;
}

export default function ScenarioDeploySidebar({ serviceId, selectedVersion, candidateSystems = [], onClose }: ScenarioDeploySidebarProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ rtResvKind: 'REALTIME' | 'RESERVED'; applyDatetime?: Dayjs; targetSystemIds: number[] }>();
  const [rtResvKind, setRtResvKind] = useState<'REALTIME' | 'RESERVED'>('REALTIME');

  // 선택된 버전 변경 시 폼 초기화
  useEffect(() => {
    form.resetFields();
    setRtResvKind('REALTIME');
  }, [form, selectedVersion?.serviceVer]);

  const { data: deployedSystems = [] } = useGetDeployedSystems({
    params: selectedVersion ? { serviceId, serviceVer: selectedVersion.serviceVer } : undefined,
    queryOptions: { enabled: !!selectedVersion?.serviceVer },
  });

  const { mutate: publishMutate, isPending: isPublishing } = usePublishScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success(rtResvKind === 'REALTIME' ? '실시간 배포가 시작되었습니다.' : '예약 배포가 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getDeployedSystems._def });
      },
    },
  });

  const handleSubmit = (values: { rtResvKind: 'REALTIME' | 'RESERVED'; applyDatetime?: Dayjs; targetSystemIds: number[] }) => {
    if (!selectedVersion) return;
    publishMutate({
      params: { serviceId, serviceVer: selectedVersion.serviceVer },
      data: {
        rtResvKind: values.rtResvKind,
        applyDatetime: values.applyDatetime?.toISOString(),
        targetSystemIds: values.targetSystemIds,
      },
    });
  };

  if (!selectedVersion) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 text-gray-400">
        <ServerOff className="size-12" />
        <p className="text-sm text-center">
          버전을 선택하면
          <br />
          배포 정보가 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 select-text flex flex-col gap-4">
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
                  {APPLY_STATUS_LABELS[s.applyStatus] ?? s.applyStatus}
                </Tag>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* 배포 실행 폼 */}
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ rtResvKind: 'REALTIME', targetSystemIds: [] }}>
        <div className="text-[12px] font-semibold text-slate-700 mb-2">배포 실행</div>

        {!selectedVersion.scenarioFile && (
          <Alert type="warning" showIcon message="시나리오 파일 미업로드" description="대화편집에서 시나리오 작성 + 업로드를 먼저 진행해주세요." className="!mb-3" />
        )}

        <Form.Item name="rtResvKind" label="배포 방식" rules={[{ required: true }]}>
          <Radio.Group onChange={(e) => setRtResvKind(e.target.value)}>
            <Radio value="REALTIME">실시간</Radio>
            <Radio value="RESERVED">예약</Radio>
          </Radio.Group>
        </Form.Item>

        {rtResvKind === 'RESERVED' && (
          <Form.Item
            name="applyDatetime"
            label="예약 일시"
            rules={[
              { required: true, message: '예약 일시는 필수입니다' },
              {
                validator: async (_r, value: Dayjs | undefined) => {
                  if (value && !value.isAfter(dayjs())) {
                    throw new Error('예약 일시는 현재 시각 이후여야 합니다');
                  }
                },
              },
            ]}
          >
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>
        )}

        <Form.Item name="targetSystemIds" label="대상 시스템" rules={[{ required: true, message: '대상 시스템을 선택해주세요' }]}>
          <Checkbox.Group>
            <div className="border border-slate-200 rounded-md w-full">
              {candidateSystems.length === 0 ? (
                <div className="p-3">
                  <Empty description="배포 가능한 시스템이 없습니다." imageStyle={{ height: 40 }} />
                </div>
              ) : (
                candidateSystems.map((sys, idx) => (
                  <label
                    key={sys.systemId}
                    className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-50 ${idx < candidateSystems.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <Checkbox value={sys.systemId} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-800 truncate">{sys.systemName}</div>
                      <div className="text-[10px] text-slate-400">{sys.systemRole ?? '-'}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </Checkbox.Group>
        </Form.Item>

        <Button type="primary" htmlType="submit" block loading={isPublishing} disabled={!selectedVersion.scenarioFile}>
          배포 실행
        </Button>
      </Form>
    </div>
  );
}
