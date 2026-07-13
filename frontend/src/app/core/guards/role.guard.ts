import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({ providedIn: 'root' })
export class roleGuard {
  constructor(private user: UserService, private router: Router) {}

  canActivateStudent(): boolean {
    if (this.user.isStudent()) return true;
    this.router.navigate(['/unauthorized']);
    return false;
  }

  canActivateTutor(): boolean {
    const role = this.user.getUserRole();
    if (role === 'tutor' || role === 'admin') return true;
    this.router.navigate(['/unauthorized']);
    return false;
  }

  canActivateAdmin(): boolean {
    if (this.user.isAdmin()) return true;
    this.router.navigate(['/unauthorized']);
    return false;
  }
}

export const authGuardFn: CanActivateFn = () => {
  const userSvc = inject(UserService);
  const router = inject(Router);
  return userSvc.getUserRole() !== null ? true : router.createUrlTree(['/login']);
};

export const studentGuardFn: CanActivateFn = () => {
  const userSvc = inject(UserService);
  const router = inject(Router);
  return userSvc.isStudent() ? true : router.createUrlTree(['/unauthorized']);
};

export const tutorGuardFn: CanActivateFn = () => {
  const userSvc = inject(UserService);
  const router = inject(Router);
  const role = userSvc.getUserRole();
  return (role === 'tutor' || role === 'admin') ? true : router.createUrlTree(['/unauthorized']);
};

export const adminGuardFn: CanActivateFn = () => {
  const userSvc = inject(UserService);
  const router = inject(Router);
  return userSvc.isAdmin() ? true : router.createUrlTree(['/unauthorized']);
};
