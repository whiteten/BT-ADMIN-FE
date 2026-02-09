# Manager 앱 분석

## 1. 라우팅 구조

| 경로 | 컴포넌트 | 파일 위치 | 설명 |
|------|----------|-----------|------|
| `/manager` | Navigate → main | routes.tsx:28 | 루트 리다이렉트 |
| `/manager/main` | Main | pages/main/Main.tsx | 메인 대시보드 |
| `/manager/resource/user/list` | UserList | pages/user/UserList.tsx | 사용자 목록 |
| `/manager/resource/user/create` | UserCreate | pages/user/UserCreate.tsx | 사용자 생성 |
| `/manager/resource/user/:userId` | UserDetail | pages/user/UserDetail.tsx | 사용자 상세 |
| `/manager/resource/auth-group/list` | AuthGroupManagement | pages/iam/AuthGroupManagement.tsx | 역할/권한 관리 |
| `/manager/resource/role/create` | RoleCreatePage | pages/iam/RoleCreatePage.tsx | 역할 생성 |
| `/manager/resource/role/:roleId` | RoleDetailPage | pages/iam/RoleDetailPage.tsx | 역할 상세 |
| `/manager/resource/account-policy` | AccountPolicyPage | pages/account-policy/AccountPolicyPage.tsx | 계정 정책 |
| `/manager/resource/work-history` | WorkHistoryList | pages/work-history/WorkHistoryList.tsx | 작업 이력 |

---

## 2. 사용자 관리 (User)

### 2.1 사용자 목록 (UserList)
- **파일**: `apps/manager/src/app/pages/user/UserList.tsx`
- **검색 조건**: 필터 컬럼 선택 (사용자명, 계정, 권한) + 검색어
- **그리드 컬럼** (ag-Grid):
  | 컬럼명 | 필드 | 비고 |
  |--------|------|------|
  | ID | id | |
  | 사용자명 | username | |
  | 계정 | userAccount | |
  | 권한 | roleName | |
  | 상태 | accountStatus | Badge (ACTIVE/DORMANT/DISABLED) |
  | 테넌트 | tenantName | |
  | 생성일 | createdAt | |
  | 최근 로그인 | lastLoginAt | |
  | 최근 로그인 실패 | lastFailedLoginAt | |
- **액션 버튼**: 추가, 행 더블클릭(상세), 삭제 아이콘

### 2.2 사용자 생성 (UserCreate)
- **파일**: `apps/manager/src/app/pages/user/UserCreate.tsx`
- **UI 패턴**: Steps wizard (2단계) + Summary sidebar
- **Step 1: 기본 정보**
  | 필드명 | 타입 | 필수 | 설명 |
  |--------|------|------|------|
  | userAccount | Input | O | 계정 (로그인 ID), 3-100자 |
  | username | Input | O | 사용자명, 2-50자 |
  | roleId | Select | O | 역할 선택 |
  | accountStatus | Select | X | 계정 상태 (기본: ACTIVE) |
  | description | TextArea | X | 설명, 최대 500자 |
  | allowConcurrentLogin | Switch | X | 중복 로그인 허용 |
- **Step 2: 부가사항**
  | 필드명 | 타입 | 필수 | 설명 |
  |--------|------|------|------|
  | phone | Input | X | 핸드폰번호 |
  | email | Input | X | 이메일 |
  | allowedIps | Tag List | X | 접근 허용 IP 목록 |

### 2.3 사용자 상세 (UserDetail) - 4탭
- **파일**: `apps/manager/src/app/pages/user/UserDetail.tsx`
- **UI 패턴**: Tab Panel + Summary sidebar

#### Tab 1: 기본정보
- **필드**: userAccount(읽기전용), username, roleId, accountStatus, description, allowConcurrentLogin
- **추가 기능**: 비밀번호 초기화 버튼
- **시스템 정보**: 생성일, 수정일, 최근 로그인, 비밀번호 변경일
- **버튼**: 저장, 삭제

#### Tab 2: 로그인 이력
- **검색 조건**: DateRangePicker (기본 7일, 최대 90일)
- **그리드 컬럼**: 일시, 결과 (SUCCESS/FAILURE/LOCKED), 실패사유, IP 주소

#### Tab 3: 개별 권한
- **UI**: PermissionSelector 컴포넌트 (체크박스 트리)
- **동작**: 개별 권한이 역할 권한을 대체
- **버튼**: 역할 권한으로 초기화, 저장

#### Tab 4: 부가사항
- **필드**: phone, email, allowedIps
- **버튼**: 저장

---

## 3. 역할/권한 관리 (AuthGroup)

### 3.1 역할 관리 탭
- **파일**: `apps/manager/src/app/features/iam/tabs/RoleManagementTab.tsx`
- **검색 조건**: 키워드 검색 (역할명/코드)
- **UI**: Card Grid (RoleCard 컴포넌트)
- **액션**: 역할 추가, 수정(상세), 삭제

