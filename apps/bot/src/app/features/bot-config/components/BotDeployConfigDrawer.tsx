import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer } from 'antd';
import { useGetBotDeployConfig } from '../hooks/useBotQueries';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

/**
 * BotDeployConfigDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface BotDeployConfigDrawerRef {
  open: (params: { serviceId: string; serviceVer?: string }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  serviceId: string;
  serviceVer?: string;
}

/**
 * Bot 배포설정 Drawer
 * - ref.open({ serviceId, serviceVer }) : 드로어 열기
 * - ref.close() : 드로어 닫기
 */
const BotDeployConfigDrawer = forwardRef<BotDeployConfigDrawerRef>((_, ref) => {
  // 드로어 상태 (open 여부, serviceId, serviceVer)
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    serviceId: '',
    serviceVer: undefined,
  });

  const { open, serviceId, serviceVer: version } = drawerState;

  const { data: botDeployConfig, isFetching } = useGetBotDeployConfig({ params: { serviceId, version }, queryOptions: { enabled: !!serviceId && !!version && open } });

  // 부모 컴포넌트에서 ref를 통해 호출할 수 있는 메서드 정의
  useImperativeHandle(ref, () => ({
    /**
     * 드로어 열기
     * @param params.serviceId - 서비스 ID (필수)
     * @param params.serviceVer - 서비스 버전 (선택)
     */
    open: (params) => {
      setDrawerState({
        open: true,
        serviceId: params.serviceId,
        serviceVer: params.serviceVer,
      });
    },
    /**
     * 드로어 닫기
     */
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  // 드로어 닫기 핸들러 (내부용)
  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary">
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="배포설정" closable={{ placement: 'end' }} size={732} footer={footer} destroyOnHidden>
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <div className="flex flex-col gap-4">{JSON.stringify(botDeployConfig)}</div>
      )}
    </Drawer>
  );
});

export default BotDeployConfigDrawer;
