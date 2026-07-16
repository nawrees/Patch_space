import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TutorDashboardComponent } from './dashboard/dashboard.component';
import { StudentProgressComponent } from './student-progress/student-progress.component';
import { QaModerationComponent } from './qa-moderation/qa-moderation.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: TutorDashboardComponent },
  { path: 'student/:id', component: StudentProgressComponent },
  { path: 'qa', component: QaModerationComponent },
  { path: '', loadChildren: () => import('../staff-catalog/staff-catalog.module').then(m => m.StaffCatalogModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TutorRoutingModule {}
