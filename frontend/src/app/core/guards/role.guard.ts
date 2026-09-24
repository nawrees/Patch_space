import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';

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