### 3.2 권한 목록 탭
- **파일**: `apps/manager/src/app/features/iam/tabs/PermissionListTab.tsx`
- **검색 조건**: 앱, 도메인, 액션, 키워드
- **그리드 컬럼**: 앱, 도메인, 리소스, 액션, 권한 키, 설명, 연결된 메뉴
- **Modal**: 권한 추가

### 3.3 역할 생성 (RoleCreatePage)
- **파일**: `apps/manager/src/app/pages/iam/RoleCreatePage.tsx`
- **UI 패턴**: Steps wizard (2단계)
- **Step 1: 기본 정보**
  | 필드명 | 타입 | 필수 | 설명 |
  |--------|------|------|------|
  | roleCode | Input | O | 역할 코드, 대문자 시작 |
  | roleName | Input | O | 역할 이름 |
  | sortOrder | InputNumber | X | 정렬 순서 |
  | isUse | Switch | X | 사용 여부 |
  | canResetPassword | Switch | X | 비밀번호 초기화 권한 |
  | description | TextArea | X | 설명 |
- **Step 2: 권한 매핑**: PermissionSelector

### 3.4 역할 상세 (RoleDetailPage)
- **파일**: `apps/manager/src/app/pages/iam/RoleDetailPage.tsx`
- **탭**: 기본정보, 권한 매핑

---

## 4. 계정 정책 (AccountPolicy) - 4탭

- **파일**: `apps/manager/src/app/pages/account-policy/AccountPolicyPage.tsx`

### 4.1 비밀번호 복잡도 탭
| 필드명 | 설명 |
|--------|------|
| minLength | 최소 길이 (4-128) |
| maxLength | 최대 길이 (8-256) |
| requireUppercase | 대문자 필수 |
| requireLowercase | 소문자 필수 |
| requireDigit | 숫자 필수 |
| rejectConsecutiveChars | 연속 문자 금지 |
| rejectRepeatedChars | 반복 문자 금지 |
| rejectUserId | 사용자 ID 포함 금지 |

### 4.2 계정 잠금 탭
| 필드명 | 설명 |
|--------|------|
| maxFailedAttempts | 최대 로그인 실패 횟수 (1-10) |
| lockoutDurationMinutes | 계정 잠금 지속 시간 (분) |
| failedAttemptResetMinutes | 실패 횟수 초기화 시간 (분) |

### 4.3 만료 정책 탭
| 필드명 | 설명 |
|--------|------|
| maxAgeDays | 비밀번호 유효 기간 (일) |
| expirationWarningDays | 만료 경고 시작일 (일 전) |
| historyCount | 이전 비밀번호 재사용 금지 개수 |
| dormantDays | 휴면 전환 기간 (일) |

### 4.4 세션 정책 탭
| 필드명 | 설명 |
|--------|------|
| concurrentLoginAction | KICK_EXISTING(기존 종료) / BLOCK_NEW(새 로그인 차단) |

---

## 5. 작업 이력 (WorkHistory)

- **파일**: `apps/manager/src/app/pages/work-history/WorkHistoryList.tsx`
- **검색 조건**: 날짜, 시간 범위, 상태, 메서드, 사용자
- **그리드 컬럼**: 시각, 사용자, 메서드, URI, 상태, ms, IDS
- **상세**: WorkHistoryDetailDrawer (행 더블클릭)

---

## 6. API 훅 정리

### 사용자 API
| 훅 이름 | BFF Flow ID | 메소드 |
|---------|------------|--------|
| useGetUsers | user-list | GET |
| useGetUser | user-detail | GET |
| useCreateUser | user-create | POST |
| useUpdateUser | user-update | PUT |
| useDeleteUser | user-delete | DELETE |
| useResetPasswordToAccount | user-reset-password | PUT |

### 역할 API
| 훅 이름 | BFF Flow ID | 메소드 |
|---------|------------|--------|
| useGetRoles | role-list | GET |
| useGetRole | role-detail | GET |
| useCreateRole | role-create | POST |
| useUpdateRole | role-update | PUT |
| useDeleteRole | role-delete | DELETE |

### 계정 정책 API
| 훅 이름 | BFF Flow ID | 메소드 |
|---------|------------|--------|
| useGetAccountPolicy | account-policy-detail | GET |
| useUpdateAccountPolicy | account-policy-update | PUT |

### 작업 이력 API
| 훅 이름 | BFF Flow ID | 메소드 |
|---------|------------|--------|
| useWorkHistoryList | work-history-list | GET |
| useWorkHistoryDetail | work-history-detail | GET |

---

## 7. 메뉴 구조

```
Manager (manager)
├── 메인 (/main)
├── 자원관리
│   ├── 사용자 (/resource/user/list)
│   ├── 역할/권한 (/resource/auth-group/list)
│   ├── 계정 정책 (/resource/account-policy)
│   └── 작업 이력 (/resource/work-history)
```
