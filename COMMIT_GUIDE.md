# 커밋 가이드

이 프로젝트는 commitizen을 사용하여 일관된 커밋 메시지를 작성합니다.

## 사용법

### 1. Commitizen을 사용한 커밋

```bash
# pnpm script 사용
pnpm commit

# 또는 직접 실행
pnpm exec git-cz
```

## 지원하는 커밋 타입

| 이모지 | 타입          | 설명                | 사용 예시                     |
| ------ | ------------- | ------------------- | ----------------------------- |
| 🎉     | `🎉 init`     | 프로젝트 초기화     | 프로젝트 생성, 초기 설정      |
| ✨     | `✨ feat`     | 새로운 기능 추가    | 새로운 기능 구현              |
| 📦️    | `📦️ chore`   | 빌드 및 구조 수정   | 의존성 업데이트, 설정 변경    |
| 💄     | `💄 design`   | UI/UX 디자인 변경   | 스타일 수정, 레이아웃 변경    |
| 🐛     | `🐛 fix`      | 버그 수정           | 버그 수정, 오류 해결          |
| ✅     | `✅ test`     | 테스트 코드 추가    | 테스트 작성, 테스트 수정      |
| 🚀     | `🚀 deploy`   | 배포 관련           | 배포 설정, 배포 스크립트      |
| 🔨     | `🔨 refactor` | 코드 리팩터링       | 코드 구조 개선, 최적화        |
| 🚚     | `🚚 rename`   | 파일/폴더 이름 변경 | 파일명 변경, 폴더명 변경      |
| 📚     | `📚 docs`     | 문서 업데이트       | README 수정, 문서 작성        |
| 🔥     | `🔥 remove`   | 코드/파일 삭제      | 불필요한 코드 제거, 파일 삭제 |

## 커밋 메시지 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### 예시

```
✨ Feat(auth): add login functionality
🐛 Fix(ui): resolve button alignment issue
📚 Docs(readme): update installation guide
🔨 Refactor(utils): simplify date formatting function
💄 Design(header): improve navigation layout
🚀 Deploy(ci): add automated deployment pipeline
```

## 규칙

- **Type**: 위의 타입 중 하나를 선택 (이모지 포함)
- **Scope**: 변경사항의 범위 (선택사항)
- **Subject**: 50자 이내의 간결한 설명
- **Body**: 상세한 설명 (선택사항)
- **Footer**: 이슈 번호 등 (선택사항)

## Husky 설정

이 프로젝트는 Husky를 통해 커밋 전에 자동으로 commitlint 검사를 수행합니다.

## 예외 처리

다음과 같은 커밋 메시지는 commitlint 검사에서 제외됩니다:

### 자동 생성 커밋

- `Merge branch 'feature' into 'main'`
- `Merge pull request #123 from user/feature`
- `Merge remote-tracking branch 'origin/main'`
- `Revert "feat: add new feature"`
- `chore(deps): update dependencies`

### 특별한 상황

- `WIP: work in progress`
- `Initial commit`
- `wip: temporary changes`

이러한 커밋들은 자동으로 생성되거나 특별한 상황에서 사용되므로 규칙 검사에서 제외됩니다.
