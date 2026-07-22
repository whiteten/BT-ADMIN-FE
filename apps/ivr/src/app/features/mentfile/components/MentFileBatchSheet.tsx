/**
 * 멘트파일 다량추가 Sheet (AS-IS IPR30S3020 다량추가 팝업 IPR30S3020_multi.jsp).
 *
 * <p>여러 멘트 파일을 한 번에 업로드 → TB_IR_MENTFILE 다건 등록.</p>
 * <ul>
 *   <li>멘트 파일 다중 선택 → 그리드에 파일명/크기/설명 표시 (설명 행별 수동 입력 가능)</li>
 *   <li>멘트설명 Excel/CSV 업로드 → 파일명 매칭으로 설명 자동 채움 (AS-IS xlImport 동등, BE 파싱)</li>
 *   <li>양식(xlsx) 다운로드</li>
 * </ul>
 *
 * <h2>레거시 comma 버그</h2>
 * <p>레거시는 설명을 hidden 1필드 comma-join + {@code !com!ma!} escape 했으나 서버 복원이 덮어쓰기 버그로
 * 동작하지 않았다. 리뉴얼은 설명을 파일별 배열({@code mentDescs[]})로 전송해 escape 자체가 불필요 → 구조적 해결.</p>
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Form, type FormProps, Input, Upload } from 'antd';
import { Download, Trash2, Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import { mentFileQueryKeys, useCreateMentFilesBatch, useDownloadDescTemplate, useParseMentDesc } from '../hooks/useMentFileQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// AS-IS Globals.BAD_EXTENSION 동일 — BE 와 동일 정책 사전 차단.
const BAD_EXTENSIONS = ['jsp', 'php', 'asp', 'html', 'perl', 'exe', 'cer', 'sql', 'js', 'svg'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function extOf(name: string): string {
  const d = name.lastIndexOf('.');
  return d < 0 ? '' : name.substring(d + 1).toLowerCase();
}

function validateMentFile(file: File): string | null {
  if (!file.name?.trim()) return '파일명이 비어있습니다.';
  if (file.name.length > 200) return `파일명이 너무 깁니다: ${file.name}`;
  if (file.size <= 0) return `빈 파일입니다: ${file.name}`;
  if (file.size > MAX_FILE_SIZE_BYTES) return `파일 크기 한도(50MB) 초과: ${file.name}`;
  if (BAD_EXTENSIONS.includes(extOf(file.name))) return `업로드 불가 확장자: ${file.name}`;
  return null;
}

interface FileRow {
  uid: string;
  file: File;
  fileName: string;
  size: number;
  mentDesc: string;
}

interface FormValues {
  emsFilePath: string;
  irFilePath: string;
}

const DEFAULTS: FormValues = { emsFilePath: 'ment/', irFilePath: 'IPRON/ment/' };

export interface MentFileBatchSheetRef {
  open: () => void;
  close: () => void;
}

const MentFileBatchSheet = forwardRef<MentFileBatchSheetRef>((_, ref) => {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [fileRows, setFileRows] = useState<FileRow[]>([]);

  const { mutateAsync: createBatchAsync, isPending: isCreating } = useCreateMentFilesBatch();
  const { mutateAsync: parseDescAsync, isPending: isParsing } = useParseMentDesc();
  const { mutate: downloadTemplate } = useDownloadDescTemplate();

  useImperativeHandle(ref, () => ({
    open: () => {
      form.resetFields();
      form.setFieldsValue(DEFAULTS);
      setFileRows([]);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  // 멘트 파일 다중 추가 — 확장자/크기 검증, 같은 파일명은 skip.
  // ⚠ 선택 즉시 arrayBuffer 로 바이트를 메모리에 복사한 새 File 을 저장한다.
  //   antd Upload 가 넘기는 File 은 OS 파일 참조라, 여러 파일을 담아뒀다 나중에 제출하면
  //   그 사이 input 리셋으로 참조가 무효화되어 전송 시 net::ERR_FILE_NOT_FOUND 가 발생한다.
  //   메모리 스냅샷이면 OS 파일과 무관하므로 구조적으로 재발 불가.
  const addFiles = async (files: File[]) => {
    for (const f of files) {
      const err = validateMentFile(f);
      if (err) {
        toast.error(err);
        continue;
      }
      let memFile: File;
      try {
        const buf = await f.arrayBuffer();
        memFile = new File([buf], f.name, { type: f.type, lastModified: f.lastModified });
      } catch {
        toast.error(`파일을 읽지 못했습니다: ${f.name}`);
        continue;
      }
      setFileRows((prev) => {
        if (prev.some((r) => r.fileName === memFile.name)) return prev; // 같은 파일명 skip
        return [...prev, { uid: `${memFile.name}-${memFile.size}-${memFile.lastModified}`, file: memFile, fileName: memFile.name, size: memFile.size, mentDesc: '' }];
      });
    }
  };

  const removeRow = (uid: string) => setFileRows((prev) => prev.filter((r) => r.uid !== uid));
  const setDesc = (uid: string, desc: string) => setFileRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, mentDesc: desc } : r)));

  // 멘트설명 Excel/CSV → 파일명 매칭으로 설명 채움 (AS-IS xlImport)
  const handleDescFile = async (file: File) => {
    if (fileRows.length === 0) {
      toast.warning('먼저 멘트 파일을 선택하세요.');
      return;
    }
    const ext = extOf(file.name);
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      toast.error('xlsx 또는 csv 파일만 가능합니다.');
      return;
    }
    try {
      const rows = await parseDescAsync(file);
      const map = new Map(rows.map((r) => [r.mentFile, r.mentDesc]));
      let matched = 0;
      setFileRows((prev) =>
        prev.map((r) => {
          const d = map.get(r.fileName);
          if (d !== undefined) {
            matched += 1;
            return { ...r, mentDesc: d ?? '' };
          }
          return r;
        }),
      );
      toast.success(`설명 ${matched}건 매칭되었습니다. (파일 ${rows.length}행)`);
    } catch (err) {
      toast.error(`설명 파일 파싱 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const handleSubmit = async (values: FormValues) => {
    if (fileRows.length === 0) {
      toast.error('멘트 파일을 1개 이상 선택하세요.');
      return;
    }
    try {
      const result = await createBatchAsync({
        emsFilePath: values.emsFilePath,
        irFilePath: values.irFilePath,
        files: fileRows.map((r) => r.file),
        mentDescs: fileRows.map((r) => r.mentDesc),
      });
      const skippedMsg = result.skipped > 0 ? ` (중복/빈 파일 ${result.skipped}건 제외)` : '';
      toast.success(`멘트파일 ${result.created}건이 등록되었습니다.${skippedMsg}`);
      queryClient.invalidateQueries({ queryKey: mentFileQueryKeys.list.queryKey });
      setVisible(false);
    } catch (err) {
      toast.error(`다량추가 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  const columnDefs: ColDef<FileRow>[] = useMemo(
    () => [
      { headerName: '파일명', field: 'fileName', flex: 2, minWidth: 160 } as ColDef<FileRow>,
      {
        headerName: '크기',
        field: 'size',
        width: 100,
        sortable: false,
        cellStyle: { textAlign: 'right' },
        valueFormatter: (p) => `${(p.value / 1024).toFixed(1)} KB`,
      } as ColDef<FileRow>,
      {
        headerName: '멘트설명',
        field: 'mentDesc',
        flex: 3,
        minWidth: 220,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<FileRow>) =>
          p.data ? <Input size="small" value={p.data.mentDesc} maxLength={1000} placeholder="설명 (선택)" onChange={(e) => setDesc(p.data!.uid, e.target.value)} /> : null,
      } as ColDef<FileRow>,
      {
        headerName: '',
        colId: 'actions',
        width: 56,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: ICellRendererParams<FileRow>) =>
          p.data ? (
            <button
              type="button"
              title="제거"
              onClick={(e) => {
                e.stopPropagation();
                removeRow(p.data!.uid);
              }}
            >
              <Trash2 className="size-4 text-red-500 hover:cursor-pointer" />
            </button>
          ) : null,
      } as ColDef<FileRow>,
    ],
    [],
  );

  return (
    <Drawer
      title="멘트파일 다량추가"
      closable={{ placement: 'end' }}
      placement="right"
      styles={{ wrapper: { width: 600 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-between">
          <span className="text-slate-700">멘트 파일 {fileRows.length}건</span>
          <div className="flex gap-2">
            <Button onClick={() => setVisible(false)}>취소</Button>
            <Button type="primary" loading={isCreating} onClick={() => form.submit()}>
              등록
            </Button>
          </div>
        </div>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} onFinishFailed={onFinishFailed} initialValues={DEFAULTS}>
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

        <Form.Item label="멘트 파일" required>
          <Upload.Dragger
            multiple
            beforeUpload={(f) => {
              // 각 파일마다 호출 — addFiles 가 선택 즉시 바이트를 메모리로 스냅샷(arrayBuffer)해 저장한다.
              void addFiles([f as File]);
              return false;
            }}
            showUploadList={false}
            fileList={[]}
          >
            <div className="py-3 flex flex-col items-center gap-1">
              <p className="ant-upload-drag-icon">
                <UploadIcon className="inline size-6 text-[#405189]" />
              </p>
              <p className="text-[12px] text-slate-600">파일을 드래그하거나 클릭하여 선택하세요</p>
              <p className="text-[11px] text-slate-400">여러 파일 동시 선택 가능</p>
            </div>
          </Upload.Dragger>
        </Form.Item>

        {/* antd Form.Item label 은 <label> 태그로 감싸져서, 안에 텍스트+버튼을 같이 넣으면
            텍스트 클릭이 버튼 클릭으로 전파되는 문제가 있다 — label prop 밖 일반 div로 분리. */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-800">멘트 설명</span>
          <Button type="link" size="small" icon={<Download className="size-3.5" />} className="!px-0 !h-auto" onClick={() => downloadTemplate(undefined)}>
            템플릿 다운로드
          </Button>
        </div>
        <Form.Item>
          <Upload
            accept=".xlsx,.csv"
            maxCount={1}
            beforeUpload={(f) => {
              handleDescFile(f as File);
              return false;
            }}
            showUploadList={false}
            fileList={[]}
            className="w-full [&_.ant-upload-select]:block [&_.ant-upload-select]:w-full"
          >
            <Button block icon={<UploadIcon className="size-3.5" />} loading={isParsing} disabled={fileRows.length === 0}>
              파일 선택<span className="text-[11px]">(xlsx/csv)</span>
            </Button>
          </Upload>
        </Form.Item>
      </Form>

      <div className="h-[360px] mt-1">
        <AgGridReact<FileRow>
          rowData={fileRows}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
          getRowId={(p) => p.data.uid}
          defaultColDef={{ filter: false, sortable: true, suppressHeaderMenuButton: true }}
          noRowsOverlayComponentParams={{ message: '선택된 멘트 파일이 없습니다.' }}
        />
      </div>
    </Drawer>
  );
});

MentFileBatchSheet.displayName = 'MentFileBatchSheet';
export default MentFileBatchSheet;
