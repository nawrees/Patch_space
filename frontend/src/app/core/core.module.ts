import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ApiService } from './services/api.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

@NgModule({
  imports: [CommonModule, HttpClientModule],
  providers: [
    AuthService,
    UserService,
    ApiService,
    authGuard,
    roleGuard,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
})
export class CoreModule {}
