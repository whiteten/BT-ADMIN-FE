---
name: add-drawer
description: forwardRef + useImperativeHandle로 부모에서 명령형 제어 가능한 Drawer/Modal 컴포넌트 패턴. Ref 인터페이스 정의, 내부 state(open/편집 데이터) 관리, open/close 구현, 부모에서의 호출법, 드래그앤드롭 파일 업로드(Upload.Dragger) 표준 마크업 포함. 새 Drawer·Modal 컴포넌트 작성, 생성/편집 모드 겸용 Drawer 작성, Drawer 안 파일 업로드 UI 작성 시 사용.
---

# add-drawer

이 저장소의 Drawer/Modal 컴포넌트 작성 절차. "드로어 만들어줘", "모달 만들어줘", "편집 드로어", "생성 모달" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. Drawer/Modal은 `open` prop을 부모에서 직접 제어하지 않고 **`forwardRef` + `useImperativeHandle`** 로 명령형 제어.
2. Ref 인터페이스(`<Name>Ref`)는 `open`/`close` 메서드를 노출.
3. 내부 state로 `open` 여부와 편집 모드용 초기 데이터를 함께 관리.
4. `displayName`을 반드시 지정하고 **default export**.
5. 생성/편집 모드는 `open({ ... })` 파라미터 유무로 판정 (`isEditMode = !!state.entityData`).
6. **X(close) 버튼은 우측** — 모든 Drawer에 `closable={{ placement: 'end' }}` 지정. antd 6 기본값은 좌측(start)이라 미지정 시 좌측에 생긴다.
7. **액션 버튼(저장·취소 등)은 footer에 배치** — `extra`나 title JSX에 버튼을 두지 않는다. 헤더는 title + 우측 X만 갖는 표준 구조.

## 1. Ref 인터페이스 정의

Ref 타입은 컴포넌트 파일 상단에 **export**:

```typescript
export interface EntityDrawerRef {
  open: (params: { modelId: string; entityData?: EntityListItem }) => void;
  close: () => void;
}
```

## 2. 컴포넌트 구현

```typescript
import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer } from 'antd';

interface DrawerState {
  open: boolean;
  modelId: string;
  entityData?: EntityListItem; // 편집 모드 시 데이터
}

const EntityDrawer = forwardRef<EntityDrawerRef>((_, ref) => {
  const [state, setState] = useState<DrawerState>({ open: false, modelId: '' });
  const isEditMode = !!state.entityData;

  const handleClose = () => setState((prev) => ({ ...prev, open: false }));

  useImperativeHandle(ref, () => ({
    open: (params) => setState({ open: true, ...params }),
    close: handleClose,
  }));

  return (
    <Drawer
      title={isEditMode ? '엔티티 수정' : '엔티티 등록'}
      closable={{ placement: 'end' }} // X 버튼 우측 — 프로젝트 컨벤션
      open={state.open}
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSave} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      {/* ... */}
    </Drawer>
  );
});
EntityDrawer.displayName = 'EntityDrawer';
export default EntityDrawer;
```

포인트:

- `setState({ open: true, ...params })`로 열 때 params를 함께 세팅.
- 닫을 때는 `prev` 머지로 `open: false`만 변경 (다음 open까지 데이터 유지 원할 때). 매번 리셋하고 싶으면 초기값으로 덮어쓴다.
- `isEditMode`로 "생성" vs "편집" 분기 처리.

## 3. 부모 컴포넌트에서 사용

```typescript
const drawerRef = useRef<EntityDrawerRef>(null);

// 생성 모드로 열기
drawerRef.current?.open({ modelId: '123' });

// 편집 모드로 열기
drawerRef.current?.open({ modelId: '123', entityData: selectedEntity });

// JSX
<EntityDrawer ref={drawerRef} />
```

## 4. 헤더 / Footer 규칙

전 앱 Drawer 헤더 표준화 작업(X 버튼 우측 통일)으로 확정된 규칙:

- **`closable={{ placement: 'end' }}` 필수**: antd 6의 기본 X 위치는 좌측(start). 미지정·`closable`·`closable={true}` 모두 좌측에 생기므로 반드시 객체 형태로 우측을 명시한다.
- **진행 중 닫기 차단**: `closable={!isPending}` ❌ — boolean으로 바꾸면 X가 다시 좌측 기본값으로 돌아간다. → `closable={{ placement: 'end', disabled: isPending }}` ✅
- **액션 버튼은 footer**: `extra`나 title JSX에 저장·취소·추가 등 버튼을 넣지 않는다. 표준 footer 래퍼는 `<div className="flex items-center justify-end gap-2">`, 버튼 순서는 취소 → 주 액션. 레퍼런스: [IntentDrawer.tsx](../../../apps/fca/src/app/features/bot-config/components/IntentDrawer.tsx)
- **헤더 전역 스타일 주의**: host 전역 SCSS([styles.scss](../../../apps/host/src/styles.scss))가 모든 Drawer 헤더를 네이비 배경 + 타이틀·X 흰색으로 강제한다. 커스텀 title JSX에 `text-gray-*` 등 자체 색을 지정하면 네이비 배경에 묻히므로 색 지정 없이 상속을 따르는 것을 권장.

