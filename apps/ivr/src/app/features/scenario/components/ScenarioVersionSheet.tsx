/**
 * 시나리오 버전 추가 Sheet.
 *
 * <p>AS-IS SWAT 패턴 회귀: 사용자가 PC에서 작성한 SXML 파일을 직접 업로드.</p>
 * <p>흐름: (1) 메타정보로 버전 INSERT → (2) 선택한 SXML 파일이 있으면 multipart 업로드.</p>
 *
 * <p>[DEACTIVATED] IFE 비동기 복사(sourcever) 흐름 — IFE 재연동 시 복구.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Drawer, Form, Input, Upload, type UploadFile } from 'antd';
import { Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import { scenarioQueryKeys, useCreateVersionWithFile } from '../hooks/useScenarioQueries';

interface ScenarioVersionSheetProps {
  serviceId: number;
  serviceName: string;
  /** [DEACTIVATED] 복사 원본 선택용 — 기존 버전 리스트. IFE 재연동 시 복구. */
  // existingVersions: ScenarioVersion[];
}

export interface ScenarioVersionSheetRef {
  open: () => void;
  close: () => void;
}

interface FormValues {
  serviceVer: string;
  versionName?: string;
  versionDesc?: string;
}

const ScenarioVersionSheet = forwardRef<ScenarioVersionSheetRef, ScenarioVersionSheetProps>(({ serviceId, serviceName }, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [sxmlFile, setSxmlFile] = useState<UploadFile | null>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      form.resetFields();
      setSxmlFile(null);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  // AS-IS SWAT 패턴 회귀: 버전 등록 + 파일 업로드를 한 번의 multipart 호출로 통합.
  const { mutate: createWithFileMutate, isPending } = useCreateVersionWithFile({
    mutationOptions: {
      onSuccess: () => {
        toast.success(sxmlFile ? '버전 + 시나리오 파일이 등록되었습니다.' : '버전이 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getVersions._def });
        setVisible(false);
      },
      onError: (err) => {
        toast.error(`등록 실패: ${(err as Error).message ?? '알 수 없는 오류'}`);
      },
    },
  });

  const handleSubmit = (values: FormValues) => {
    const fileObj = sxmlFile?.originFileObj as File | undefined;
    createWithFileMutate({
      params: { serviceId },
      data: values,
      file: fileObj,
    });
  };

  return (
    <Drawer
      title="버전 추가"
      placement="right"
      width={480}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            생성
          </Button>
        </div>
      }
    >
      <Alert type="info" showIcon message={`시나리오: ${serviceName} (${serviceId})`} className="!mb-4" />

      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
        <Form.Item
          name="serviceVer"
          label="버전"
          rules={[
            { required: true, message: '버전은 필수입니다' },
            { max: 30, message: '버전은 30자 이내여야 합니다' },
            { pattern: /^[a-zA-Z0-9._-]+$/, message: '영문, 숫자, 마침표, 밑줄, 하이픈만 가능합니다' },
          ]}
        >
          <Input placeholder="예: 1.3" maxLength={30} />
        </Form.Item>

        <Form.Item name="versionName" label="버전명" rules={[{ max: 100, message: '100자 이내' }]}>
          <Input placeholder="예: 본인확인_v3" maxLength={100} />
        </Form.Item>

        <Form.Item name="versionDesc" label="변경 내용" rules={[{ max: 256, message: '256자 이내' }]}>
          <Input.TextArea rows={3} maxLength={256} />
        </Form.Item>

        <Form.Item label="SXML 파일" extra="선택사항 — 비워두면 버전 메타정보만 등록. 이후 별도로 업로드 가능.">
          <Upload
            accept=".sxml,.SXML"
            maxCount={1}
            beforeUpload={() => false /* 즉시 업로드 안 함 — 생성 버튼에서 함께 전송 */}
            onChange={(info) => setSxmlFile(info.fileList[0] ?? null)}
            fileList={sxmlFile ? [sxmlFile] : []}
            onRemove={() => setSxmlFile(null)}
          >
            <Button icon={<UploadIcon className="size-3.5" />}>파일 선택</Button>
          </Upload>
        </Form.Item>

        {/* [DEACTIVATED] IFE 복사(sourcever) 흐름 — IFE 재연동 시 복구
        <Form.Item
          name="sourcever"
          label="원본 버전 (복사 시)"
          extra="선택 시 IFE에서 시나리오를 복사합니다 (비동기, 완료까지 30초~수 분)"
        >
          <Select
            allowClear
            placeholder="(선택 안 함 — 빈 버전 생성)"
            options={existingVersions.map((v) => ({
              label: `${v.serviceVer}${v.versionName ? ` (${v.versionName})` : ''}`,
              value: v.serviceVer,
            }))}
          />
        </Form.Item>
        */}

        <Alert
          type="info"
          showIcon
          message="안내"
          description={<span>SXML 파일을 함께 선택하면 버전 등록 후 자동으로 업로드 + 분석이 수행됩니다. 파일 없이 메타정보만 먼저 등록 후 나중에 업로드해도 됩니다.</span>}
        />
      </Form>
    </Drawer>
  );
});

ScenarioVersionSheet.displayName = 'ScenarioVersionSheet';
export default ScenarioVersionSheet;
