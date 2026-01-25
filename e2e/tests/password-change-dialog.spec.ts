import { test, expect } from '../fixtures/test-base';
import { LoginPage } from '../pages/login.page';
import { ChangePasswordDialog } from '../pages/change-password-dialog.page';
import { mockLoginExpiringSoon, mockLoginFirstLogin, mockLoginExpired } from '../fixtures/auth-mocks';
import { defaultPolicy } from '../fixtures/password-policy-mocks';

test.describe('비밀번호 변경 다이얼로그 - 3가지 모드', () => {
  let loginPage: LoginPage;
  let dialog: ChangePasswordDialog;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dialog = new ChangePasswordDialog(page);
  });

  test.skip('manual 모드 - 취소 버튼 및 현재 비밀번호 필드 있음', async ({ page, mockLogin, mockPasswordPolicy, mockPasswordChange }) => {
    // TODO: 실제 백엔드 연동 시 테스트 - 비밀번호 만료 임박 mock이 제대로 동작하지 않음
    await mockLogin(mockLoginExpiringSoon, 200);
    await mockPasswordPolicy(defaultPolicy);
    await mockPasswordChange(true);

    await loginPage.goto();
    await loginPage.login('admin', 'password');

    // Ant Design confirm 모달 대기 후 "지금 변경" 클릭
    const confirmModal = page.locator('.ant-modal-confirm-title');
    await confirmModal.waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.ant-modal-confirm-btns .ant-btn-primary').click();

    await dialog.waitForOpen();

    // manual 모드: 취소 버튼과 현재 비밀번호 필드 표시
    expect(await dialog.isCancelButtonVisible()).toBe(true);
    expect(await dialog.isCurrentPasswordVisible()).toBe(true);

    await dialog.fillPasswords('oldpassword', 'NewPass123!', 'NewPass123!');
    await dialog.screenshot('password-change-dialog-manual');

    await dialog.clickSubmit();
    await expect(dialog.dialog).not.toBeVisible({ timeout: 5000 });
  });

  test.skip('first-login 모드 - 취소 버튼 없음, 현재 비밀번호 필드 없음', async ({ page, mockLogin, mockPasswordPolicy, mockPasswordChange }) => {
    // TODO: 실제 백엔드 연동 시 테스트 - forcePasswordChange mock이 제대로 동작하지 않음
    await mockLogin(mockLoginFirstLogin, 200);
    await mockPasswordPolicy(defaultPolicy);
    await mockPasswordChange(true);

    await loginPage.goto();
    await loginPage.login('newuser', 'temppassword');

    // 다이얼로그가 열릴 때까지 충분히 대기
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // first-login 모드: 취소 버튼 없음
    expect(await dialog.isCancelButtonVisible()).toBe(false);
    expect(await dialog.isCurrentPasswordVisible()).toBe(false);

    // 안내 메시지 확인
    const alertText = await dialog.getAlertMessage();
    expect(alertText).toContain('최초 로그인');

    await dialog.fillPasswords(null, 'NewPass123!', 'NewPass123!');
    await dialog.screenshot('password-change-dialog-first-login');

    // ESC로 닫기 시도 - 차단되어야 함
    await page.keyboard.press('Escape');
    await expect(dialog.dialog).toBeVisible();

    await dialog.clickSubmit();
  });

  test.skip('expired 모드 - 취소 버튼 없음, 현재 비밀번호 필드 있음', async ({ page, mockLogin, mockPasswordPolicy, mockPasswordChange }) => {
    // TODO: 실제 백엔드 연동 시 테스트 - passwordExpired mock이 제대로 동작하지 않음
    await mockLogin(mockLoginExpired, 200);
    await mockPasswordPolicy(defaultPolicy);
    await mockPasswordChange(true);

    await loginPage.goto();
    await loginPage.login('admin', 'oldpassword');

    // 다이얼로그가 열릴 때까지 충분히 대기
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // expired 모드: 취소 버튼 없음, 현재 비밀번호 필요
    expect(await dialog.isCancelButtonVisible()).toBe(false);
    expect(await dialog.isCurrentPasswordVisible()).toBe(true);

    // 경고 메시지 확인
    const alertText = await dialog.getAlertMessage();
    expect(alertText).toContain('만료');

    await dialog.fillPasswords('oldpassword', 'NewPass456!', 'NewPass456!');
    await dialog.screenshot('password-change-dialog-expired');

    // ESC로 닫기 시도 - 차단되어야 함
    await page.keyboard.press('Escape');
    await expect(dialog.dialog).toBeVisible();

    await dialog.clickSubmit();
  });
});
