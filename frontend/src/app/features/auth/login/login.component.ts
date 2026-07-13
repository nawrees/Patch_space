import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private auth: AuthService,
    private user: UserService,
    private router: Router
  ) {}

  async onLogin() {
    this.loading = true;
    this.error = '';

    try {
      await this.auth.signIn(this.email, this.password);
      const current = await this.user.fetchCurrentUser();

      // Redirect based on role
      const role = current.profile.role;
      if (role === 'admin') this.router.navigate(['/admin']);
      else if (role === 'tutor') this.router.navigate(['/tutor']);
      else this.router.navigate(['/student']);
    } catch (err: any) {
      this.error = err.message || 'Sign in failed';
      this.loading = false;
    }
  }
}