## 5. 폼이 들어가는 경우

Drawer 내부에 폼이 있으면 `/add-form` 스킬의 "Drawer에서의 폼 초기화/리셋" 패턴을 함께 적용한다 — 열릴 때 `form.setFieldsValue`, 닫힐 때 `form.resetFields()`.

## 6. 파일 업로드(드래그앤드롭)가 들어가는 경우

Drawer 안에서 파일을 업로드받을 때는 버튼 트리거(`Upload` + `Button`)가 아니라 **`Upload.Dragger`(드래그앤드롭 영역)를 기본값**으로 쓴다. 레퍼런스: [SleeUserconfigImportModal.tsx](../../../apps/ivr/src/app/features/slee-config/components/SleeUserconfigImportModal.tsx).

```tsx
<div>
  <div className="text-slate-700 mb-2">파일 선택</div>
  <Upload.Dragger
    accept={ACCEPT}
    multiple
    // beforeUpload 에서 false 반환 — 자동 업로드 차단, 제출 버튼에서 실제 전송.
    // 클라이언트 사전 검증 실패 시 Upload.LIST_IGNORE — fileList 에 아예 안 들어가고 토스트로 즉시 안내.
    beforeUpload={(file) => {
      const err = validateClientSide(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        return Upload.LIST_IGNORE;
      }
      return false;
    }}
    fileList={files}
    onChange={(info) => setFiles(info.fileList)}
  >
    <div className="py-3 flex flex-col items-center gap-1">
      <p className="ant-upload-drag-icon">
        <UploadIcon className="inline size-6 text-[#405189]" />
      </p>
      <p className="text-[12px] text-slate-600">파일을 드래그하거나 클릭하여 선택하세요</p>
      <p className="text-[11px] text-slate-400">여러 파일 동시 선택 가능 · 허용 확장자: {ALLOWED_EXTENSIONS.join(', ')}</p>
    </div>
  </Upload.Dragger>
</div>
```

핵심 규칙:

- **트리거는 `Upload.Dragger`**: 버튼(`<Upload><Button>파일 선택</Button></Upload>`) 방식은 쓰지 않는다. 다중 파일이든 단일 파일이든 동일.
- **섹션 라벨은 스타일 없는 plain text**: 드래그존 위 라벨(`파일 선택` 등)에 `text-[Npx]`·`font-semibold` 같은 크기/굵기 지정을 넣지 않는다. `text-slate-700 mb-2` 정도만 — Dragger 자체가 이미 시각적으로 충분히 눈에 띄어서 라벨을 굵게 강조할 필요가 없다.
- **Dragger 내부 3단 구성**: 아이콘(`<p className="ant-upload-drag-icon">` 안에 lucide 아이콘, `size-6 text-[#405189]`) → 주 안내문(`text-[12px] text-slate-600`, "파일을 드래그하거나 클릭하여 선택하세요") → 보조 안내문(`text-[11px] text-slate-400`, 허용 확장자·다중선택 가능 여부 등 제약 안내). 컨테이너는 `py-3 flex flex-col items-center gap-1`.
- **자동 업로드 차단**: `beforeUpload`는 항상 `false`(또는 검증 실패 시 `Upload.LIST_IGNORE`)를 반환 — 실제 전송은 폼 제출(footer 주 액션 버튼)에서 수행한다.
- **클라이언트 사전 검증**: 확장자·파일명 길이·크기 등은 별도 `validateClientSide(file): string | null` 헬퍼로 분리하고, `beforeUpload` 안에서 실패 시 `toast.error` + `Upload.LIST_IGNORE`로 즉시 차단한다(서버 왕복 없이 UX 즉시 피드백). BE에도 동일 정책이 있어야 하며 FE 검증은 우회 방지용이 아니라 UX 보조용.
- **`fileList`는 controlled state**: `useState<UploadFile[]>([])` + `onChange={(info) => setFiles(info.fileList)}`로 직접 관리하고, antd의 uncontrolled 내부 상태에 의존하지 않는다.

### 예외 — 버튼을 쓰는 경우

파일이 그 Drawer의 유일한/주된 콘텐츠가 아니라, **다른 입력 필드 여러 개와 나란히 있는 폼 필드 중 하나**일 때는 `Upload.Dragger` 대신 버튼 트리거를 쓴다. 레퍼런스: [MentFileSheet.tsx](../../../apps/ivr/src/app/features/mentfile/components/MentFileSheet.tsx) — 멘트명·EMS 경로·IR 경로·설명 등 텍스트 필드 4개와 함께 있는 등록/수정 폼의 파일 필드.

