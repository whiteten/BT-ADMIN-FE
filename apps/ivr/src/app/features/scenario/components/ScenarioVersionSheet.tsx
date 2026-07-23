/**
 * 시나리오 버전 추가/수정 Sheet.
 *
 * <p>AS-IS SWAT IPR20S6020_ScenarioVersion.jsp 패턴 회귀:</p>
 * <ul>
 *   <li>등록 모드: 메타 + 시나리오 파일/문서 옵션 업로드 → 한 번의 multipart 호출</li>
 *   <li>수정 모드: 메타만 변경 시 JSON PUT, 파일/문서 변경 있으면 multipart PUT with-file</li>
 * </ul>
 *
 * <p>[DEACTIVATED] IFE 비동기 복사(sourcever) 흐름 — IFE 재연동 시 복구.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Radio, Select, Upload, type UploadFile } from 'antd';
import { Download, FileCode, FileText, type LucideIcon, X } from 'lucide-react';
import { toast } from '@/shared-util';
import {
  scenarioQueryKeys,
  useCreateVersionWithFile,
  useDownloadScenario,
  useDownloadScenarioDocument,
  useUpdateVersion,
  useUpdateVersionWithFile,
  useUploadDocument,
} from '../hooks/useScenarioQueries';
import type { ScenarioCharsetType, ScenarioVersion } from '../types';

interface ScenarioVersionSheetProps {
  serviceId: number;
  serviceName: string;
}

export interface ScenarioVersionSheetRef {
  /** 신규 등록 모드로 열기 */
  open: () => void;
  /** 기존 버전 수정 모드로 열기 */
  openEdit: (version: ScenarioVersion) => void;
  close: () => void;
}

interface FormValues {
  serviceVer: string;
  versionName?: string;
  versionDesc?: string;
  statVisible: number;
  charsetType: ScenarioCharsetType;
}

