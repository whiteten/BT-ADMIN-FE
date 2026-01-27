# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Important Instructions

Must answer Korean.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
ALWAYS run `npx eslint --fix <file-path>` after modifying any TypeScript or JavaScript files to ensure code quality and consistency.
NEVER commit automatically. Only commit when the user explicitly requests it.
This project uses **React Compiler** - do NOT use `useMemo` or `useCallback` unless explicitly necessary, as the compiler automatically optimizes re-renders.

## Project Architecture

This is an **Nx monorepo** using **Module Federation** to build micro-frontends. The workspace contains:

### Applications

- **Host App** (`apps/host`): Main shell application that consumes micro-frontends
  - Login page
  - Main layout with sidebar navigation
- **Remote Apps**:
  - `apps/manager`: Manager (User management, Dashboard)
  - `apps/fca`: Focus AI (Bot management features)

### Libraries

- **Shared UI** (`libs/shared-ui`): Reusable React components
  - 47 shadcn/ui components (Badge, Button, Card, Dialog, Table, etc.)
  - Custom components (AggridNoRowsOverlay, AggridRowDataSidebar, FallbackSpinner, Icons, NoData, NotFound, PageHeader, PageTabs)
- **Shared Store** (`libs/shared-store`): State management using Zustand
- **Shared Util** (`libs/shared-util`): Utility functions and helpers

### Module Federation Structure

- Each remote app exposes modules through `module-federation.config.ts`
- Host app consumes these remotes and routes to them
- All apps share the same libraries for consistency

## Development Commands

### Building

```bash
# Build projects (interactive selection)
pnpm run build
# This runs: node scripts/build-selective.js
# Allows selecting specific apps to build or all apps

# Build specific project directly
npx nx build <project-name>

# Build multiple projects
npx nx run-many --target=build --projects=host,manager
```

### Development Server

```bash
# Start host application (serves all micro-frontends)
pnpm run serve
# This runs: node scripts/serve-host.js

# Serve specific project
npx nx serve <project-name>

# Serve production build
pnpm run serve:prod
# This runs: pnpm exec serve dist/apps/host -l 4200 -s
```

### Linting and Type Checking

```bash
# Lint all projects
npx nx run-many --target=lint --all

# Type check all projects
npx nx run-many --target=typecheck --all

# Lint specific project
npx nx lint <project-name>
```

### Testing

```bash
# Run all tests
npx nx run-many --target=test --all

# Test specific project
npx nx test <project-name>
```

### Adding Components

```bash
# Add shadcn/ui components to shared-ui library
pnpm run shadcn:add <component-name>
# This uses: cross-env TS_NODE_PROJECT=tsconfig.base.json npx shadcn@latest add
```

### Creating New Remotes

```bash
# Create new micro-frontend
pnpm run create-remote
# This runs: node scripts/create-remote.js
```

## Technology Stack

### Core Technologies

- **Framework**: React 19 with TypeScript 5.8
- **Build Tool**: Webpack 5 with @module-federation/enhanced
- **Monorepo**: Nx 21.3.5
- **Package Manager**: pnpm

### UI & Styling

- **Styling**: Tailwind CSS v4 with PostCSS
- **UI Components**:
  - shadcn/ui with Radix UI primitives
  - Ant Design v6
  - AG-Grid Enterprise for data tables
- **Icons**: Lucide React
- **Themes**: next-themes for dark mode support

### State & Forms

- **State Management**: Zustand
- **Server State**: TanStack Query (React Query)
- **Form Management**: React Hook Form with Zod validation
- **Routing**: React Router DOM 6.29

## API Integration Guidelines

When integrating APIs, always use **TanStack Query** with custom hooks. Never call `apiClient` directly in components.

### File Structure

```
apps/*/src/app/features/<feature>/
├── api/
│   └── <feature>Api.ts         # API function definitions
├── hooks/
│   └── use<Feature>Queries.ts  # TanStack Query hooks
└── types/
    └── <feature>.types.ts      # Type definitions
```

### API Function Definition Example

```typescript
// apps/manager/src/app/features/user/api/userApi.ts
import { apiClient } from '@/shared-util';
import type { User, CreateUserDto } from '../types/user.types';

export const userApi = {
  getUsers: () => apiClient.get<User[]>('/users'),
  getUser: (id: string) => apiClient.get<User>(`/users/${id}`),
  createUser: (data: CreateUserDto) => apiClient.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User>) => apiClient.patch<User>(`/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};
```

### TanStack Query Hook Example

Use `@lukemorales/query-key-factory` for query key management:

```typescript
// apps/manager/src/app/features/user/hooks/useUserQueries.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { userApi } from '../api/userApi';
import type { User, UserListItem } from '../types/user.types';

// Define query keys using factory pattern
export const userQueryKeys = createQueryKeys('users', {
  getUsers: (params?: Record<string, unknown>) => [params],
  getUser: (params?: Record<string, unknown>) => [params],
});

// Query hooks - use { params, queryOptions } pattern
export const useGetUsers = ({ params, queryOptions }: QueryHookWithParamsOptions<UserListItem[]> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUsers(params).queryKey,
    queryFn: () => userApi.getUsers(params),
    ...queryOptions,
  });
};

export const useGetUser = ({ params, queryOptions }: QueryHookWithParamsOptions<User> = {}) => {
  return useQuery({
    queryKey: userQueryKeys.getUser(params).queryKey,
    queryFn: () => userApi.getUser(params),
    ...queryOptions,
  });
};

// Mutation hooks - use { mutationOptions } pattern
export const useCreateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.createUser,
    ...mutationOptions,
  });
};

export const useUpdateUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.updateUser,
    ...mutationOptions,
  });
};

