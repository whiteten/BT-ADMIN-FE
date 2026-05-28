/**
 * 시나리오 배포 설정 Drawer (FCA BotDeployConfigDrawer 미러링).
 *
 * <p>Transfer UI 좌(미적용) ↔ 우(적용) 시스템 이동 후 저장.</p>
 * <p>저장 시 서버는 delta apply — 빠진 systemId는 DELETE(버전 미보유 행만), 새 systemId는 INSERT.</p>
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Transfer, type TransferProps } from 'antd';
import { toast } from '@/shared-util';
import { useGetDeployConfig, useSaveDeployConfig } from '../hooks/useScenarioQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconList } from '@/components/custom/Icons';

export interface ScenarioDeployConfigDrawerRef {
  open: (params: { serviceId: number }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  serviceId: number | null;
}

const ScenarioDeployConfigDrawer = forwardRef<ScenarioDeployConfigDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, serviceId: null });
  const { open, serviceId } = drawerState;

  const { data: deployConfig, isFetching } = useGetDeployConfig({
    params: serviceId != null ? { serviceId } : undefined,
    queryOptions: { enabled: serviceId != null && open },
  });

  const { mutate: saveDeployConfig, isPending: isSaving } = useSaveDeployConfig({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배포 설정이 저장되었습니다.');
        handleClose();
      },
    },
  });

  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);

  useEffect(() => {
    if (open && deployConfig) {
      const initialTargetKeys = deployConfig.filter((item) => item.assignYn === 1).map((item) => item.systemId);
      setTargetKeys(initialTargetKeys);
    }
    if (!open) {
      setTargetKeys([]);
      setSelectedKeys([]);
    }
  }, [open, deployConfig]);

  const handleTransferChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setTargetKeys(nextTargetKeys);
  };

  const handleTransferSelectChange: TransferProps['onSelectChange'] = (sourceSelectedKeys, targetSelectedKeys) => {
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({ open: true, serviceId: params.serviceId });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const handleSave = () => {
    if (serviceId == null) return;
    saveDeployConfig({ params: { serviceId }, data: { systemIds: (targetKeys as number[]) ?? [] } });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" loading={isFetching || isSaving} onClick={handleSave}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="배포 설정" closable={{ placement: 'end' }} size={732} footer={footer} destroyOnHidden>
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <IconList className="size-6 text-[#9599AD]" />
          <span className="text-lg text-[#212529] font-bold">시나리오 적용 시스템 목록</span>
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
              dataSource={deployConfig}
              rowKey={(item) => item.systemId}
              targetKeys={targetKeys}
              selectedKeys={selectedKeys}
              onChange={handleTransferChange}
              onSelectChange={handleTransferSelectChange}
              render={(item) => `${item.systemName}`}
              filterOption={(input, option) => option.systemName?.toLowerCase().includes(input.toLowerCase()) ?? false}
              classNames={{ section: '!w-full !h-[520px]' }}
              pagination={false}
              showSearch
              showSelectAll
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

ScenarioDeployConfigDrawer.displayName = 'ScenarioDeployConfigDrawer';
export default ScenarioDeployConfigDrawer;
