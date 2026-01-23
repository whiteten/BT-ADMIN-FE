/**
 * Role hooks export for Module Federation
 * host 앱에서 사용할 수 있도록 expose
 */
export { useGetRoles, roleQueryKeys } from './app/features/iam/hooks/useRoleQueries';
export type { Role } from './app/features/iam/types/iam.types';
