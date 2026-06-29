/**
 * 시나리오 배포 사이드바.
 * <p>FCA `AggridDeployServerInfoSidebar` 패턴 응용 — 선택된 버전의 배포된 시스템 목록 표시 + 배포 실행 폼 포함.</p>
 *
 * <p>대상 시스템은 배포설정(deployConfig)에서 assignYn=1인 할당 시스템을 읽기 전용으로 표시.
 * HA 그룹 백업 시스템(assignYn=0)이 있으면 구분하여 함께 표시.
 * 배포 실행 시 대상 시스템을 서버에 전달하지 않고, 백엔드에서 내부 조회.</p>
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Checkbox, DatePicker, Drawer, Empty, Form, Radio, Select, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Server, ServerOff, Shield } from 'lucide-react';
import { toast } from '@/shared-util';
import { scenarioQueryKeys, useGetDeployTargets, useGetDeployedSystems, useGetVersions, usePublishScenario } from '../hooks/useScenarioQueries';
import {
  APPLY_STATUS,
  APPLY_STATUS_LABELS,
  APPLY_TIMING,
  type ApplyTimingKind,
  type DeployTargetSystem,
  type DeployedSystem,
  type ScenarioPublishResult,
  type ScenarioVersion,
} from '../types';
import ScenarioDeployResultModal, { type ScenarioDeployResultModalRef } from './ScenarioDeployResultModal';

interface ScenarioDeploySidebarProps {
  open: boolean;
  serviceId: number;
  /** 그리드에서 선택된 버전 (null이면 안내 메시지). enableVersionPicker=true 면 무시되고 내부 드롭다운으로 선택. */
  selectedVersion: ScenarioVersion | null;
  /** true 면 사이드바 상단에 버전 선택 드롭다운(기본=최신)을 표시한다 — 목록 페이지에서 바로 배포할 때 사용. */
  enableVersionPicker?: boolean;
  /** 배포(실시간/예약) 성공 시 호출 — 목록 카드 갱신 등 부모 후처리용. */
  onPublished?: () => void;
  /** 사이드바 닫기 콜백 */
  onClose?: () => void;
}

