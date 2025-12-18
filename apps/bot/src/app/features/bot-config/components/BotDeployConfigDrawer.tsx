import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Transfer, type TransferProps } from 'antd';
import { useGetBotDeployConfig } from '../hooks/useBotQueries';
import { IconList } from '@/components/custom/Icons';
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

  const { data: botDeployConfig, isFetching } = useGetBotDeployConfig({
    params: { serviceId: '14', version: '1.0.0' }, // TODO: 조회 목록이 있는 데이터 조건 하드코딩. 추후 수정 필요.
    queryOptions: { enabled: !!serviceId && !!version && open },
  });

  const initialTargetKeys = botDeployConfig?.filter((item) => !!item.serviceVer).map((item) => item.systemId);

  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>(initialTargetKeys);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  // Transfer 핸들러
  const handleTransferChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const handleTransferSelectChange: TransferProps['onSelectChange'] = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

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

  const handleSave = () => {
    const params = {
      serviceId: serviceId,
      serviceVer: version,
      systemIds: targetKeys,
    };
    alert(JSON.stringify(params));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" loading={isFetching} onClick={handleSave}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="배포설정" closable={{ placement: 'end' }} size={732} footer={footer} destroyOnHidden>
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <IconList className="size-6 text-[#9599AD]" />
          <span className="text-lg text-[#212529] font-bold">봇 서버 목록</span>
        </div>
        <div className="flex mb-2">
          <span className="text-base text-[#495057] font-medium !w-[calc(50%+21px)]">미 적용 목록</span>
          <span className="text-base text-[#495057] font-medium">적용 목록</span>
        </div>
        {isFetching ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <div className="w-full h-full">
            <Transfer
              dataSource={botDeployConfig} // 전체 데이터 목록
              rowKey={(item) => item.systemId}
              targetKeys={targetKeys} // 적용 목록
              selectedKeys={selectedKeys} // 체크박스 선택목록(좌우 모두)
              onChange={handleTransferChange} // 아이템 이동시 호출
              onSelectChange={handleTransferSelectChange} // 체크박스 선택시 호출
              render={(item) => `${item.roleSystemName}[${item.roleAlias}]`}
              filterOption={(input, option) => {
                const keyword = input.toLowerCase();
                return option.roleSystemName?.toLowerCase().includes(keyword) || option.roleAlias?.toLowerCase().includes(keyword);
              }}
              classNames={{ section: '!w-full !h-[520px]' }}
              pagination={false}
              showSearch
              showSelectAll={true}
              locale={{
                notFoundContent: '데이터가 없습니다.',
                searchPlaceholder: '검색어를 입력하세요.',
              }}
              selectAllLabels={[(info) => `전체 선택 (총 ${info.totalCount}개)`, (info) => `전체 선택 (총 ${info.totalCount}개)`]}
              className="[&_.ant-transfer-list-header_.ant-dropdown-trigger]:!hidden"
            />
          </div>
        )}
      </div>
    </Drawer>
  );
});

export default BotDeployConfigDrawer;
