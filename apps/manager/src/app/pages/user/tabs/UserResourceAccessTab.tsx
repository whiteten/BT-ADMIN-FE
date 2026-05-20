/**
 * 사용자 상세 - 리소스 접근 탭
 * - 사용자별 조회 가능한 봇/모델 설정
 * - 설정하지 않으면 모든 리소스 조회 가능
 * - Deferred Save 패턴: 로컬 상태 → 저장 버튼으로 동기화
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Row } from 'antd';
import { toast } from '@/shared-util';
import ResourceSection from '../../../features/user-resource/components/ResourceSection';
import { useGetBots, useGetModels, useGetUserResourceMaps, useSyncUserResources } from '../../../features/user-resource/hooks/useUserResourceQueries';
import type { AssignedResource, AvailableResource } from '../../../features/user-resource/types/userResource.types';
import { useUserDetailContext } from '../context/UserDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function UserResourceAccessTab() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const numericUserId = userId ? Number(userId) : 0;
  const { setResourceStats } = useUserDetailContext();

  // API 조회
  const { data: resourceMaps, isLoading: isLoadingMaps } = useGetUserResourceMaps(numericUserId);
  const { data: bots, isLoading: isLoadingBots } = useGetBots();
  const { data: models, isLoading: isLoadingModels } = useGetModels();
  const syncMutation = useSyncUserResources();

  // 로컬 상태 (Deferred Save)
  const [botItems, setBotItems] = useState<AssignedResource[]>([]);
  const [modelItems, setModelItems] = useState<AssignedResource[]>([]);

  // 초기 상태 (변경 감지용)
  const [initialBotItems, setInitialBotItems] = useState<AssignedResource[]>([]);
  const [initialModelItems, setInitialModelItems] = useState<AssignedResource[]>([]);

  // 봇 목록을 AvailableResource 형태로 변환
  const availableBots: AvailableResource[] = useMemo(() => {
    return (bots ?? []).map((bot) => ({
      id: String(bot.serviceId),
      name: bot.serviceName,
      description: bot.serviceDesc,
    }));
  }, [bots]);

  // 모델 목록을 AvailableResource 형태로 변환
  const availableModels: AvailableResource[] = useMemo(() => {
    return (models ?? []).map((model) => ({
      id: model.modelId,
      name: model.modelName,
      description: model.expansion1,
      tag: model.modelType === 1 ? '공용' : undefined,
    }));
  }, [models]);

  // 서버 데이터 로드 시 로컬 상태 초기화
  useEffect(() => {
    if (!resourceMaps || !bots || !models) return;

    // 봇 매핑 변환
    const botMaps = resourceMaps
      .filter((m) => m.resourceType === 'BOT')
      .map((m) => {
        const bot = bots.find((b) => String(b.serviceId) === m.resourceId);
        return {
          resourceId: m.resourceId,
          resourceName: bot?.serviceName ?? m.resourceId,
          description: bot?.serviceDesc,
        };
      });

    // 모델 매핑 변환
    const modelMaps = resourceMaps
      .filter((m) => m.resourceType === 'NLU_MODEL')
      .map((m) => {
        const model = models.find((md) => md.modelId === m.resourceId);
        return {
          resourceId: m.resourceId,
          resourceName: model?.modelName ?? m.resourceId,
          description: model?.expansion1,
          tag: model?.modelType === 1 ? '공용' : undefined,
        };
      });

    setBotItems(botMaps);
    setModelItems(modelMaps);
    setInitialBotItems(botMaps);
    setInitialModelItems(modelMaps);
  }, [resourceMaps, bots, models]);

  // Context에 리소스 통계 보고 (요약 사이드바용)
  useEffect(() => {
    setResourceStats({ botCount: botItems.length, modelCount: modelItems.length });
  }, [botItems.length, modelItems.length, setResourceStats]);

  // 변경 여부 확인
  const hasChanges = useMemo(() => {
    if (botItems.length !== initialBotItems.length) return true;
    if (modelItems.length !== initialModelItems.length) return true;
    const botIdsChanged = botItems.some((item, i) => item.resourceId !== initialBotItems[i]?.resourceId);
    const modelIdsChanged = modelItems.some((item, i) => item.resourceId !== initialModelItems[i]?.resourceId);
    return botIdsChanged || modelIdsChanged;
  }, [botItems, modelItems, initialBotItems, initialModelItems]);

  // 저장 핸들러
  const handleSave = useCallback(() => {
    if (!numericUserId) return;

    syncMutation.mutate(
      {
        userId: numericUserId,
        data: {
          botIds: botItems.map((item) => item.resourceId),
          nluModelIds: modelItems.map((item) => item.resourceId),
        },
      },
      {
        onSuccess: () => {
          setInitialBotItems([...botItems]);
          setInitialModelItems([...modelItems]);
          toast.success('리소스 접근 설정이 저장되었습니다.');
        },
      },
    );
  }, [numericUserId, botItems, modelItems, syncMutation]);

  // 로딩 상태
  const isLoading = isLoadingMaps || isLoadingBots || isLoadingModels;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <ResourceSection
          title="리소스 접근"
          groups={[
            {
              resourceType: 'BOT',
              title: '봇 서비스',
              drawerTitle: '봇 서비스 추가',
              availableResources: availableBots,
              assignedItems: botItems,
              onAssignedItemsChange: setBotItems,
            },
            {
              resourceType: 'NLU_MODEL',
              title: 'NLU 모델',
              drawerTitle: 'NLU 모델 추가',
              availableResources: availableModels,
              assignedItems: modelItems,
              onAssignedItemsChange: setModelItems,
            },
          ]}
        />
      </div>

      {/* 버튼 */}
      <Row gutter={20} justify="center" className="shrink-0 bg-white z-10 py-3 border-t border-gray-100">
        <Col>
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
        </Col>
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} disabled={!hasChanges} loading={syncMutation.isPending}>
            저장
          </Button>
        </Col>
      </Row>
    </div>
  );
}
