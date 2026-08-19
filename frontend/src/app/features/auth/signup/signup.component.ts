import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { isValidTunisianPhone } from '../../../core/utils/phone';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent {
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  address = '';
  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  passwordTouched = false;
  confirmTouched = false;
  phoneTouched = false;

  constructor(private auth: AuthService, private router: Router) {}

  get pwChecks() {
    const p = this.password;
    return {
      length:  p.length >= 8,
      upper:   /[A-Z]/.test(p),
      lower:   /[a-z]/.test(p),
      number:  /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
  }

  get passwordValid(): boolean {
    return Object.values(this.pwChecks).every(Boolean);
  }

  get passwordsMatch(): boolean {
    return this.password.length > 0 && this.password === this.confirmPassword;
  }

  get phoneValid(): boolean {
    return isValidTunisianPhone(this.phone);
  }

  get strengthLevel(): number {
    return Object.values(this.pwChecks).filter(Boolean).length; // 0–4
  }

  get strengthLabel(): string {
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return this.password ? labels[this.strengthLevel] : '';
  }

  get strengthClass(): string {
    const classes = ['', 'pw-weak', 'pw-fair', 'pw-good', 'pw-strong'];
    return this.password ? classes[this.strengthLevel] : '';
  }

  async onSignUp() {
    this.passwordTouched = true;
    this.confirmTouched = true;
    this.phoneTouched = true;
    if (!this.passwordValid || !this.passwordsMatch || !this.phoneValid) return;

    this.loading = true;
    this.error = '';

    try {
      await this.auth.signUp(this.email, this.password, this.firstName.trim(), this.lastName.trim(), this.phone.trim(), this.address.trim());
      this.router.navigate(['/login'], {
        queryParams: { message: 'Check your email to confirm your account' },
      });
    } catch (err: any) {
      this.error = err.message || 'Sign up failed';
      this.loading = false;
    }
  }
}
