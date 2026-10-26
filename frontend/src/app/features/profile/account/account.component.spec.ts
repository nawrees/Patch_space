import { of } from 'rxjs';
import { AccountComponent } from './account.component';

describe('AccountComponent — Change Password', () => {
  let component: AccountComponent;
  let api: { updateProfile: jest.Mock; uploadAvatar: jest.Mock };
  let auth: { signIn: jest.Mock; updatePassword: jest.Mock };
  let userSvc: { currentUser$: unknown; patchProfile: jest.Mock };

  beforeEach(() => {
    api = { updateProfile: jest.fn(), uploadAvatar: jest.fn() };
    auth = { signIn: jest.fn(), updatePassword: jest.fn() };
    userSvc = {
      currentUser$: of({
        profile: { full_name: 'Alice Doe', email: 'alice@example.com', bio: '', avatar_url: '', phone: '', address: '' },
      }),
      patchProfile: jest.fn(),
    };

    component = new AccountComponent(api as never, auth as never, userSvc as never);
    component.ngOnInit();
    component.currentPassword = 'old-correct-pw';
    component.newPassword = 'NewStrong1!';
    component.confirmNewPassword = 'NewStrong1!';
  });

  it('requires the current password before attempting anything', async () => {
    component.currentPassword = '';
    await component.changePassword();

    expect(component.pwError).toBe('Enter your current password');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('rejects a new password that fails the strength rules', async () => {
    component.newPassword = 'weak';
    component.confirmNewPassword = 'weak';
    await component.changePassword();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(component.pwTouched).toBe(true);
  });

  it('rejects mismatched new/confirm passwords', async () => {
    component.confirmNewPassword = 'Different1!';
    await component.changePassword();

    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('shows "Current password is incorrect" without touching updatePassword when re-auth fails', async () => {
    auth.signIn.mockRejectedValue({ message: 'Invalid login credentials' });

    await component.changePassword();

    expect(auth.signIn).toHaveBeenCalledWith('alice@example.com', 'old-correct-pw');
    expect(auth.updatePassword).not.toHaveBeenCalled();
    expect(component.pwError).toBe('Current password is incorrect');
    expect(component.changingPassword).toBe(false);
  });

  it('updates the password and clears the form on success', async () => {
    auth.signIn.mockResolvedValue({});
    auth.updatePassword.mockResolvedValue(undefined);

    await component.changePassword();

    expect(auth.updatePassword).toHaveBeenCalledWith('NewStrong1!');
    expect(component.pwSuccess).toBe(true);
    expect(component.pwError).toBe('');
    expect(component.currentPassword).toBe('');
    expect(component.newPassword).toBe('');
    expect(component.confirmNewPassword).toBe('');
    expect(component.changingPassword).toBe(false);
  });

  it('surfaces the error and keeps the form if updatePassword itself fails', async () => {
    auth.signIn.mockResolvedValue({});
    auth.updatePassword.mockRejectedValue({ message: 'Password is too similar to the old one' });

    await component.changePassword();

    expect(component.pwError).toBe('Password is too similar to the old one');
    expect(component.pwSuccess).toBe(false);
    expect(component.newPassword).toBe('NewStrong1!');
  });

  describe('strength indicator', () => {
    it('reports every rule for a fully compliant password', () => {
      component.newPassword = 'NewStrong1!';
      expect(component.newPasswordValid).toBe(true);
      expect(component.strengthLevel).toBe(5);
      expect(component.strengthLabel).toBe('Strong');
    });

    it('flags a password missing a special character and number', () => {
      component.newPassword = 'NewPassword';
      expect(component.pwChecks.special).toBe(false);
      expect(component.pwChecks.number).toBe(false);
      expect(component.newPasswordValid).toBe(false);
    });
  });

  describe('visibility toggles', () => {
    it('toggleCurrentPasswordVisibility flips showCurrentPassword', () => {
      expect(component.showCurrentPassword).toBe(false);
      component.toggleCurrentPasswordVisibility();
      expect(component.showCurrentPassword).toBe(true);
    });

    it('toggleNewPasswordVisibility flips showNewPassword', () => {
      component.toggleNewPasswordVisibility();
      expect(component.showNewPassword).toBe(true);
    });

    it('toggleConfirmNewPasswordVisibility flips showConfirmNewPassword', () => {
      component.toggleConfirmNewPasswordVisibility();
      expect(component.showConfirmNewPassword).toBe(true);
    });
  });
});
