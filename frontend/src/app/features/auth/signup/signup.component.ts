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

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async onSignUp() {
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

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
