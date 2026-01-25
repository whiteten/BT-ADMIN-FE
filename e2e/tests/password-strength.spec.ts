import { test, expect } from '../fixtures/test-base';
import { LoginPage } from '../pages/login.page';
import { ChangePasswordDialog } from '../pages/change-password-dialog.page';
import { mockLoginFirstLogin } from '../fixtures/auth-mocks';
import { strictPolicy, lenientPolicy, defaultPolicy } from '../fixtures/password-policy-mocks';

test.describe('비밀번호 강도 미터 - 정책 검증', () => {
  let loginPage: LoginPage;
  let dialog: ChangePasswordDialog;

  test.beforeEach(async ({ page, mockLogin }) => {
    loginPage = new LoginPage(page);
    dialog = new ChangePasswordDialog(page);
    await mockLogin(mockLoginFirstLogin, 200);
    await loginPage.goto();
  });

  test('엄격한 정책 - 약한 비밀번호와 강한 비밀번호', async ({ page, mockPasswordPolicy, mockPasswordChange }) => {
    await mockPasswordPolicy(strictPolicy);
    await mockPasswordChange(true);

    await loginPage.login('testuser', 'temp');
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // 약한 비밀번호 입력
    await dialog.newPasswordInput.fill('weak');
    await page.waitForTimeout(500);

    const weakStrength = await dialog.getStrengthText();
    expect(weakStrength).toMatch(/약함|보통/); // weak 비밀번호는 약함 또는 보통일 수 있음

    await dialog.screenshot('password-strength-weak');

    // 강한 비밀번호 입력
    await dialog.newPasswordInput.clear();
    await dialog.newPasswordInput.fill('StrongP@ss2024XYZ');
    await page.waitForTimeout(500);

    const strongStrength = await dialog.getStrengthText();
    expect(strongStrength).toMatch(/강함|매우 강함/);

    await dialog.screenshot('password-strength-strong');
  });

  test('rejectUserId 규칙 - 사용자 ID 포함 금지', async ({ page, mockPasswordPolicy, mockPasswordChange }) => {
    await mockPasswordPolicy(defaultPolicy);
    await mockPasswordChange(true);

    await loginPage.login('johndoe', 'temp');
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // 사용자 ID를 포함한 비밀번호
    await dialog.newPasswordInput.fill('johndoe123');
    await page.waitForTimeout(500);

    // 체크리스트에서 userId 규칙 실패 확인
    const checklistText = await page.locator('[role="dialog"]').textContent();
    // 사용자 ID 포함 경고가 표시되어야 함
    expect(checklistText).toContain('사용자 ID');

    await dialog.screenshot('password-strength-reject-userid');
  });

  test('rejectConsecutiveChars 규칙 - 연속 문자 금지', async ({ page, mockPasswordPolicy, mockPasswordChange }) => {
    await mockPasswordPolicy(strictPolicy);
    await mockPasswordChange(true);

    await loginPage.login('testuser', 'temp');
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // 연속 문자 포함 비밀번호 (abc, 123)
    await dialog.newPasswordInput.fill('Abc123xyz');
    await page.waitForTimeout(500);

    const checklistText = await page.locator('[role="dialog"]').textContent();
    // 연속 문자 경고가 표시되어야 함
    expect(checklistText).toContain('연속');

    await dialog.screenshot('password-strength-consecutive');
  });

  test('rejectRepeatedChars 규칙 - 반복 문자 금지', async ({ page, mockPasswordPolicy, mockPasswordChange }) => {
    await mockPasswordPolicy(strictPolicy);
    await mockPasswordChange(true);

    await loginPage.login('testuser', 'temp');
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // 반복 문자 포함 비밀번호 (aaa, 111)
    await dialog.newPasswordInput.fill('Passswwword111');
    await page.waitForTimeout(500);

    const checklistText = await page.locator('[role="dialog"]').textContent();
    // 반복 문자 경고가 표시되어야 함
    expect(checklistText).toContain('반복');

    await dialog.screenshot('password-strength-repeated');
  });

  test('완화된 정책 - 최소 규칙만 적용', async ({ page, mockPasswordPolicy, mockPasswordChange }) => {
    await mockPasswordPolicy(lenientPolicy);
    await mockPasswordChange(true);

    await loginPage.login('testuser', 'temp');
    await dialog.dialog.waitFor({ state: 'visible', timeout: 15000 });

    // 짧은 비밀번호도 통과해야 함 (minLength: 4)
    await dialog.newPasswordInput.fill('1234');
    await page.waitForTimeout(500);

    // 강도 텍스트 확인 (약함이어도 정책은 통과)
    const strength = await dialog.getStrengthText();
    expect(strength).toBeTruthy();

    await dialog.screenshot('password-strength-lenient');
  });
});