```tsx
<Form.Item label="멘트 파일" required={!isEditMode}>
  <Upload
    maxCount={1}
    beforeUpload={() => false}
    onChange={handleFileChange}
    fileList={file ? [file] : isEditMode && editing?.mentFile ? [{ uid: '-existing', name: editing.mentFile, status: 'done' as const }] : []}
    onRemove={(f) => {
      if (f.uid === '-existing') return false; // 기존 파일은 제거 불가 — 재선택으로만 교체
      setFile(null);
      return true;
    }}
    onDownload={(f) => {
      if (f.uid === '-existing' && editing) downloadMutate({ mentfileId: editing.mentfileId });
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
```

핵심 규칙:

- **판정 기준**: Drawer/Form.Item 대부분이 일반 입력 필드(`Input`/`TextArea`/`Select` 등)이고 파일은 그중 하나일 뿐이면 버튼. 파일 업로드 자체가 Drawer의 핵심 목적(다건 등록·Import 등)이면 위 6번 원칙대로 Dragger.
- **`Form.Item`의 기본 label을 그대로 쓴다**: 위 Dragger 케이스처럼 label을 plain text div로 감싸지 않고, `<Form.Item label="...">`의 antd 기본 라벨 스타일을 그대로 사용 — 다른 텍스트 필드들과 라벨 스타일이 통일되어야 폼 전체가 일관돼 보인다.
- **버튼도 `block` + `w-full`**: 버튼 트리거를 쓰더라도 다른 `Input` 필드들과 너비를 맞추기 위해 `Button block` + `Upload className="w-full [&_.ant-upload-select]:block [&_.ant-upload-select]:w-full"`(antd `.ant-upload-select`가 기본 `display: inline-block`이라 이 오버라이드 없이는 `block`이 먹지 않는다)를 반드시 함께 준다.
- **버튼 문구는 항상 "파일 선택" 고정 — 업로드 대상에 따라 다른 단어로 바꾸지 않는다**: "설명파일", "템플릿" 등 그 필드가 뭘 업로드하는지를 버튼 본문에 담지 않는다. 라벨(`Form.Item label` 등)이 이미 무엇을 위한 필드인지 알려주므로 버튼 자체는 항상 "파일 선택"이다.
- **허용 확장자가 제한된 경우만 우측에 괄호로 추가**: `accept`로 특정 확장자만 허용하는 경우에만 "파일 선택" 오른쪽에 `(확장자1/확장자2)` 형태(점 없이 슬래시 구분, 앞에 공백 없음)를 붙인다 — 예: `파일 선택(xlsx/csv)`. 확장자 제한이 없으면(블랙리스트 검증만 있는 `MentFileSheet.tsx`처럼) 괄호 없이 "파일 선택"만 쓴다. 레퍼런스: [MentFileBatchSheet.tsx](../../../apps/ivr/src/app/features/mentfile/components/MentFileBatchSheet.tsx)의 "멘트 설명" 필드 버튼 — `accept=".xlsx,.csv"`에 맞춰 `파일 선택(xlsx/csv)`로 노출.
  - 괄호 부분은 본문 텍스트보다 **작은 글자**로: `<Button block icon={...}>파일 선택<span className="text-[11px]">(xlsx/csv)</span></Button>` — 문자열 그대로 이어붙이지 않고 `<span className="text-[11px]">`로 감싼다.
- **수정 모드 — 기존 파일은 antd 기본 업로드 리스트로 표시**: 커스텀 카드 대신 `fileList`에 `{ uid: '-existing', name, status: 'done' }`를 채워 antd 기본 리스트 UI를 그대로 쓰고, `showUploadList`로 다운로드 아이콘은 기존 파일에만, 제거 아이콘은 새로 고른 파일에만 노출한다. `onRemove`에서 `-existing`은 `false`를 반환해 제거를 막는다(교체는 재선택으로만 가능).
- **`maxCount={1}`**: 단일 파일 필드이므로 명시.

## 체크리스트

- [ ] `<Name>Ref` 인터페이스를 export 했는가?
- [ ] `forwardRef` + `useImperativeHandle`로 `open`/`close`를 노출했는가?
- [ ] 내부 state로 `open`과 편집 데이터를 함께 관리하는가?
- [ ] `closable={{ placement: 'end' }}`를 지정했는가? (닫기 차단이 필요하면 `disabled` 옵션 사용)
- [ ] 액션 버튼을 헤더(`extra`/title JSX)가 아닌 footer 표준 래퍼에 배치했는가?
- [ ] `displayName`을 지정하고 default export 했는가?
- [ ] 부모에서 `useRef<...Ref>(null)` + `ref.current?.open(...)` 으로 제어하는가?
- [ ] 폼이 들어간다면 `/add-form`의 Drawer 패턴(열림 시 세팅, 닫힘 시 리셋)을 적용했는가?
- [ ] 파일 업로드가 Drawer의 핵심 콘텐츠면 `Upload.Dragger`(라벨은 스타일 없는 plain text), 다른 입력 필드들 사이의 폼 필드 중 하나면 버튼(`Form.Item` 기본 label + `Button block` + `.ant-upload-select` 오버라이드)을 썼는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
