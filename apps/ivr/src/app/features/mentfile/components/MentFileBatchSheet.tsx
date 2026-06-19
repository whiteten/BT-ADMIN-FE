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
import { Button, Drawer, Form, Input, Table, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Download, FileUp, Trash2, Upload as UploadIcon } from 'lucide-react';
import { toast } from '@/shared-util';
import { mentFileQueryKeys, useCreateMentFilesBatch, useDownloadDescTemplate, useParseMentDesc } from '../hooks/useMentFileQueries';

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

  const columns: ColumnsType<FileRow> = useMemo(
    () => [
      { title: '파일명', dataIndex: 'fileName', ellipsis: true },
      { title: '크기', dataIndex: 'size', width: 90, align: 'right', render: (s: number) => `${(s / 1024).toFixed(1)} KB` },
      {
        title: '멘트설명',
        dataIndex: 'mentDesc',
        width: 260,
        render: (_: string, row: FileRow) => (
          <Input size="small" value={row.mentDesc} maxLength={1000} placeholder="설명(선택)" onChange={(e) => setDesc(row.uid, e.target.value)} />
        ),
      },
      {
        title: '',
        width: 44,
        align: 'center',
        render: (_: unknown, row: FileRow) => (
          <button type="button" onClick={() => removeRow(row.uid)} className="text-gray-400 hover:text-red-500" aria-label="제거">
            <Trash2 className="size-4" />
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <Drawer
      title="멘트파일 다량추가"
      closable={{ placement: 'end' }}
      placement="right"
      styles={{ wrapper: { width: 720 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isCreating} onClick={() => form.submit()}>
            등록 ({fileRows.length})
          </Button>
        </div>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} initialValues={DEFAULTS}>
        <div className="flex gap-3">
          <Form.Item
            name="emsFilePath"
            label="EMS 파일 위치"
            required
            className="flex-1"
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
            className="flex-1"
            rules={[
              { required: true, message: 'IR 파일 위치는 필수입니다' },
              { max: 256, message: '256자 이내' },
            ]}
          >
            <Input placeholder="IPRON/ment/" maxLength={256} />
          </Form.Item>
        </div>
      </Form>

      <div className="flex items-center gap-2 mb-2">
        <Upload
          multiple
          beforeUpload={(f) => {
            // 각 파일마다 호출 — addFiles 가 선택 즉시 바이트를 메모리로 스냅샷(arrayBuffer)해 저장한다.
            void addFiles([f as File]);
            return false;
          }}
          showUploadList={false}
          fileList={[]}
        >
          <Button icon={<UploadIcon className="size-3.5" />}>멘트 파일 선택 (여러 개)</Button>
        </Upload>
        <Upload
          accept=".xlsx,.csv"
          beforeUpload={(f) => {
            handleDescFile(f as File);
            return false;
          }}
          showUploadList={false}
          fileList={[]}
        >
          <Button icon={<FileUp className="size-3.5" />} loading={isParsing} disabled={fileRows.length === 0}>
            설명파일(xlsx/csv)
          </Button>
        </Upload>
        <Button type="link" icon={<Download className="size-3.5" />} onClick={() => downloadTemplate(undefined)}>
          양식
        </Button>
        <span className="ml-auto text-xs text-gray-400">{fileRows.length}개 선택</span>
      </div>

      <Table<FileRow>
        rowKey="uid"
        size="small"
        columns={columns}
        dataSource={fileRows}
        pagination={false}
        scroll={{ y: 360 }}
        locale={{ emptyText: '선택된 멘트 파일이 없습니다.' }}
      />
    </Drawer>
  );
});

MentFileBatchSheet.displayName = 'MentFileBatchSheet';
export default MentFileBatchSheet;
