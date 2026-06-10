---
name: add-drawer
description: forwardRef + useImperativeHandle로 부모에서 명령형 제어 가능한 Drawer/Modal 컴포넌트 패턴. Ref 인터페이스 정의, 내부 state(open/편집 데이터) 관리, open/close 구현, 부모에서의 호출법 포함. 새 Drawer·Modal 컴포넌트 작성, 생성/편집 모드 겸용 Drawer 작성 시 사용.
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

## 체크리스트

- [ ] `<Name>Ref` 인터페이스를 export 했는가?
- [ ] `forwardRef` + `useImperativeHandle`로 `open`/`close`를 노출했는가?
- [ ] 내부 state로 `open`과 편집 데이터를 함께 관리하는가?
- [ ] `closable={{ placement: 'end' }}`를 지정했는가? (닫기 차단이 필요하면 `disabled` 옵션 사용)
- [ ] 액션 버튼을 헤더(`extra`/title JSX)가 아닌 footer 표준 래퍼에 배치했는가?
- [ ] `displayName`을 지정하고 default export 했는가?
- [ ] 부모에서 `useRef<...Ref>(null)` + `ref.current?.open(...)` 으로 제어하는가?
- [ ] 폼이 들어간다면 `/add-form`의 Drawer 패턴(열림 시 세팅, 닫힘 시 리셋)을 적용했는가?
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
