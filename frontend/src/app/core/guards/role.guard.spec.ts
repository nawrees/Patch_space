import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { authGuardFn, studentGuardFn, tutorGuardFn, adminGuardFn } from './role.guard';

describe('role guards', () => {
  let userService: { getUserRole: jest.Mock; isStudent: jest.Mock; isAdmin: jest.Mock };
  let router: { createUrlTree: jest.Mock };

  beforeEach(() => {
    userService = { getUserRole: jest.fn(), isStudent: jest.fn(), isAdmin: jest.fn() };
    router = { createUrlTree: jest.fn((path: string[]) => ({ urlTree: path })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
      ],
    });
  });

  describe('authGuardFn', () => {
    it('allows access when a role is present', () => {
      userService.getUserRole.mockReturnValue('student');
      const result = TestBed.runInInjectionContext(() => authGuardFn({} as never, {} as never));
      expect(result).toBe(true);
    });

    it('redirects to /login when there is no role', () => {
      userService.getUserRole.mockReturnValue(null);
      const result = TestBed.runInInjectionContext(() => authGuardFn({} as never, {} as never));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
      expect(result).toEqual({ urlTree: ['/login'] });
    });
  });

  describe('studentGuardFn', () => {
    it('allows students through', () => {
      userService.isStudent.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => studentGuardFn({} as never, {} as never));
      expect(result).toBe(true);
    });

    it('redirects non-students to /unauthorized', () => {
      userService.isStudent.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => studentGuardFn({} as never, {} as never));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toEqual({ urlTree: ['/unauthorized'] });
    });
  });

  describe('tutorGuardFn', () => {
    it.each(['tutor', 'admin'])('allows %s role through', (role) => {
      userService.getUserRole.mockReturnValue(role);
      const result = TestBed.runInInjectionContext(() => tutorGuardFn({} as never, {} as never));
      expect(result).toBe(true);
    });

    it('redirects students to /unauthorized', () => {
      userService.getUserRole.mockReturnValue('student');
      const result = TestBed.runInInjectionContext(() => tutorGuardFn({} as never, {} as never));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toEqual({ urlTree: ['/unauthorized'] });
    });
  });

  describe('adminGuardFn', () => {
    it('allows admins through', () => {
      userService.isAdmin.mockReturnValue(true);
      const result = TestBed.runInInjectionContext(() => adminGuardFn({} as never, {} as never));
      expect(result).toBe(true);
    });

    it('redirects non-admins to /unauthorized', () => {
      userService.isAdmin.mockReturnValue(false);
      const result = TestBed.runInInjectionContext(() => adminGuardFn({} as never, {} as never));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toEqual({ urlTree: ['/unauthorized'] });
    });
  });
});
