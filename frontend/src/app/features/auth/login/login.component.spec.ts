import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let auth: {
    client: { rpc: jest.Mock };
    signIn: jest.Mock;
    resetPassword: jest.Mock;
  };
  let user: { fetchCurrentUser: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    auth = {
      client: { rpc: jest.fn() },
      signIn: jest.fn(),
      resetPassword: jest.fn(),
    };
    user = { fetchCurrentUser: jest.fn() };
    router = { navigate: jest.fn().mockResolvedValue(true) };

    component = new LoginComponent(auth as never, user as never, router as never);
    component.email = 'alice@example.com';
    component.password = 'correct-horse';
  });

  describe('onLogin — form validation', () => {
    it('rejects an empty form before calling anything', async () => {
      component.email = '';
      component.password = '';
      await component.onLogin();
      expect(component.error).toBe('Enter your email and password');
      expect(auth.client.rpc).not.toHaveBeenCalled();
    });
  });

  describe('onLogin — already locked', () => {
    it('shows the lockout screen without attempting sign-in', async () => {
      const lockedUntil = new Date(Date.now() + 5 * 60000).toISOString();
      auth.client.rpc.mockResolvedValueOnce({ data: lockedUntil, error: null });

      await component.onLogin();

      expect(auth.client.rpc).toHaveBeenCalledWith('check_login_locked', {
        p_email: 'alice@example.com',
      });
      expect(auth.signIn).not.toHaveBeenCalled();
      expect(component.isLocked).toBe(true);
      expect(component.lockedUntil).toEqual(new Date(lockedUntil));
      expect(component.loading).toBe(false);
    });
  });

  describe('onLogin — successful sign-in', () => {
    beforeEach(() => {
      // check_login_locked → not locked
      auth.client.rpc.mockResolvedValueOnce({ data: null, error: null });
    });

    it.each([
      ['admin', '/admin'],
      ['tutor', '/tutor'],
      ['student', '/student'],
    ])('navigates to %s for role %s', async (role, path) => {
      auth.signIn.mockResolvedValue({});
      // clear_login_attempts
      auth.client.rpc.mockResolvedValueOnce({ data: null, error: null });
      user.fetchCurrentUser.mockResolvedValue({ profile: { role } });

      await component.onLogin();

      expect(auth.client.rpc).toHaveBeenCalledWith('clear_login_attempts', {
        p_email: 'alice@example.com',
      });
      expect(router.navigate).toHaveBeenCalledWith([path]);
    });
  });

  describe('onLogin — failed sign-in', () => {
    beforeEach(() => {
      // check_login_locked → not locked
      auth.client.rpc.mockResolvedValueOnce({ data: null, error: null });
    });

    it('shows a network error and does not record an attempt on connectivity failure', async () => {
      auth.signIn.mockRejectedValue({ name: 'AuthRetryableFetchError', message: 'offline' });

      await component.onLogin();

      expect(component.error).toBe('Network error — check your connection and try again.');
      // Only the initial check_login_locked call — no record_failed_login.
      expect(auth.client.rpc).toHaveBeenCalledTimes(1);
    });

    it('shows an error and increments the attempt count on wrong credentials', async () => {
      auth.signIn.mockRejectedValue({ message: 'Invalid login credentials' });
      auth.client.rpc.mockResolvedValueOnce({
        data: { failed_count: 2, locked_until: null },
        error: null,
      });

      await component.onLogin();

      expect(auth.client.rpc).toHaveBeenCalledWith('record_failed_login', {
        p_email: 'alice@example.com',
      });
      expect(component.lastFailedCount).toBe(2);
      expect(component.attemptsLeft).toBe(1);
      expect(component.isLocked).toBe(false);
      expect(component.error).toBe('Invalid login credentials');
    });

    it('locks the account once record_failed_login reports a lock', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60000).toISOString();
      auth.signIn.mockRejectedValue({ message: 'Invalid login credentials' });
      auth.client.rpc.mockResolvedValueOnce({
        data: { failed_count: 3, locked_until: lockedUntil },
        error: null,
      });

      await component.onLogin();

      expect(component.isLocked).toBe(true);
      expect(component.lockedUntil).toEqual(new Date(lockedUntil));
    });

    it('falls back to the auth error if the record_failed_login RPC itself fails', async () => {
      auth.signIn.mockRejectedValue({ message: 'Invalid login credentials' });
      auth.client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'network blip' } });

      await component.onLogin();

      expect(component.isLocked).toBe(false);
      expect(component.error).toBe('Invalid login credentials');
    });
  });

  describe('onForgotPassword', () => {
    it('requires an email first', async () => {
      component.email = '';
      await component.onForgotPassword();
      expect(component.error).toBe('Enter your email address above first');
      expect(auth.resetPassword).not.toHaveBeenCalled();
    });

    it('sends the reset email and flips resetEmailSent', async () => {
      auth.resetPassword.mockResolvedValue(undefined);
      await component.onForgotPassword();
      expect(auth.resetPassword).toHaveBeenCalledWith('alice@example.com');
      expect(component.resetEmailSent).toBe(true);
      expect(component.loading).toBe(false);
    });

    it('surfaces an error if sending fails', async () => {
      auth.resetPassword.mockRejectedValue({ message: 'SMTP down' });
      await component.onForgotPassword();
      expect(component.error).toBe('SMTP down');
    });
  });

  describe('unlockAndRetry', () => {
    it('keeps the lockout up if the account is genuinely still locked', async () => {
      component.isLocked = true;
      const lockedUntil = new Date(Date.now() + 2 * 60000).toISOString();
      auth.client.rpc.mockResolvedValueOnce({ data: lockedUntil, error: null });

      await component.unlockAndRetry();

      expect(component.isLocked).toBe(true);
      expect(component.lockedUntil).toEqual(new Date(lockedUntil));
    });

    it('clears the lockout once the real window has passed', async () => {
      component.isLocked = true;
      component.lockedUntil = new Date();
      auth.client.rpc.mockResolvedValueOnce({ data: null, error: null });

      await component.unlockAndRetry();

      expect(component.isLocked).toBe(false);
      expect(component.lockedUntil).toBeNull();
    });
  });

  describe('misc UI state', () => {
    it('togglePasswordVisibility flips showPassword', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
    });

    it('lockedMinutesRemaining is 0 with no active lock', () => {
      expect(component.lockedMinutesRemaining).toBe(0);
    });

    it('lockedMinutesRemaining rounds up to at least 1 minute', () => {
      component.lockedUntil = new Date(Date.now() + 10_000); // 10s left
      expect(component.lockedMinutesRemaining).toBe(1);
    });
  });
});
