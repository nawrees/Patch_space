import { Injectable } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class authGuard {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}

export const authGuardFn: CanActivateFn = (route, state) => {
  const auth = new AuthService();
  const router = new Router();
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
