import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { InputNumber, Switch, Table, type TableColumnsType } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useGetModelDetails, useUpdateModelDetail } from '../hooks/useModelQueries';
import type { ModelDetailItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

export default function ModelVersionList() {
  const { modelId } = useParams();
  const queryClient = useQueryClient();

  const { data: details, isFetching } = useGetModelDetails({ params: { modelId } });

  const { mutate: updateDetail } = useUpdateModelDetail({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModelDetails({ modelId }).queryKey });
      },
      onError: (error: Error) => {
        Log.warn('updateModelDetail failed', error);
      },
    },
  });

  const handleToggleUseYn = (record: ModelDetailItem) => {
    updateDetail({
      detailId: record.detailId,
      data: {
        useYn: record.useYn === 1 ? 0 : 1,
        costPerInputToken: record.costPerInputToken,
        costPerOutputToken: record.costPerOutputToken,
      },
    });
  };

  const handleCostBlur = (record: ModelDetailItem, field: 'costPerInputToken' | 'costPerOutputToken', value: number | null) => {
    if (value === null || value === record[field]) return;
    updateDetail({
      detailId: record.detailId,
      data: {
        useYn: record.useYn,
        costPerInputToken: field === 'costPerInputToken' ? (value ?? undefined) : record.costPerInputToken,
        costPerOutputToken: field === 'costPerOutputToken' ? (value ?? undefined) : record.costPerOutputToken,
      },
    });
    toast.success('저장되었습니다.');
  };

  const columns: TableColumnsType<ModelDetailItem> = [
    {
      title: '모델 버전',
      dataIndex: 'modelVersion',
      key: 'modelVersion',
    },
    {
      title: 'INPUT 토큰 요금',
      dataIndex: 'costPerInputToken',
      key: 'costPerInputToken',
      width: 200,
      render: (value, record) => (
        <InputNumber
          defaultValue={value}
          min={0}
          step={0.000001}
          precision={6}
          placeholder="0.000000"
          className="w-full"
          onBlur={(e) => handleCostBlur(record, 'costPerInputToken', e.target.value ? Number(e.target.value) : null)}
        />
      ),
    },
    {
      title: 'OUTPUT 토큰 요금',
      dataIndex: 'costPerOutputToken',
      key: 'costPerOutputToken',
      width: 200,
      render: (value, record) => (
        <InputNumber
          defaultValue={value}
          min={0}
          step={0.000001}
          precision={6}
          placeholder="0.000000"
          className="w-full"
          onBlur={(e) => handleCostBlur(record, 'costPerOutputToken', e.target.value ? Number(e.target.value) : null)}
        />
      ),
    },
    {
      title: '활성화',
      dataIndex: 'useYn',
      key: 'useYn',
      width: 100,
      align: 'center',
      render: (value, record) => <Switch checked={value === 1} onChange={() => handleToggleUseYn(record)} />,
    },
  ];

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <FallbackSpinner />
      </div>
    );
  }

  if (!details?.length) {
    return <NoData message="등록된 모델 버전이 없습니다." iconSize={40} fontSize="text-base" gap={2} />;
  }

  return <Table rowKey="detailId" dataSource={details} columns={columns} pagination={false} size="middle" />;
}
