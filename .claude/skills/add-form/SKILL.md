---
name: add-form
description: Ant Design Form으로 데이터 추가/수정 UI를 작성한다. Form.useForm 인스턴스, rules 기반 유효성 검사, onFinishFailed toast, API 데이터로 초기화, Drawer 내 폼 초기화·리셋 패턴 포함. 생성/수정 페이지, Drawer·Modal 내 폼, 상세 페이지 수정 탭 작성 시 사용.
---

# add-form

이 저장소의 Ant Design Form 기반 데이터 추가/수정 UI 작성 절차. "폼 만들어줘", "추가 화면 작성", "수정 탭 작성", "Drawer에 폼 넣어줘" 등의 요청 시 이 절차를 따른다.

## 핵심 규칙

1. `useState`로 필드를 개별 관리하지 말고 **`Form.useForm`** 으로 통합 관리.
2. `layout="vertical"` (레이블이 필드 위) 기본.
3. `rules`로 **선언적** 유효성 검사 정의. `required`, `min`, `max`, `pattern`.
4. 필드에 `hasFeedback`을 붙여 사용자에게 ✓/✕ 피드백 제공.
5. `onFinishFailed`에서 **첫 번째 에러**를 `toast.error`로 안내.
6. 수정 시 `form.setFieldsValue`로 API 데이터 세팅.
7. Drawer에서는 **열릴 때 세팅, 닫힐 때 `form.resetFields()`** 로 리셋.

## 1. 기본 구조

```typescript
import { Form, Input, Select } from 'antd';
import type { FormProps } from 'antd';
import { toast } from '@/shared-util';

const [form] = Form.useForm<MyFormValues>();

const onFinish: FormProps<MyFormValues>['onFinish'] = (values) => {
  createMutation.mutate(values);
};

const onFinishFailed: FormProps<MyFormValues>['onFinishFailed'] = (errorInfo) => {
  const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
  toast.error(firstError ?? '입력 항목을 확인해주세요.');
};

<Form
  form={form}
  layout="vertical"
  onFinish={onFinish}
  onFinishFailed={onFinishFailed}
  initialValues={{ status: 'ACTIVE' }}
>
  <Form.Item
    name="username"
    label="이름"
    required
    hasFeedback
    rules={[
      { required: true, message: '이름을 입력하세요.' },
      { max: 50, message: '최대 50자까지 입력 가능합니다.' },
    ]}
  >
    <Input placeholder="이름을 입력하세요." />
  </Form.Item>
</Form>
```

## 2. 수정 페이지/탭 — API 데이터로 초기화

```typescript
const { data } = useGetBot({ params: { serviceId } });

useEffect(() => {
  if (!data) return;
  form.setFieldsValue({
    serviceName: data.serviceName,
    serviceDesc: data.serviceDesc,
  });
}, [data, form]);
```

- API 응답이 도착한 뒤에만 세팅.
- `form`과 `data`를 deps에 포함.

## 3. Drawer에서의 폼 초기화/리셋

Drawer에서 폼을 사용할 때는 **열릴 때 세팅, 닫힐 때 리셋**의 흐름을 따른다:

```typescript
useEffect(() => {
  if (!open) return;
  if (initialData) {
    form.setFieldsValue({
      category: initialData.category,
      value: initialData.value,
    });
  }
  return () => form.resetFields();
}, [initialData, form, open]);
```

- `open === false`면 early return.
- cleanup에서 `resetFields()` 호출.
- `initialData`가 없으면 Drawer는 "생성 모드" — `initialValues`로 기본값을 주거나 빈 폼으로 열린다.

## 4. 제출 버튼 트리거

Drawer/Modal 푸터에서 제출할 때는 `form.submit()`으로 Form의 `onFinish`를 트리거:

```typescript
<Drawer
  open={open}
  footer={
    <div className="flex justify-end gap-2">
      <Button onClick={onClose}>취소</Button>
      <Button type="primary" onClick={() => form.submit()} loading={createMutation.isPending}>
        저장
      </Button>
    </div>
  }
>
  <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed}>
    {/* ... */}
  </Form>
</Drawer>
```

## 멀티테넌트 등록 폼

테넌트 소유 자원의 등록/수정 폼은 두 가지를 지켜야 한다 (정본: **BT-ADMIN-BE/docs/iam/MULTITENANT_ISOLATION.md**):

1. **테넌트 선택 필드는 `hidden={!operatorMode}`** — 운영자 모드(시스템 관리자)에서만 노출하고, 일반 사용자는 로그인 테넌트로 고정한다. `operatorMode`는 `useOperatorScopeStore`에서 읽는다.
2. **`TENANT_OWNED` 엔티티의 create api 는 `{ actAsTenantFromBody: true }` 필수** — 없으면 운영자 "전체(view-all)" 모드에서 다른 테넌트를 골라 등록할 때 백엔드가 **403** 을 낸다(폼 tenantId 와 요청 스코프 헤더가 분리되기 때문). 예: `apiClient.post('/ipron-dn-create', data, { actAsTenantFromBody: true })`. update/delete·batch·`SHARED_POOL` 엔티티는 대상 아님.

## 체크리스트

- [ ] `useState`가 아닌 `Form.useForm`으로 폼 상태를 관리하는가?
- [ ] `layout="vertical"` 인가?
- [ ] `rules`로 유효성 검사를 선언했는가?
- [ ] 필요한 필드에 `hasFeedback`을 붙였는가?
- [ ] `onFinishFailed`에서 첫 에러를 `toast.error`로 안내하는가?
- [ ] 수정 시 `form.setFieldsValue`로 API 데이터를 세팅하는가?
- [ ] Drawer라면 열릴 때 세팅 + 닫힐 때 `form.resetFields()`가 있는가?
- [ ] (테넌트 자원) 테넌트 필드가 `hidden={!operatorMode}`이고, `TENANT_OWNED` create api에 `actAsTenantFromBody: true`가 붙어 있는가? (→ 멀티테넌트 등록 폼)
- [ ] 파일 수정 후 `npx eslint --fix <file-path>`를 실행했는가?