const DEFAULT_VALUES: FormValues = {
  serviceVer: '',
  versionName: undefined,
  versionDesc: undefined,
  statVisible: 1,
  charsetType: 'euc-kr',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadFieldProps {
  accept: string;
  hint: string;
  icon: LucideIcon;
  file: UploadFile | null;
  existingFileName?: string;
  onSelect: (file: UploadFile) => void;
  onClear: () => void;
  onDownloadExisting?: () => void;
}

/** 드래그앤드롭 업로드 영역 + 선택/기존 파일 표시 카드. maxCount=1 — 새 파일 선택 시 항상 교체. */
function FileUploadField({ accept, hint, icon: Icon, file, existingFileName, onSelect, onClear, onDownloadExisting }: FileUploadFieldProps) {
  const displayName = file?.name ?? existingFileName;
  return (
    <div className="flex flex-col gap-2">
      <Upload.Dragger
        accept={accept}
        maxCount={1}
        showUploadList={false}
        beforeUpload={() => false /* 즉시 업로드 안 함 — 저장 버튼에서 함께 전송 */}
        onChange={(info) => {
          const last = info.fileList[info.fileList.length - 1];
          if (last) onSelect(last);
        }}
      >
        <div className="py-3 flex flex-col items-center gap-1">
          <p className="text-[12px] text-slate-600">{displayName ? '파일을 드래그하거나 클릭하여 파일 교체' : '파일을 드래그하거나 클릭하여 선택하세요'}</p>
          <p className="text-[11px] text-slate-400">{hint}</p>
        </div>
      </Upload.Dragger>
      {displayName && (
        <div className="flex items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Icon className="size-4 text-[#405189] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-slate-800 truncate">{displayName}</div>
            {file?.size != null && <div className="text-[11px] text-slate-400">{formatFileSize(file.size)}</div>}
          </div>
          {!file && onDownloadExisting && <Button type="text" size="small" icon={<Download className="size-3.5" />} onClick={onDownloadExisting} />}
          {file && <Button type="text" size="small" icon={<X className="size-3.5" />} onClick={onClear} />}
        </div>
      )}
    </div>
  );
}

const ScenarioVersionSheet = forwardRef<ScenarioVersionSheetRef, ScenarioVersionSheetProps>(({ serviceId, serviceName }, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [sxmlFile, setSxmlFile] = useState<UploadFile | null>(null);
  const [documentFile, setDocumentFile] = useState<UploadFile | null>(null);
  const [editingVer, setEditingVer] = useState<string | null>(null); // null=등록, string=수정
  const [editingVersion, setEditingVersion] = useState<ScenarioVersion | null>(null); // 수정 모드에서 기존 파일명 표시용

  useImperativeHandle(ref, () => ({
    open: () => {
      form.resetFields();
      form.setFieldsValue(DEFAULT_VALUES);
      setSxmlFile(null);
      setDocumentFile(null);
      setEditingVer(null);
      setEditingVersion(null);
      setVisible(true);
    },
    openEdit: (version: ScenarioVersion) => {
      form.resetFields();
      form.setFieldsValue({
        serviceVer: version.serviceVer,
        versionName: version.versionName ?? undefined,
        versionDesc: version.versionDesc ?? undefined,
        statVisible: version.statVisible ?? 1,
        charsetType: (version.charsetType?.toLowerCase() === 'utf-8' ? 'utf-8' : 'euc-kr') as ScenarioCharsetType,
      });
      setSxmlFile(null);
      setDocumentFile(null);
      setEditingVer(version.serviceVer);
      setEditingVersion(version);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const isEditMode = editingVer !== null;

  // 토스트/invalidate/close 는 handleSubmit 에서 일괄 처리 — 순차 호출에서 부분 성공 케이스를 명확히 안내.
  const { mutateAsync: createWithFileMutateAsync, isPending: isCreating } = useCreateVersionWithFile();
  const { mutateAsync: updateMutateAsync, isPending: isUpdating } = useUpdateVersion();
  const { mutateAsync: updateWithFileMutateAsync, isPending: isUpdatingWithFile } = useUpdateVersionWithFile();
  const { mutateAsync: uploadDocumentMutateAsync, isPending: isUploadingDoc } = useUploadDocument();

  // 다운로드 처리(Blob 추출 + Content-Disposition 파싱 + download trigger)는 hook 의 mutationFn 내부에서 일괄 처리.
  // 이 컴포넌트는 에러 토스트만 담당. (FCA useDownloadScenario 패턴과 동일)
  const { mutate: downloadScenarioMutate } = useDownloadScenario({
    mutationOptions: {
      onError: () => toast.error('시나리오 파일 다운로드에 실패했습니다.'),
    },
  });

  const { mutate: downloadDocMutate } = useDownloadScenarioDocument({
    mutationOptions: {
      onError: () => toast.error('시나리오 문서 다운로드에 실패했습니다.'),
    },
  });

  const isPending = isCreating || isUpdating || isUpdatingWithFile || isUploadingDoc;

  /**
   * 순차 호출 패턴 — 버전(메타+SXML) 저장 후, 문서가 있으면 별도 호출로 이어서 업로드.
   *
   * <p>BFF가 한 multipart 요청에서 part name(uploadFile/documentFile)을 보존하지 않고
   * 모두 "uploadFile"로 강제 변환하므로 두 파일을 한 번에 보낼 수 없음. 그래서 문서는
   * 별도 엔드포인트(uploadDocument)로 분리.</p>
   *
   * <p>부분 실패 (버전 OK + 문서 FAIL) 시 사용자에게 명확히 안내. 멱등성 보장되어 있어
   * 사용자가 문서만 다시 업로드 가능.</p>
   */
  const handleSubmit = async (values: FormValues) => {
    if (!isEditMode && !sxmlFile) {
      toast.error('시나리오 파일은 필수입니다');
      return;
    }

    const fileObj = sxmlFile?.originFileObj as File | undefined;
    const docFileObj = documentFile?.originFileObj as File | undefined;
    const action = isEditMode ? '수정' : '등록';

    // ===== 1단계: 메타 + (옵션) SXML =====
    try {
      if (isEditMode) {
        if (fileObj) {
          await updateWithFileMutateAsync({
            params: { serviceId, serviceVer: editingVer },
            data: {
              versionName: values.versionName,
              versionDesc: values.versionDesc,
              statVisible: values.statVisible,
              charsetType: values.charsetType,
            },
            file: fileObj,
          });
        } else {
          await updateMutateAsync({
            params: { serviceId, serviceVer: editingVer },
            data: {
              versionName: values.versionName,
              versionDesc: values.versionDesc,
              statVisible: values.statVisible,
              charsetType: values.charsetType,
            },
          });
        }
      } else {
        await createWithFileMutateAsync({
          params: { serviceId },
          data: {
            serviceVer: values.serviceVer,
            versionName: values.versionName,
            versionDesc: values.versionDesc,
            statVisible: values.statVisible,
            charsetType: values.charsetType,
          },
          file: fileObj,
        });
      }
    } catch (err) {
      toast.error(`${action} 실패: ${(err as Error).message ?? '알 수 없는 오류'}`);
      return;
    }

    // ===== 2단계: (옵션) 문서 업로드 =====
    if (docFileObj) {
      const verToUse = isEditMode ? editingVer : values.serviceVer;
      try {
        await uploadDocumentMutateAsync({
          params: { serviceId, serviceVer: verToUse },
          file: docFileObj,
        });
      } catch (err) {
        // 메타/SXML 은 성공, 문서만 실패한 부분 성공 케이스 — 사용자가 문서만 재업로드하면 됨.
        toast.error(`버전은 ${action}됐지만 시나리오 문서 업로드만 실패했습니다 — 문서만 다시 업로드해주세요. (${(err as Error).message ?? '알 수 없는 오류'})`);
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getVersions._def });
        setVisible(false);
        return;
      }
    }

    // ===== 성공 토스트 (메타/SXML/문서 어느 조합이든 합쳐서) =====
    const parts: string[] = [];
    if (fileObj) parts.push('시나리오 파일');
    if (docFileObj) parts.push('문서');
    const msg = parts.length > 0 ? `버전 + ${parts.join(' + ')}이(가) ${action}되었습니다.` : `버전이 ${action}되었습니다.`;
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getVersions._def });
    setVisible(false);
  };

  return (
    <Drawer
      title={isEditMode ? '버전 수정' : '버전 추가'}
      closable={{ placement: 'end' }}
      placement="right"
      size={480}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            {isEditMode ? '저장' : '생성'}
          </Button>
        </div>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark initialValues={DEFAULT_VALUES}>
        <Form.Item
          name="serviceVer"
          label="버전"
          rules={[
            { required: true, message: '버전은 필수입니다' },
            { max: 30, message: '버전은 30자 이내여야 합니다' },
            { pattern: /^[a-zA-Z0-9._-]+$/, message: '영문, 숫자, 마침표, 밑줄, 하이픈만 가능합니다' },
          ]}
        >
          <Input placeholder="예: 1.3" maxLength={30} disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          name="versionName"
          label="버전명"
          required
          rules={[
            { required: true, message: '버전명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="예: 본인확인_v3" maxLength={100} />
        </Form.Item>

        <Form.Item label="시나리오 파일" required={!isEditMode}>
          <FileUploadField
            accept=".sxml,.SXML"
            hint=".sxml"
            icon={FileCode}
            file={sxmlFile}
            existingFileName={isEditMode ? (editingVersion?.scenarioFile ?? undefined) : undefined}
            onSelect={setSxmlFile}
            onClear={() => setSxmlFile(null)}
            onDownloadExisting={isEditMode && editingVersion ? () => downloadScenarioMutate({ serviceId, serviceVer: editingVersion.serviceVer }) : undefined}
          />
        </Form.Item>

        <Form.Item label="시나리오 문서">
          <FileUploadField
            accept=".txt,.doc,.docx,.xls,.xlsx"
            hint=".txt, .doc, .docx, .xls, .xlsx"
            icon={FileText}
            file={documentFile}
            existingFileName={isEditMode ? (editingVersion?.scenarioDocument ?? undefined) : undefined}
            onSelect={setDocumentFile}
            onClear={() => setDocumentFile(null)}
            onDownloadExisting={isEditMode && editingVersion ? () => downloadDocMutate({ serviceId, serviceVer: editingVersion.serviceVer }) : undefined}
          />
        </Form.Item>

        <Form.Item name="charsetType" label="캐릭터셋">
          <Select
            options={[
              { label: 'EUC-KR', value: 'euc-kr' },
              { label: 'UTF-8', value: 'utf-8' },
            ]}
          />
        </Form.Item>

        <Form.Item name="statVisible" label="통계 사용 유무">
          <Radio.Group>
            <Radio value={1}>사용</Radio>
            <Radio value={0}>사용안함</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="versionDesc" label="변경 내용" rules={[{ max: 256, message: '256자 이내' }]}>
          <Input.TextArea rows={3} maxLength={256} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

ScenarioVersionSheet.displayName = 'ScenarioVersionSheet';
export default ScenarioVersionSheet;
