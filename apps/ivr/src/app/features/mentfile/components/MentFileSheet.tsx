/**
 * 멘트파일 등록/수정 Sheet (AS-IS IPR30S3020 등록 팝업).
 *
 * <p>등록 모드: 메타 + 파일 필수 → multipart create</p>
 * <p>수정 모드: 메타만 수정 시 JSON PUT, 파일 교체 있으면 multipart update-with-file</p>
 *
 * <h2>BAD_EXTENSION 차단 (FE 사전)</h2>
 * <p>BE 와 동일 정책 — jsp/php/asp/html/perl/exe/cer/sql/js/svg 업로드 차단. UX 즉시 거부.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, type FormProps, Input, Upload, type UploadFile } from 'antd';
import { Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import { mentFileQueryKeys, useCreateMentFile, useDownloadMentFile, useUpdateMentFile, useUpdateMentFileWithFile } from '../hooks/useMentFileQueries';
import type { MentFile } from '../types';

const { TextArea } = Input;

// AS-IS Globals.BAD_EXTENSION 동일 — BE 와 동일 정책 사전 차단.
const BAD_EXTENSIONS = ['jsp', 'php', 'asp', 'html', 'perl', 'exe', 'cer', 'sql', 'js', 'svg'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function validateClientSide(file: File): string | null {
  if (!file.name?.trim()) return '파일명이 비어있습니다.';
  if (file.name.length > 200) return `파일명이 너무 깁니다 (${file.name.length}자 > 200자 한도)`;
  if (file.size <= 0) return '빈 파일입니다.';
  if (file.size > MAX_FILE_SIZE_BYTES) return `파일 크기가 한도(50MB)를 초과했습니다.`;
  const dot = file.name.lastIndexOf('.');
  const ext = dot < 0 ? '' : file.name.substring(dot + 1).toLowerCase();
  if (BAD_EXTENSIONS.includes(ext)) {
    return `업로드 불가 확장자입니다: ${BAD_EXTENSIONS.join(', ')}`;
  }
  return null;
}

interface FormValues {
  mentName: string;
  mentDesc: string;
  irFilePath: string;
  emsFilePath: string;
}

const DEFAULT_VALUES: FormValues = {
  mentName: '',
  mentDesc: '',
  irFilePath: 'IPRON/ment/',
  emsFilePath: 'ment/',
};

export interface MentFileSheetRef {
  openCreate: () => void;
  openEdit: (mentFile: MentFile) => void;
  close: () => void;
}

const MentFileSheet = forwardRef<MentFileSheetRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<MentFile | null>(null);
  const [file, setFile] = useState<UploadFile | null>(null);

  const isEditMode = editing !== null;

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      form.resetFields();
      form.setFieldsValue(DEFAULT_VALUES);
      setEditing(null);
      setFile(null);
      setVisible(true);
    },
    openEdit: (mentFile) => {
      form.resetFields();
      form.setFieldsValue({
        mentName: mentFile.mentName,
        mentDesc: mentFile.mentDesc ?? '',
        irFilePath: mentFile.irFilePath,
        emsFilePath: mentFile.emsFilePath,
      });
      setEditing(mentFile);
      setFile(null);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { mutateAsync: createAsync, isPending: isCreating } = useCreateMentFile();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateMentFile();
  const { mutateAsync: updateWithFileAsync, isPending: isUpdatingWithFile } = useUpdateMentFileWithFile();
  const { mutate: downloadMutate } = useDownloadMentFile();

  const isPending = isCreating || isUpdating || isUpdatingWithFile;

  // 파일 선택 시 멘트명 자동 채움 (AS-IS setDefaultMentFile)
  const handleFileChange = (info: { file: UploadFile; fileList: UploadFile[] }) => {
    const f = info.fileList[info.fileList.length - 1];
    if (f && f.uid !== '-existing') {
      setFile(f);
      const name = f.name ?? '';
      const dot = name.lastIndexOf('.');
      const baseName = dot > 0 ? name.substring(0, dot) : name;
      if (!form.getFieldValue('mentName')) {
        form.setFieldValue('mentName', baseName);
      }
    }
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const handleSubmit = async (values: FormValues) => {
    const action = isEditMode ? '수정' : '등록';
    const fileObj = file?.originFileObj as File | undefined;

    try {
      if (!isEditMode) {
        // 등록: 파일 필수
        if (!fileObj) {
          toast.error('파일을 선택해 주세요.');
          return;
        }
        const err = validateClientSide(fileObj);
        if (err) {
          toast.error(err);
          return;
        }
        await createAsync({ data: values, file: fileObj });
      } else {
        // 수정: 파일 옵션
        if (fileObj) {
          const err = validateClientSide(fileObj);
          if (err) {
            toast.error(err);
            return;
          }
          await updateWithFileAsync({
            params: { mentfileId: editing!.mentfileId },
            data: values,
            file: fileObj,
          });
        } else {
          await updateAsync({
            params: { mentfileId: editing!.mentfileId },
            data: values,
          });
        }
      }
      toast.success(`멘트파일이 ${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: mentFileQueryKeys.list.queryKey });
      setVisible(false);
    } catch (err) {
      toast.error(`${action} 실패: ${(err as Error).message ?? '알 수 없는 오류'}`);
    }
  };

  return (
    <Drawer
      title={isEditMode ? '멘트파일 수정' : '멘트파일 추가'}
      closable={{ placement: 'end' }}
      placement="right"
      styles={{ wrapper: { width: 480 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEditMode ? '저장' : '등록'}
          </Button>
        </div>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} onFinishFailed={onFinishFailed} requiredMark initialValues={DEFAULT_VALUES}>
        <Form.Item label="멘트 파일" required={!isEditMode}>
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            onChange={handleFileChange}
            fileList={file ? [file] : isEditMode && editing?.mentFile ? [{ uid: '-existing', name: editing.mentFile, status: 'done' as const }] : []}
            onRemove={(f) => {
              if (f.uid === '-existing') return false;
              setFile(null);
              return true;
            }}
            onDownload={(f) => {
              if (f.uid === '-existing' && editing) {
                downloadMutate({ mentfileId: editing.mentfileId }, { onError: (err) => toast.error(`다운로드 실패: ${(err as Error).message ?? '알 수 없는 오류'}`) });
              }
            }}
            showUploadList={{
              showDownloadIcon: (f) => f.uid === '-existing',
              showRemoveIcon: (f) => f.uid !== '-existing',
            }}
            className="w-full [&_.ant-upload-select]:block [&_.ant-upload-select]:w-full"
          >
            <Button block icon={<UploadIcon className="size-3.5" />}>
              파일 선택
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="mentName"
          label="멘트명"
          required
          hasFeedback
          rules={[
            { required: true, message: '멘트명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="예: welcome" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="emsFilePath"
          label="EMS 파일 위치"
          required
          hasFeedback
          rules={[
            { required: true, message: 'EMS 파일 위치는 필수입니다' },
            { max: 256, message: '256자 이내' },
          ]}
        >
          <Input placeholder="ment/" maxLength={256} />
        </Form.Item>

        <Form.Item
          name="irFilePath"
          label="IR 파일 위치"
          required
          hasFeedback
          rules={[
            { required: true, message: 'IR 파일 위치는 필수입니다' },
            { max: 256, message: '256자 이내' },
          ]}
        >
          <Input placeholder="IPRON/ment/" maxLength={256} />
        </Form.Item>

        <Form.Item
          name="mentDesc"
          label="멘트 설명"
          required
          hasFeedback
          rules={[
            { required: true, message: '설명은 필수입니다' },
            { max: 1000, message: '1000자 이내' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (value.replace(/\s+/g, '').length < 3) {
                  return Promise.reject(new Error('설명은 공백 제외 3자 이상 입력하세요'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <TextArea rows={4} maxLength={1000} showCount placeholder="멘트 설명을 입력하세요." />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

MentFileSheet.displayName = 'MentFileSheet';
export default MentFileSheet;
