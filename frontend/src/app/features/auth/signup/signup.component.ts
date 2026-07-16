import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent {
  fullName = '';
  email = '';
  password = '';
  loading = false;
  error = '';
  passwordTouched = false;

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
    if (!this.passwordValid) return;

    this.loading = true;
    this.error = '';

    try {
      await this.auth.signUp(this.email, this.password, this.fullName);
      this.router.navigate(['/login'], {
        queryParams: { message: 'Check your email to confirm your account' },
      });
    } catch (err: any) {
      this.error = err.message || 'Sign up failed';
      this.loading = false;
    }
  }
}
