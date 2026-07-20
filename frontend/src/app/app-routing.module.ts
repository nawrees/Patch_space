import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { ContactComponent } from './contact/contact.component';
import { authGuardFn, studentGuardFn, tutorGuardFn, adminGuardFn } from './core/guards/role.guard';

const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: '', loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule) },
  { path: 'student', canActivate: [studentGuardFn], loadChildren: () => import('./features/student/student.module').then(m => m.StudentModule) },
  { path: 'tutor',   canActivate: [tutorGuardFn],   loadChildren: () => import('./features/tutor/tutor.module').then(m => m.TutorModule) },
  { path: 'admin',   canActivate: [adminGuardFn],   loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule) },
  { path: 'manage',  canActivate: [tutorGuardFn],   loadChildren: () => import('./features/manage/manage.module').then(m => m.ManageModule) },
  { path: '',        canActivate: [authGuardFn],    loadChildren: () => import('./features/profile/profile.module').then(m => m.ProfileModule) },
  { path: 'unauthorized', component: UnauthorizedComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
