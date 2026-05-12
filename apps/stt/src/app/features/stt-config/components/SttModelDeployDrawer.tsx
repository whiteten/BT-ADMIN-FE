import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, DatePicker, Drawer, Input, Radio, Select, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { useGetCodes, useGetSttSystemList } from '../hooks/useCommonQueries';
import { modelQueryKeys, useDeployModel, useGetSttModelList } from '../hooks/useModelQueries';
import type { SttSystemItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

export interface SttModelDeployDrawerRef {
  open: (engineCode?: string) => void;
  close: () => void;
}

const systemColumnDefs: ColDef<SttSystemItem>[] = [
  { headerName: '장비명', field: 'systemName', flex: 2, minWidth: 100 },
  { headerName: '별칭', field: 'systemAlias', flex: 2, minWidth: 100 },
  { headerName: '시스템 분류', field: 'sysClassCdNm', flex: 2, minWidth: 100 },
  { headerName: '호스트명', field: 'hostName', flex: 2, minWidth: 100 },
];

const SttModelDeployDrawer = forwardRef<SttModelDeployDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [engineCode, setEngineCode] = useState('');
  const [selectedModelVerId, setSelectedModelVerId] = useState<string | undefined>();
  const [deployType, setDeployType] = useState<0 | 1>(0);
  const [scheduleDate, setScheduleDate] = useState<Dayjs | null>(dayjs());
  const [scheduleTime, setScheduleTime] = useState<Dayjs | null>(dayjs());
  const [selectedSystems, setSelectedSystems] = useState<SttSystemItem[]>([]);

  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();

  useImperativeHandle(ref, () => ({
    open: (ec?: string) => {
      setSelectedModelVerId(undefined);
      setDeployType(0);
      setScheduleDate(dayjs());
      setScheduleTime(dayjs());
      setSelectedSystems([]);
      if (ec) setEngineCode(ec);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  const { data: engines } = useGetCodes({ params: { classCd: 'ENGINE_KIND' } });

  useEffect(() => {
    if (engines && engines.length > 0 && !engineCode) {
      setEngineCode(engines[0].code);
    }
  }, [engines, engineCode]);

  const { data: models = [] } = useGetSttModelList({
    params: engineCode ? { engineCode } : null,
  });

  const modelOptions = models.filter((m) => m.tunningResult === 50).map((m) => ({ label: m.modelVerName, value: m.modelVerId }));

  const selectedModel = models.find((m) => m.modelVerId === selectedModelVerId) ?? null;

  const { data: systems = [], isLoading: isSystemsLoading } = useGetSttSystemList();

  const { mutate: deployModel, isPending } = useDeployModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배포 요청이 완료되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getSttModelDeployList._def });
        handleClose();
      },
      onError: () => toast.error('배포 요청에 실패했습니다.'),
    },
  });

  const handleSubmit = () => {
    if (!selectedModelVerId) {
      toast.warning('배포 모델을 선택해주세요.');
      return;
    }
    if (selectedSystems.length === 0) {
      toast.warning('배포 대상 장비를 선택해주세요.');
      return;
    }
    if (deployType === 1 && (!scheduleDate || !scheduleTime)) {
      toast.warning('예약 배포 일시를 설정해주세요.');
      return;
    }

    const distributeDateTime = deployType === 0 ? dayjs().format('YYYYMMDDHHmmss') : `${scheduleDate!.format('YYYYMMDD')}${scheduleTime!.format('HHmmss')}`;

    deployModel({
      modelVerId: selectedModelVerId,
      distributeType: deployType,
      distributeDateTime,
      systemIds: selectedSystems.map((s) => s.systemId),
    });
  };

  const isScheduled = deployType === 1;

  const multiRowGridOptions = {
    ...gridOptions,
    rowSelection: { mode: 'multiRow' as const, checkboxes: true, headerCheckbox: true, enableClickSelection: false },
    pagination: false,
    statusBar: undefined,
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button onClick={handleClose}>취소</Button>
      <Button color="cyan" variant="solid" onClick={handleSubmit} loading={isPending}>
        배포 요청
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="모델 배포"
      closable={{ placement: 'end' }}
      footer={footer}
      destroyOnHidden
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: 24, overflow: 'auto', padding: '24px' }, wrapper: { width: '40%' } }}
    >
      {/* 배포정보 */}
      <section className="flex flex-col gap-4 border border-gray-200 bg-gray-50 rounded-lg p-4">
        <h3 className="text-base font-semibold text-[#212529]">배포정보</h3>

        {/* 배포 모델 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#495057]">
            배포 모델 <span className="text-red-500">*</span>
          </label>
          <Select
            value={selectedModelVerId}
            onChange={setSelectedModelVerId}
            options={modelOptions}
            placeholder="모델을 선택하세요"
            style={{ width: '100%' }}
            notFoundContent="학습 완료된 모델이 없습니다."
          />
        </div>

        {/* 모델 적용 내용 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#495057]">모델 적용 내용</label>
          <Input.TextArea value={selectedModel?.modelDesc ?? ''} readOnly rows={4} />
        </div>

        {/* 인식률 / 생성일시 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#495057]">인식률</label>
            <Input value={selectedModel?.recogRate ?? ''} readOnly />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#495057]">생성일시</label>
            <Input value={selectedModel?.workTime ? dayjs(selectedModel.workTime).format('YYYY-MM-DD HH:mm:ss') : ''} readOnly />
          </div>
        </div>

        {/* 배포 구분 */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-[#495057] shrink-0">
            배포 구분 <span className="text-red-500">*</span>
          </label>
          <Radio.Group value={deployType} onChange={(e) => setDeployType(e.target.value)}>
            <Radio value={0}>즉시배포</Radio>
            <Radio value={1}>예약배포</Radio>
          </Radio.Group>
          <DatePicker value={scheduleDate} onChange={setScheduleDate} format="YYYY-MM-DD" disabled={!isScheduled} allowClear={false} inputReadOnly />
          <TimePicker
            value={scheduleTime}
            onChange={setScheduleTime}
            format="HH:mm"
            disabled={!isScheduled}
            allowClear={false}
            inputReadOnly
            needConfirm={false}
            style={{ width: 100 }}
          />
        </div>
      </section>

      {/* 배포 대상 장비 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-[#212529]">배포 대상 장비</h3>
        <div style={{ height: 280 }}>
          <AgGridReact<SttSystemItem>
            rowData={systems}
            columnDefs={systemColumnDefs}
            gridOptions={multiRowGridOptions}
            loading={isSystemsLoading}
            sideBar={false}
            getRowId={(p) => p.data.systemId}
            onSelectionChanged={(e) => setSelectedSystems(e.api.getSelectedRows())}
          />
        </div>
      </section>
    </Drawer>
  );
});

SttModelDeployDrawer.displayName = 'SttModelDeployDrawer';
export default SttModelDeployDrawer;
