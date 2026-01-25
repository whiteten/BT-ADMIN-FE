import type { Page, Locator } from '@playwright/test';

/**
 * 로그인 페이지 Page Object Model
 * 로그인 폼 상호작용 및 에러 상태 검증
 */
export class LoginPage {
  readonly page: Page;
  readonly userIdInput: Locator;
  readonly passwordInput: Locator;
  readonly tenantInput: Locator;
  readonly loginButton: Locator;
  readonly errorAlert: Locator;
  readonly accountLockedAlert: Locator;
  readonly countdownTimer: Locator;
  readonly dormantAlert: Locator;
  readonly disabledAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userIdInput = page.locator('input[placeholder="아이디"]');
    this.passwordInput = page.locator('input[placeholder="비밀번호"]');
    this.tenantInput = page.locator('input[placeholder="테넌트명"]');
    this.loginButton = page.locator('button[type="submit"]');
    this.errorAlert = page.locator('[role="alert"]');
    this.accountLockedAlert = page.getByText('계정 잠금', { exact: true });
    this.countdownTimer = page.locator('[role="alert"]').locator('text=/\\d+:\\d{2}/').first();
    this.dormantAlert = page.getByText('휴면 계정', { exact: true });
    this.disabledAlert = page.getByText('비활성화 계정', { exact: true });
  }

  async goto() {
    await this.page.goto('/');
  }

  async fillLoginForm(userId: string, password: string) {
    await this.userIdInput.clear();
    await this.userIdInput.fill(userId);
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async login(userId: string, password: string) {
    await this.fillLoginForm(userId, password);
    await this.clickLogin();
  }

  async waitForErrorAlert() {
    await this.errorAlert.first().waitFor({ state: 'visible', timeout: 5000 });
  }

  async getErrorMessage(): Promise<string> {
    return (await this.errorAlert.first().textContent()) || '';
  }

  async getRemainingAttempts(): Promise<number | null> {
    const text = await this.getErrorMessage();
    const match = text.match(/남은 시도 횟수:\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled();
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}
