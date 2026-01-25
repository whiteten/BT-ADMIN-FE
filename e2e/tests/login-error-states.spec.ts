import { test, expect } from '../fixtures/test-base';
import { LoginPage } from '../pages/login.page';
import {
  mockLoginAccountLocked,
  mockLoginInvalidPasswordHigh,
  mockLoginInvalidPasswordLow,
  mockLoginDormant,
  mockLoginDisabled,
  mockLoginExpiringSoon,
  mockLoginFirstLogin,
  mockLoginExpired,
} from '../fixtures/auth-mocks';
import { defaultPolicy } from '../fixtures/password-policy-mocks';

test.describe('로그인 에러 상태', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('계정 잠금 - 카운트다운 타이머 표시', async ({ page, mockLogin }) => {
    await mockLogin(mockLoginAccountLocked, 429);
    await loginPage.login('testuser', 'wrongpassword');

    await loginPage.waitForErrorAlert();
    await expect(loginPage.accountLockedAlert).toBeVisible();
    await expect(loginPage.countdownTimer).toBeVisible();
    expect(await loginPage.isLoginButtonDisabled()).toBe(true);

    // 타이머 포맷 확인 (분:초)
    const timerText = await loginPage.countdownTimer.textContent();
    expect(timerText).toMatch(/\d+:\d{2}/);

    await loginPage.screenshot('login-account-locked');
  });

  test('잘못된 비밀번호 - 시도 횟수 많음 (4회)', async ({ mockLogin }) => {
    await mockLogin(mockLoginInvalidPasswordHigh, 401);
    await loginPage.login('admin', 'wrongpassword');

    await loginPage.waitForErrorAlert();
    const attempts = await loginPage.getRemainingAttempts();
    expect(attempts).toBe(4);

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('남은 시도 횟수: 4회');

    await loginPage.screenshot('login-invalid-password-high');
  });

  test('잘못된 비밀번호 - 시도 횟수 적음 (2회, 경고 스타일)', async ({ mockLogin }) => {
    await mockLogin(mockLoginInvalidPasswordLow, 401);
    await loginPage.login('admin', 'wrongpassword');

    await loginPage.waitForErrorAlert();
    const attempts = await loginPage.getRemainingAttempts();
    expect(attempts).toBe(2);

    // 에러 메시지 확인
    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('남은 시도 횟수: 2회');

    await loginPage.screenshot('login-invalid-password-low');
  });

  test('휴면 계정', async ({ mockLogin }) => {
    await mockLogin(mockLoginDormant, 401);
    await loginPage.login('dormantuser', 'password');

    await loginPage.waitForErrorAlert();
    await expect(loginPage.dormantAlert).toBeVisible();

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('휴면');

    await loginPage.screenshot('login-dormant-account');
  });

  test('비활성화 계정', async ({ mockLogin }) => {
    await mockLogin(mockLoginDisabled, 401);
    await loginPage.login('disableduser', 'password');

    await loginPage.waitForErrorAlert();
    await expect(loginPage.disabledAlert).toBeVisible();

    const errorMsg = await loginPage.getErrorMessage();
    expect(errorMsg).toContain('비활성화');

    await loginPage.screenshot('login-disabled-account');
  });

  test.skip('비밀번호 만료 임박 (7일) - 확인 모달', async ({ page, mockLogin, mockPasswordPolicy }) => {
    // TODO: 실제 백엔드 연동 시 테스트 - 현재 mock 응답이 React Query에서 제대로 처리되지 않음
    await mockLogin(mockLoginExpiringSoon, 200);
    await mockPasswordPolicy(defaultPolicy);
    await loginPage.login('admin', 'password');

    // Ant Design confirm 모달 대기 - 타이틀이 표시될 때까지
    const modalTitle = page.locator('.ant-modal-confirm-title');
    await modalTitle.waitFor({ state: 'visible', timeout: 10000 });

    // 모달 내용 확인
    const modalContent = await page.locator('.ant-modal-confirm-content').textContent();
    expect(modalContent).toContain('7일 후 만료');

    // 버튼 확인 (Ant Design confirm 버튼)
    await expect(page.locator('.ant-modal-confirm-btns .ant-btn-primary')).toBeVisible();
    await expect(page.locator('.ant-modal-confirm-btns .ant-btn-default')).toBeVisible();

    await page.screenshot({
      path: 'e2e/screenshots/login-password-expiring-soon.png',
      fullPage: true,
    });
  });

  test('최초 로그인 - 비밀번호 변경 강제', async ({ page, mockLogin, mockPasswordPolicy }) => {
    await mockLogin(mockLoginFirstLogin, 200);
    await mockPasswordPolicy(defaultPolicy);
    await loginPage.login('newuser', 'temppassword');

    // 비밀번호 변경 다이얼로그 대기
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // 최초 로그인 안내 메시지 확인
    const alertText = await page.locator('[role="dialog"] [role="alert"]').textContent();
    expect(alertText).toContain('최초 로그인');

    await page.screenshot({
      path: 'e2e/screenshots/login-first-login.png',
      fullPage: true,
    });
  });

  test('비밀번호 만료 - 변경 필수', async ({ page, mockLogin, mockPasswordPolicy }) => {
    await mockLogin(mockLoginExpired, 200);
    await mockPasswordPolicy(defaultPolicy);
    await loginPage.login('admin', 'oldpassword');

    // 비밀번호 변경 다이얼로그 대기
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });

    // 만료 경고 메시지 확인
    const alertText = await page.locator('[role="dialog"] [role="alert"]').textContent();
    expect(alertText).toContain('만료');

    await page.screenshot({
      path: 'e2e/screenshots/login-password-expired.png',
      fullPage: true,
    });
  });
});
