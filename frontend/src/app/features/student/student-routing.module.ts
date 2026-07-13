import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentDashboardComponent } from './dashboard/dashboard.component';
import { CourseCatalogComponent } from './catalog/catalog.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { LessonDetailComponent } from './lesson-detail/lesson-detail.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: StudentDashboardComponent },
  { path: 'courses', component: CourseCatalogComponent },
  { path: 'catalog', component: CourseCatalogComponent },
  { path: 'course/:id', component: CourseDetailComponent },
  { path: 'lesson/:id', component: LessonDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentRoutingModule {}
