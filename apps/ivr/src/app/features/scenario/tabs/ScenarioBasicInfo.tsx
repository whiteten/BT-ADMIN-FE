import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Descriptions, Tag } from 'antd';
import { Edit3 } from 'lucide-react';
import ScenarioMasterSheet, { type ScenarioMasterSheetRef } from '../components/ScenarioMasterSheet';
import { scenarioQueryKeys, useGetScenarioDetail } from '../hooks/useScenarioQueries';
import { SCENARIO_TYPE_COLORS, SCENARIO_TYPE_LABELS } from '../types';

export default function ScenarioBasicInfo() {
  const { serviceId } = useParams();
  const queryClient = useQueryClient();
  const masterSheetRef = useRef<ScenarioMasterSheetRef>(null);

  const { data: scenario } = useGetScenarioDetail({
    params: { serviceId: Number(serviceId) },
    queryOptions: { enabled: !!serviceId },
  });

  if (!scenario) return null;

  const tc = SCENARIO_TYPE_COLORS[scenario.serviceType] ?? { bg: 'bg-slate-100', text: 'text-slate-700' };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button icon={<Edit3 className="size-3.5" />} onClick={() => masterSheetRef.current?.open(scenario)}>
          수정
        </Button>
      </div>

      <Descriptions bordered column={2} size="middle">
        <Descriptions.Item label="시나리오 ID">{scenario.serviceId}</Descriptions.Item>
        <Descriptions.Item label="시나리오 종류">
          <Tag className={`${tc.bg} ${tc.text} !border-0`}>{SCENARIO_TYPE_LABELS[scenario.serviceType] ?? scenario.serviceType}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="시나리오명">{scenario.serviceName}</Descriptions.Item>
        <Descriptions.Item label="기본 파일명">{scenario.defaultFilename}</Descriptions.Item>
        <Descriptions.Item label="멘트 경로">{scenario.mentfilePath ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="최대 유지시간 (초)">{scenario.maxKeepTime ?? 0}</Descriptions.Item>
        <Descriptions.Item label="버전 수">{scenario.versionCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="테넌트">{scenario.tenantName ?? scenario.tenantId}</Descriptions.Item>
        <Descriptions.Item label="설명" span={2}>
          {scenario.serviceDesc ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="작업자">{scenario.workUserName ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="작업일시">{scenario.workTime ?? '-'}</Descriptions.Item>
      </Descriptions>

      <ScenarioMasterSheet
        ref={masterSheetRef}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarioDetail._def });
          queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
        }}
      />
    </div>
  );
}
