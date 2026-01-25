import { test as base } from '@playwright/test';
import type { LoginResponse, LoginErrorResponse } from './auth-mocks';
import type { PasswordPolicy } from './password-policy-mocks';

/**
 * 커스텀 테스트 fixture
 * API Route Interception을 통한 Mock 응답 설정
 */
type MockHandlers = {
  mockLogin: (response: LoginResponse | LoginErrorResponse, status?: number) => Promise<void>;
  mockPasswordPolicy: (policy: PasswordPolicy) => Promise<void>;
  mockPasswordChange: (success?: boolean) => Promise<void>;
};

export const test = base.extend<MockHandlers>({
  mockLogin: async ({ page }, use) => {
    await use(async (response, status) => {
      const isError = 'error' in response;
      const httpStatus = status ?? (isError ? 400 : 200);

      await page.route('**/auth/login', async (route) => {
        // 성공 응답은 { data: LoginResponse } 형태로 감싸서 반환
        const body = isError ? response : { data: response };
        await route.fulfill({
          status: httpStatus,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      });
    });
  },

  mockPasswordPolicy: async ({ page }, use) => {
    await use(async (policy) => {
      await page.route('**/bff/password-policy-detail*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            code: 'OK',
            data: policy,
          }),
        });
      });
    });
  },

  mockPasswordChange: async ({ page }, use) => {
    await use(async (success = true) => {
      await page.route('**/bff/password-update*', async (route) => {
        await route.fulfill({
          status: success ? 200 : 400,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: success,
            code: success ? 'OK' : 'ERROR',
            message: success ? '비밀번호가 변경되었습니다.' : '비밀번호 변경에 실패했습니다.',
          }),
        });
      });
    });
  },
});

export { expect } from '@playwright/test';