export default function ScenarioDeploySidebar({ open, serviceId, selectedVersion, enableVersionPicker = false, onPublished, onClose }: ScenarioDeploySidebarProps) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<{ rtResvKind: ApplyTimingKind; applyDatetime?: Dayjs }>();
  const [rtResvKind, setRtResvKind] = useState<ApplyTimingKind>(APPLY_TIMING.REALTIME);
  const [selectedSystemIds, setSelectedSystemIds] = useState<Set<number>>(new Set());
  const [pickedVersion, setPickedVersion] = useState<ScenarioVersion | null>(null);
  const resultModalRef = useRef<ScenarioDeployResultModalRef>(null);

  // 목록에서 열 때(enableVersionPicker): 버전 목록 조회. 상세에서 열 때는 selectedVersion 사용.
  const { data: versions = [] } = useGetVersions({
    params: { serviceId },
    queryOptions: { enabled: open && enableVersionPicker },
  });
  // 실제 배포 대상 버전 — 목록모드는 드롭다운 선택, 상세모드는 부모 전달 버전.
  const effectiveVersion = enableVersionPicker ? pickedVersion : selectedVersion;

  // serviceId 변경 시 선택 초기화
  useEffect(() => {
    setPickedVersion(null);
  }, [serviceId]);
  // 버전 로드되면 최신(버전번호 내림차순 1번째) 기본 선택 — 아직 미선택일 때만(사용자 선택 보존)
  useEffect(() => {
    if (enableVersionPicker && open && !pickedVersion && versions.length > 0) {
      const latest = [...versions].sort((a, b) => (b.serviceVer ?? '').localeCompare(a.serviceVer ?? '', undefined, { numeric: true }))[0];
      setPickedVersion(latest);
    }
  }, [enableVersionPicker, open, pickedVersion, versions]);

  // 선택된 버전 변경 시 폼 초기화
  useEffect(() => {
    form.resetFields();
    setRtResvKind(APPLY_TIMING.REALTIME);
  }, [form, effectiveVersion?.serviceVer]);

  // 배포된(또는 예약된) 시스템 목록 — 현재 상태 표시
  const { data: deployedSystems = [] } = useGetDeployedSystems({
    params: effectiveVersion ? { serviceId, serviceVer: effectiveVersion.serviceVer } : undefined,
    queryOptions: { enabled: !!effectiveVersion?.serviceVer },
  });

  // 배포 대상 시스템 — 할당(assignSystem=1) + HA 백업(assignSystem=0) 포함
  const { data: deployTargets = [] } = useGetDeployTargets({
    params: { serviceId },
    queryOptions: { enabled: !!effectiveVersion?.serviceVer },
  });
  const assignedSystems = useMemo(() => deployTargets.filter((item) => item.assignSystem === 1), [deployTargets]);
  const haBackupSystems = useMemo(() => deployTargets.filter((item) => item.assignSystem === 0), [deployTargets]);

  // 진입/대상 변경 시 예약중이 아닌 할당 시스템을 기본 전체 선택 (SleeConfig 패턴 동일)
  useEffect(() => {
    setSelectedSystemIds(new Set(assignedSystems.filter((s) => !s.reserved).map((s) => s.systemId)));
  }, [assignedSystems]);

  const toggleSystem = (systemId: number, checked: boolean) => {
    setSelectedSystemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(systemId);
      else next.delete(systemId);
      return next;
    });
  };

  // 전체 선택/해제 — 예약중(disabled) 시스템 제외 (SleeConfig 적용 팝업과 동일)
  const checkableSystems = useMemo(() => assignedSystems.filter((s) => !s.reserved), [assignedSystems]);
  const allChecked = checkableSystems.length > 0 && checkableSystems.every((s) => selectedSystemIds.has(s.systemId));
  const someChecked = checkableSystems.some((s) => selectedSystemIds.has(s.systemId));
  const toggleAll = (checked: boolean) => setSelectedSystemIds(checked ? new Set(checkableSystems.map((s) => s.systemId)) : new Set());

  const { mutate: publishMutate, isPending: isPublishing } = usePublishScenario({
    mutationOptions: {
      onSuccess: (data) => {
        const result = data as ScenarioPublishResult;
        // 배포 후 항상 현재 상태 갱신
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getDeployedSystems._def });
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getDeployConfig._def });
        // 예약 성공 직후 대상 시스템의 reserved 플래그를 즉시 반영 → 방금 예약한 시스템 체크박스 자동 비활성화.
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getDeployTargets._def });
        form.resetFields();
        setRtResvKind(APPLY_TIMING.REALTIME);
        onPublished?.(); // 부모 후처리(목록 카드 배포현황 갱신 등)

        // RESERVED — 시스템별 결과 없음(svcResvId만 채워짐). 토스트로 안내.
        if (result?.svcResvId) {
          toast.success('예약 배포가 등록되었습니다.');
          return;
        }

        // REALTIME — 시스템별 deploy/apply 결과를 모달로 표시 (부분 실패 포함).
        if (result?.deployResults) {
          resultModalRef.current?.open(result);
          if (result.deployFailCount === 0 && result.applyFailCount === 0) {
            toast.success('실시간 배포가 완료되었습니다.');
          } else {
            toast.error(`배포 일부 실패 — 파일전송 ${result.deployFailCount}건 · 적용 ${result.applyFailCount}건 실패`);
          }
          return;
        }

        // 방어적 폴백 — 응답 구조 예상과 다를 때
        toast.success('배포 요청이 처리되었습니다.');
      },
    },
  });

  const handleSubmit = (values: { rtResvKind: ApplyTimingKind; applyDatetime?: Dayjs }) => {
    if (!effectiveVersion) return;
    publishMutate({
      params: { serviceId, serviceVer: effectiveVersion.serviceVer },
      data: {
        rtResvKind: values.rtResvKind,
        // REALTIME 인 경우 사용자가 DatePicker 잔존 값 가지고 있어도 무시 (disabled 라 변경 못함 + 백엔드도 REALTIME 시 무시).
        // ⚠ toISOString(UTC) 금지 — BE 가 LocalDateTime 으로 파싱+LocalDateTime.now() 비교라 시차(KST→UTC 9h)만큼
        //    과거가 되어 "현재 시각 이후" 오류 발생. SleeConfig 와 동일하게 로컬 wall-clock 문자열로 전송.
        applyDatetime: values.rtResvKind === APPLY_TIMING.RESERVED ? values.applyDatetime?.format('YYYY-MM-DDTHH:mm:ss') : undefined,
        systemIds: Array.from(selectedSystemIds), // 체크박스로 선택한 시스템만 배포
      },
    });
  };

  return (
    <Drawer title="배포" closable={{ placement: 'end' }} placement="right" width={480} open={open} onClose={onClose}>
      {/* 목록에서 열 때: 버전 선택 드롭다운(기본 최신) */}
      {enableVersionPicker && (
        <div className="mb-4">
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5">배포 버전</div>
          <Select
            className="w-full"
            placeholder={versions.length ? '버전 선택' : '등록된 버전이 없습니다'}
            value={effectiveVersion?.serviceVer}
            onChange={(ver) => setPickedVersion(versions.find((v) => v.serviceVer === ver) ?? null)}
            options={versions.map((v) => ({ label: `v${v.serviceVer}${v.versionName ? ` (${v.versionName})` : ''}`, value: v.serviceVer }))}
            notFoundContent="등록된 버전이 없습니다"
          />
        </div>
      )}
      {!effectiveVersion ? (
        <div className="flex flex-col items-center justify-center gap-3 text-gray-400" style={{ minHeight: 300 }}>
          <ServerOff className="size-12" />
          <p className="text-sm text-center">
            {enableVersionPicker ? (
              <>
                등록된 버전이 없습니다.
                <br />
                상세에서 버전을 추가하세요.
              </>
            ) : (
              <>
                버전을 선택하면
                <br />
                배포 정보가 표시됩니다.
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 선택된 버전 정보 — 드롭다운 모드에선 Select가 대신하므로 생략 */}
          {!enableVersionPicker && (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
              <div className="text-[11px] text-slate-500 mb-0.5">선택된 버전</div>
              <div className="text-[13px] font-semibold text-slate-800">
                v{effectiveVersion.serviceVer}
                {effectiveVersion.versionName && <span className="text-slate-500 font-normal"> ({effectiveVersion.versionName})</span>}
              </div>
              {effectiveVersion.scenarioFile && <div className="text-[11px] text-slate-500 mt-1 truncate">{effectiveVersion.scenarioFile}</div>}
            </div>
          )}

          {/* 적용 서버 목록 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-slate-700">적용 서버 ({deployedSystems.length})</span>
              <span className="text-[10px] text-slate-400">v{effectiveVersion.serviceVer} 기준</span>
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
                        s.applyStatus === APPLY_STATUS.APPLIED
                          ? 'green'
                          : s.applyStatus === APPLY_STATUS.SEND_FAIL || s.applyStatus === APPLY_STATUS.CMD_FAIL || s.applyStatus === APPLY_STATUS.APPLY_FAIL
                            ? 'red'
                            : s.applyStatus === APPLY_STATUS.PENDING || s.applyStatus === APPLY_STATUS.SEND_OK || s.applyStatus === APPLY_STATUS.CMD_OK
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
          <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ rtResvKind: APPLY_TIMING.REALTIME }}>
            <div className="text-[12px] font-semibold text-slate-700 mb-2">배포 실행</div>

            {!effectiveVersion.scenarioFile && (
              <Alert type="warning" showIcon message="시나리오 파일 미업로드" description="버전 추가 시 파일을 업로드해주세요." className="!mb-3" />
            )}

            {/* 배포 방식 + 예약 시각 인라인. DatePicker 는 REALTIME 모드에서도 자리 점유 (disabled).
                AS-IS SleeConfigList 패턴과 동일 — layout shift 방지. */}
            <Form.Item label="배포 방식" required className="!mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Form.Item name="rtResvKind" noStyle rules={[{ required: true }]}>
                  <Radio.Group
                    onChange={(e) => {
                      const v = e.target.value as ApplyTimingKind;
                      setRtResvKind(v);
                      // 예약 선택 시 기본 예약일시 = 현재 +1시간 (레거시 setApplyStatus: getHours()+1 동등)
                      if (v === APPLY_TIMING.RESERVED && !form.getFieldValue('applyDatetime')) {
                        form.setFieldValue('applyDatetime', dayjs().add(1, 'hour'));
                      }
                    }}
                  >
                    <Radio value={APPLY_TIMING.REALTIME}>즉시</Radio>
                    <Radio value={APPLY_TIMING.RESERVED}>예약</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  name="applyDatetime"
                  noStyle
                  rules={[
                    {
                      validator: async (_r, value: Dayjs | undefined) => {
                        if (rtResvKind !== APPLY_TIMING.RESERVED) return;
                        if (!value) throw new Error('예약 일시는 필수입니다');
                        if (!value.isAfter(dayjs())) throw new Error('예약 일시는 현재 시각 이후여야 합니다');
                      },
                    },
                  ]}
                >
                  <DatePicker
                    showTime={{ format: 'HH:mm', minuteStep: 5 }}
                    format="YYYY-MM-DD HH:mm"
                    disabled={rtResvKind !== APPLY_TIMING.RESERVED}
                    disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                    placeholder="예약 시각"
                    style={{ width: 200 }}
                  />
                </Form.Item>
              </div>
            </Form.Item>

            {/* 대상 시스템 — 체크박스 선택 (예약중은 disabled). HA 백업은 배포 제외(읽기전용). */}
            <div className="mb-4">
              {/* SleeConfig 적용 사이드바와 동일: 좌측 "대상 시스템 (n/n) · 예약중 N개 제외" / 우측 "전체" 체크박스 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-slate-700">
                  대상 시스템 ({selectedSystemIds.size}/{checkableSystems.length})
                  {assignedSystems.some((s) => s.reserved) && (
                    <span className="text-[11px] font-normal text-slate-400"> · 예약중 {assignedSystems.filter((s) => s.reserved).length}개 제외</span>
                  )}
                </span>
                {checkableSystems.length > 0 && (
                  <Checkbox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={(e) => toggleAll(e.target.checked)}>
                    <span className="text-[11px] text-slate-500">전체</span>
                  </Checkbox>
                )}
              </div>
              <div className="border border-slate-200 rounded-md">
                {assignedSystems.length === 0 ? (
                  <div className="p-3">
                    <Empty description="배포 가능한 시스템이 없습니다. 배포 설정에서 시스템을 먼저 할당하세요." styles={{ image: { height: 40 } }} />
                  </div>
                ) : (
                  assignedSystems.map((sys: DeployTargetSystem, idx: number) => (
                    <label
                      key={sys.systemId}
                      className={`flex items-center gap-2 p-2 cursor-pointer ${idx < assignedSystems.length - 1 ? 'border-b border-slate-100' : ''} ${sys.reserved ? 'opacity-60' : 'hover:bg-slate-50'}`}
                    >
                      <Checkbox checked={selectedSystemIds.has(sys.systemId)} disabled={!!sys.reserved} onChange={(e) => toggleSystem(sys.systemId, e.target.checked)} />
                      <Server className="size-3.5 text-[#405189] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-slate-800 truncate">{sys.systemName}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {sys.serviceVer ? `현재 v${sys.serviceVer}` : ''}
                          {sys.haGroupName ? `${sys.serviceVer ? ' · ' : ''}${sys.haGroupName}` : ''}
                        </div>
                      </div>
                      {sys.reserved && (
                        <Tag color="blue" className="!m-0 !text-[10px] !leading-4 !py-0">
                          예약중
                        </Tag>
                      )}
                    </label>
                  ))
                )}
                {haBackupSystems.map((sys: DeployTargetSystem) => (
                  <div key={sys.systemId} className="flex items-center gap-2 p-2 bg-slate-50 border-t border-slate-100">
                    <Shield className="size-3.5 text-slate-400 flex-shrink-0 ml-[2px]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-400 truncate">{sys.systemName}</div>
                    </div>
                    <Tag color="default" className="!m-0 !text-[10px] !leading-4 !py-0">
                      백업 · 배포 제외
                    </Tag>
                  </div>
                ))}
              </div>
            </div>

            <Button type="primary" htmlType="submit" block loading={isPublishing} disabled={!effectiveVersion.scenarioFile || selectedSystemIds.size === 0}>
              적용
            </Button>
          </Form>
        </div>
      )}
      <ScenarioDeployResultModal ref={resultModalRef} />
    </Drawer>
  );
}
