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
  firstNameTouched = false;
  lastNameTouched = false;
  emailTouched = false;
  showPassword = false;
  showConfirmPassword = false;
  acceptedTerms = false;
  termsTouched = false;

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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSignUp() {
    const firstName = this.firstName.trim();
    const lastName = this.lastName.trim();
    const email = this.email.trim();
    const phone = this.phone.trim();

    // Validate in field order and stop at the first problem — lighting up
    // every missing field at once on a first submit attempt is overwhelming,
    // so only the first one is revealed; fixing it and resubmitting reveals
    // the next, if any.
    if (!firstName)          { this.firstNameTouched = true; return; }
    if (!lastName)           { this.lastNameTouched = true; return; }
    if (!email)              { this.emailTouched = true; return; }
    if (!phone)              { this.phoneTouched = true; return; }
    if (!this.phoneValid)    { this.phoneTouched = true; return; }
    if (!this.passwordValid) { this.passwordTouched = true; return; }
    if (!this.passwordsMatch) { this.confirmTouched = true; return; }
    if (!this.acceptedTerms) { this.termsTouched = true; return; }

    this.loading = true;
    this.error = '';

    try {
      await this.auth.signUp(email, this.password, firstName, lastName, phone, this.address.trim());
      this.router.navigate(['/login'], {
        queryParams: { message: 'Check your email to confirm your account' },
      });
    } catch (err: any) {
      this.error = err.message || 'Sign up failed';
      this.loading = false;
    }
  }
}
