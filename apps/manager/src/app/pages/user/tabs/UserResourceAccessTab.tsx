/**
 * 사용자 상세 - 리소스 접근 탭
 * - 사용자별 조회 가능한 봇/모델 설정
 * - 설정하지 않으면 모든 리소스 조회 가능
 * - Deferred Save 패턴: 로컬 상태 → 저장 버튼으로 동기화
 *
 * TODO: API 연동 시 아래 항목 구현 필요
 * - useGetUserResources 훅으로 기존 매핑 조회
 * - useSyncUserResources 훅으로 저장
 * - 봇/모델 목록은 BFF flow를 통해 조회
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Row } from 'antd';
import { toast } from '@/shared-util';
import ResourceSection from '../../../features/user-resource/components/ResourceSection';
import { MOCK_AVAILABLE_BOTS, MOCK_AVAILABLE_MODELS } from '../../../features/user-resource/constants';
import type { AssignedResource } from '../../../features/user-resource/types/userResource.types';
import { useUserDetailContext } from '../context/UserDetailContext';

// ──────────────────────────────────────────────
// TODO: API 연동 시 실제 데이터로 교체
// ──────────────────────────────────────────────
const MOCK_INITIAL_BOTS: AssignedResource[] = [{ resourceId: '1001', resourceName: '상담봇_인바운드' }];
const MOCK_INITIAL_MODELS: AssignedResource[] = [];

export default function UserResourceAccessTab() {
  const { userId } = useParams();
  const numericUserId = userId ? Number(userId) : undefined;
  const { setResourceStats } = useUserDetailContext();

  // 로컬 상태 (Deferred Save)
  const [botItems, setBotItems] = useState<AssignedResource[]>([]);
  const [modelItems, setModelItems] = useState<AssignedResource[]>([]);

  // 초기 상태 (변경 감지용)
  const [initialBotItems, setInitialBotItems] = useState<AssignedResource[]>([]);
  const [initialModelItems, setInitialModelItems] = useState<AssignedResource[]>([]);

  // 서버 데이터 로드 (mock)
  useEffect(() => {
    // TODO: API 연동 시 useGetUserResources로 교체
    setBotItems(MOCK_INITIAL_BOTS);
    setModelItems(MOCK_INITIAL_MODELS);
    setInitialBotItems(MOCK_INITIAL_BOTS);
    setInitialModelItems(MOCK_INITIAL_MODELS);
  }, [numericUserId]);

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

    // TODO: API 연동 시 useSyncUserResources로 교체
    console.log('Save user resources:', {
      userId: numericUserId,
      bots: botItems.map((item) => item.resourceId),
      models: modelItems.map((item) => item.resourceId),
    });

    // 저장 성공 시뮬레이션
    setInitialBotItems([...botItems]);
    setInitialModelItems([...modelItems]);
    toast.success('리소스 접근 설정이 저장되었습니다.');
  }, [numericUserId, botItems, modelItems]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-8">
        <ResourceSection
          title="봇 서비스"
          emptyDescription="설정하지 않으면 모든 봇을 조회할 수 있습니다."
          drawerTitle="봇 서비스 추가"
          availableResources={MOCK_AVAILABLE_BOTS}
          assignedItems={botItems}
          onAssignedItemsChange={setBotItems}
        />

        <ResourceSection
          title="NLU 모델"
          emptyDescription="설정하지 않으면 모든 모델을 조회할 수 있습니다."
          drawerTitle="NLU 모델 추가"
          availableResources={MOCK_AVAILABLE_MODELS}
          assignedItems={modelItems}
          onAssignedItemsChange={setModelItems}
        />
      </div>

      {/* 저장 버튼 */}
      <Row gutter={20} justify="center" className="shrink-0 bg-white z-10 py-3 border-t border-gray-100">
        <Col>
          <Button color="primary" variant="solid" onClick={handleSave} disabled={!hasChanges}>
            저장
          </Button>
        </Col>
      </Row>
    </div>
  );
}