export const useDeleteUser = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: userApi.deleteUser,
    ...mutationOptions,
  });
};
```

### Component Usage Example

```typescript
// apps/manager/src/app/pages/user/UserList.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useGetUsers, useCreateUser, userQueryKeys } from '../../features/user/hooks/useUserQueries';

export function UserList() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useGetUsers({});
  const createUser = useCreateUser({
    mutationOptions: {
      onSuccess: () => {
        // Invalidate cache after mutation
        queryClient.invalidateQueries({ queryKey: userQueryKeys.useGetUsers().queryKey });
      },
    },
  });

  // ❌ WRONG - Direct apiClient call
  // const [users, setUsers] = useState([]);
  // useEffect(() => { apiClient.get('/users').then(setUsers); }, []);

  // ✅ CORRECT - Using custom hooks
  if (isLoading) return <FallbackSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return <UserTable data={users} />;
}
```

### Key Rules

1. **No direct apiClient usage**: Never import and use `apiClient` directly in components
2. **Query Key Factory**: Use `@lukemorales/query-key-factory` with `createQueryKeys`
3. **Hook Parameters**: Query hooks use `{ params, queryOptions }`, Mutation hooks use `{ mutationOptions }`
4. **Hook Naming**: `useGet<Feature>s` (list), `useGet<Feature>` (single), `useCreate<Feature>`, `useUpdate<Feature>`, `useDelete<Feature>`
5. **Cache Invalidation**: Handle in component via `mutationOptions.onSuccess`

### Development Tools

- **Testing**: Jest with Testing Library
- **Linting**: ESLint 9 with TypeScript support
- **Formatting**: Prettier
- **Git Hooks**: Husky with lint-staged
- **Commit Convention**: Commitizen with cz-git

## Commit Guidelines

This project uses **commitizen** with cz-git for consistent commit messages. Always use:

```bash
pnpm commit
```

Supported commit types include: 🎉 init, ✨ feat, 📦️ chore, 💄 design, 🐛 fix, ✅ test, 🚀 deploy, 🔨 refactor, 🚚 rename, 📚 docs, 🔥 remove

### Scope 작성 규칙

- **단일 remote 작업**: scope에 해당 remote 명칭을 작성 (예: `fca`, `manager`, `host`)
- **여러 remote 작업**: scope를 비워둠

```bash
# 단일 remote 작업 예시
✨feat(fca): TTS 발화자 입력 유효성 검사 추가

# 여러 remote 작업 예시
✨feat: 공통 컴포넌트 스타일 수정
```

## File Structure Conventions

### Applications

- `apps/*/src/app/` - Main application components
- `apps/*/src/app/pages/` - Page components
- `apps/*/src/app/features/` - Feature-specific logic and types
- `apps/*/src/remote-entry.ts` - Module Federation entry points
- `apps/*/module-federation.config.ts` - Module Federation configurations
- `apps/*/webpack.config.ts` - Webpack configurations

### Libraries

- `libs/shared-ui/src/components/shadcn/` - shadcn/ui components
- `libs/shared-ui/src/components/custom/` - Custom reusable components
- `libs/shared-ui/src/lib/utils.ts` - UI utility functions (cn, etc.)
- `libs/shared-store/src/` - Global state management
- `libs/shared-util/src/` - Shared utility functions

## Import Path Conventions

### Path Resolution Rules

1. **Within the same app**: Use **relative paths**

   ```typescript
   // Inside apps/manager/src/app/pages/user/UserDetail.tsx
   import { UserCard } from './UserCard';
   import { userApi } from '../../features/user/api';
   ```

2. **Across different apps or from libraries**: Use **absolute paths with `@` alias**
   ```typescript
   // From any app importing shared libraries
   import { Button } from '@/components/ui/button';
   import { PageHeader } from '@/components/custom/PageHeader';
   ```

### Path Aliases (defined in `tsconfig.base.json`)

Always use the shortest alias available when importing from libraries:

| Full Path                                | Use This Alias          |
| ---------------------------------------- | ----------------------- |
| `libs/shared-ui/src/components/shadcn/*` | `@/components/ui/*`     |
| `libs/shared-ui/src/components/custom/*` | `@/components/custom/*` |
| `libs/shared-ui/src/lib/utils`           | `@/lib/utils`           |
| `libs/shared-util/src/lib/log.ts`        | `@/log`                 |
| `libs/shared-util/src/index.ts`          | `@/shared-util`         |
| `libs/shared-store/src/index.ts`         | `@/shared-store`        |
| `libs/*`                                 | `@/libs/*`              |
| `apps/*`                                 | `@/app/*`               |

### Common Import Examples

```typescript
// UI Components (shadcn)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Custom Components
import { PageHeader } from '@/components/custom/PageHeader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// Utilities
import { cn } from '@/lib/utils';
import { Log } from '@/log';
import { toast } from '@/shared-util';

// State Management
import { useAuthStore } from '@/shared-store';
```

## Code Quality

The project enforces code quality through:

- **lint-staged**: Runs ESLint and TypeScript checks on staged files
- **Husky**: Pre-commit hooks for automated checks
- **commitlint**: Ensures consistent commit message format
- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured with React, TypeScript, and Prettier plugins

## Key Dependencies

### UI Libraries

- `@radix-ui/*`: Complete set of Radix UI primitives
- `ag-grid-react`: Data grid with enterprise features
- `antd`: Ant Design components (v6)
- `lucide-react`: Icon library
- `recharts`: Chart library
- `echarts` & `echarts-for-react`: Chart library
- `cmdk`: Command menu component
- `sonner`: Toast notifications

### Utilities

- `clsx` & `tailwind-merge`: Class name utilities
- `date-fns` & `dayjs`: Date manipulation
- `lodash`: Utility functions
- `zod`: Schema validation
