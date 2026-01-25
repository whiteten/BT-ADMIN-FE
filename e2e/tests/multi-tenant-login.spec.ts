import { test, expect } from '../fixtures/test-base';
import { LoginPage } from '../pages/login.page';
import { mockLoginSuccess, mockLoginTenantRequired, mockLoginUnauthorizedTenant } from '../fixtures/auth-mocks';

test.describe('멀티테넌트 로그인', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('단일 테넌트 사용자 - 테넌트 미입력 시 자동 선택으로 로그인 성공', async ({ page, mockLogin }) => {
    // 단일 테넌트 사용자는 테넌트 미입력해도 자동 선택됨
    await mockLogin(mockLoginSuccess, 200);

    await loginPage.login('singleuser', 'password123');

    // 로그인 성공 후 메인 페이지로 이동
    await page.waitForURL('**/');

    await page.screenshot({
      path: 'screenshots/multi-tenant-single-tenant-success.png',
      fullPage: true,
    });
  });

  test('멀티테넌트 사용자 - 테넌트 미입력 시 tenant_required 에러 표시', async ({ page, mockLogin }) => {
    // 멀티테넌트 사용자가 테넌트 미입력 시 에러 응답
    await mockLogin(mockLoginTenantRequired, 400);

    await loginPage.login('multiuser', 'password123');

    // tenant_required 에러 Alert 확인 (인라인 Alert, 토스트가 아님)
    await loginPage.waitForErrorAlert();

    // 테넌트 선택 필요 메시지 확인 - 인라인 Alert는 CardContent 내부에 있음
    const inlineAlert = page.locator('.ant-card-body [role="alert"], [data-slot="alert"]').first();
    const alertText = await inlineAlert.textContent();
    expect(alertText).toContain('테넌트 선택 필요');
    expect(alertText).toContain('여러 테넌트에 속한 계정입니다');

    await page.screenshot({
      path: 'screenshots/multi-tenant-tenant-required.png',
      fullPage: true,
    });
  });

  test('멀티테넌트 사용자 - 테넌트 입력 시 로그인 성공', async ({ page, mockLogin }) => {
    // 테넌트를 입력하면 성공
    await mockLogin(mockLoginSuccess, 200);

    // 테넌트명 입력
    await page.getByLabel('테넌트명').fill('100');
    await loginPage.login('multiuser', 'password123');

    // 로그인 성공 후 메인 페이지로 이동
    await page.waitForURL('**/');

    await page.screenshot({
      path: 'screenshots/multi-tenant-with-tenant-success.png',
      fullPage: true,
    });
  });

  test('멀티테넌트 사용자 - 권한 없는 테넌트 입력 시 에러 표시', async ({ page, mockLogin }) => {
    // 권한 없는 테넌트로 시도하면 에러
    await mockLogin(mockLoginUnauthorizedTenant, 401);

    // 권한 없는 테넌트 입력
    await page.getByLabel('테넌트명').fill('999');
    await loginPage.login('multiuser', 'password123');

    // 에러 Alert 확인 - 인라인 Alert는 CardContent 내부에 있음
    await loginPage.waitForErrorAlert();

    const inlineAlert = page.locator('.ant-card-body [role="alert"], [data-slot="alert"]').first();
    const alertText = await inlineAlert.textContent();
    expect(alertText).toContain('해당 테넌트에 접근 권한이 없습니다');

    await page.screenshot({
      path: 'screenshots/multi-tenant-unauthorized-tenant.png',
      fullPage: true,
    });
  });

  test('테넌트 입력 필드 placeholder 확인', async ({ page }) => {
    // 테넌트 입력 필드가 선택적임을 나타내는 placeholder 확인
    const tenantInput = page.getByPlaceholder('테넌트명 (선택)');
    await expect(tenantInput).toBeVisible();

    await page.screenshot({
      path: 'screenshots/multi-tenant-input-field.png',
      fullPage: true,
    });
  });
});
