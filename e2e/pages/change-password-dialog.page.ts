import type { Page, Locator } from '@playwright/test';

/**
 * 비밀번호 변경 다이얼로그 Page Object Model
 * 3가지 모드: manual, first-login, expired
 */
export class ChangePasswordDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly title: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly strengthMeter: Locator;
  readonly strengthText: Locator;
  readonly alertMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.title = page.locator('[role="dialog"] h2, [role="dialog"] [class*="DialogTitle"]');
    this.currentPasswordInput = page.getByPlaceholder('현재 비밀번호 입력');
    this.newPasswordInput = page.getByPlaceholder('새 비밀번호 입력');
    this.confirmPasswordInput = page.getByPlaceholder('새 비밀번호 다시 입력');
    this.submitButton = page.getByRole('button', { name: '비밀번호 변경' });
    this.cancelButton = page.getByRole('button', { name: '취소' });
    this.strengthMeter = page.locator('.ant-progress');
    this.strengthText = page.locator('text=/약함|보통|강함|매우 강함/');
    this.alertMessage = page.locator('[role="dialog"] [role="alert"]');
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async getDialogTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  async fillPasswords(current: string | null, newPwd: string, confirm: string) {
    if (current !== null) {
      await this.currentPasswordInput.fill(current);
    }
    await this.newPasswordInput.fill(newPwd);
    await this.confirmPasswordInput.fill(confirm);
  }

  async clickSubmit() {
    await this.submitButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async getStrengthText(): Promise<string> {
    try {
      return (await this.strengthText.textContent()) || '';
    } catch {
      return '';
    }
  }

  async getAlertMessage(): Promise<string> {
    try {
      return (await this.alertMessage.textContent()) || '';
    } catch {
      return '';
    }
  }

  async isCancelButtonVisible(): Promise<boolean> {
    try {
      return await this.cancelButton.isVisible();
    } catch {
      return false;
    }
  }

  async isCurrentPasswordVisible(): Promise<boolean> {
    try {
      return await this.currentPasswordInput.isVisible();
    } catch {
      return false;
    }
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}
