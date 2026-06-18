/**
 * 시나리오 기본 정보 탭 — BotBasicInfo 패턴 동일 (inline edit).
 *
 * <p>레거시 IPR20S6020_Scenario.jsp 의 등록 폼 필드만 표시 (versionCount/tenant/workUser/workTime 등은 제외).</p>
 * <p>표시 필드:</p>
 * <ul>
 *   <li>읽기 전용 — 시나리오 ID, 기본 파일명 (등록 후 변경 불가)</li>
 *   <li>수정 가능 — 시나리오명, 시나리오 종류, 멘트 경로, 최대 유지시간, 설명</li>
 * </ul>
 * <p>액션 버튼 (취소/삭제/저장) 은 하단 sticky bottom (BotBasicInfo 패턴).</p>
 */
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { toast } from '@/shared-util';
import { scenarioQueryKeys, useDeleteScenario, useGetScenarioDetail, useUpdateScenario } from '../hooks/useScenarioQueries';
import { SCENARIO_TYPE_OPTIONS, type ScenarioType } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const { TextArea } = Input;

interface FormValues {
  serviceName: string;
  serviceType: ScenarioType;
  mentfilePath?: string;
  maxKeepTime?: number;
  serviceDesc?: string;
}

export default function ScenarioBasicInfo() {
  const { serviceId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();

  const { data: scenario, isFetching } = useGetScenarioDetail({
    params: { serviceId: Number(serviceId) },
    queryOptions: { enabled: !!serviceId },
  });

  // ACS 타입 (20, 70) 은 serviceType 변경 불가 — AS-IS IPR20S6020_Scenario 정책 동일.
  const isAcsType = scenario?.serviceType === '20' || scenario?.serviceType === '70';

  const { mutate: updateMutate, isPending: isUpdating } = useUpdateScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오 기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarioDetail._def });
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
      },
    },
  });

  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
        // 라우터의 scenario/:serviceId 의 부모가 'ivr' 라 '..' 가 list 가 아닌 ivr 메인으로 감.
        // history back 이 사용자 의도(직전 list) 와 항상 일치.
        navigate(-1);
      },
    },
  });

  useEffect(() => {
    if (!scenario) return;
    form.setFieldsValue({
      serviceName: scenario.serviceName,
      serviceType: scenario.serviceType,
      mentfilePath: scenario.mentfilePath ?? undefined,
      maxKeepTime: scenario.maxKeepTime ?? 0,
      serviceDesc: scenario.serviceDesc ?? undefined,
    });
  }, [scenario, form]);

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    if (!serviceId) return;
    updateMutate({ params: { serviceId: Number(serviceId) }, data: values });
  };

  const handleDelete = () => {
    if (!scenario) return;
    modal.confirm.delete({
      options: {
        title: '시나리오 삭제',
        content: `"${scenario.serviceName}" 시나리오를 삭제하시겠습니까?\n버전이 1개 이상 있으면 삭제 불가입니다.`,
      },
      onOk: () => deleteMutate({ serviceId: scenario.serviceId }),
    });
  };

  return (
    <Form<FormValues> form={form} onFinish={onFinish} layout="vertical" requiredMark>
      {isFetching || !scenario ? (
        <div className="flex items-center justify-center w-full h-64">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          {/* 라인 1: 시나리오 ID (짧음) + 시나리오 이름 (중간) — BotBasicInfo 의 봇이름+버전 패턴 */}
          <Row gutter={20}>
            <Col span={4}>
              <Form.Item label="시나리오 ID">
                <Input value={scenario.serviceId} disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="serviceName"
                label="시나리오 이름"
                required
                hasFeedback
                rules={[
                  { required: true, message: '시나리오 이름을 입력해 주세요.' },
                  { max: 33, message: '시나리오 이름은 33자 이내여야 합니다.' },
                  { pattern: /^[a-zA-Z0-9가-힣_ ]+$/, message: '영문, 한글, 숫자, 밑줄(_), 공백만 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 신용카드_본인확인" maxLength={33} />
              </Form.Item>
            </Col>
          </Row>

          {/* 라인 2: 시나리오 종류 + 기본 파일명 (disabled) — 라인 1과 동일 너비 (4 + 8) */}
          <Row gutter={20}>
            <Col span={4}>
              <Form.Item name="serviceType" label="시나리오 종류" required hasFeedback rules={[{ required: true, message: '시나리오 종류를 선택해 주세요.' }]}>
                <Select
                  placeholder="선택"
                  disabled={isAcsType}
                  options={SCENARIO_TYPE_OPTIONS
                    // 현재 시나리오의 타입은 반드시 포함 (라벨 매칭). 다른 ACS 타입은 신규 선택 차단.
                    .filter((o) => !['20', '70'].includes(o.value) || o.value === scenario.serviceType)
                    .map((o) => ({ label: o.label, value: o.value }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="기본 파일명" tooltip="등록 후 변경 불가 — SXML 파일명 prefix">
                <Input value={scenario.defaultFilename} disabled />
              </Form.Item>
            </Col>
          </Row>

          {/* 라인 3: 멘트 경로 (긴 경로) */}
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item
                name="mentfilePath"
                label="멘트 위치"
                required
                hasFeedback
                rules={[
                  { required: true, message: '멘트 위치를 입력해 주세요.' },
                  { max: 256, message: '멘트 위치는 256자 이내여야 합니다.' },
                ]}
              >
                <Input placeholder="IPRON/ment/" maxLength={256} />
              </Form.Item>
            </Col>
          </Row>

          {/* 라인 4: 최대 콜유지시간 */}
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item
                name="maxKeepTime"
                label="최대 콜유지시간 (초)"
                required
                hasFeedback
                tooltip="0 ~ 9999999999"
                rules={[
                  { required: true, message: '최대 콜유지시간을 입력해 주세요.' },
                  { type: 'number', min: 0, max: 9999999999, message: '0 ~ 9999999999 범위여야 합니다.' },
                ]}
              >
                <InputNumber min={0} max={9999999999} precision={0} keyboard style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 라인 5: 설명 (전체 폭) */}
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="serviceDesc" label="설명" rules={[{ max: 256, message: '설명은 256자 이내여야 합니다.' }]}>
                <TextArea rows={3} maxLength={256} showCount placeholder="시나리오 설명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>

          {/* 액션 — 하단 sticky (BotBasicInfo 동일 패턴) */}
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7 pt-3">
            <Col>
              <Button onClick={() => navigate(-1)}>취소</Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleDelete}>
                삭제
              </Button>
            </Col>
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
