import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CourseManageComponent } from './course-manage/course-manage.component';
import { CourseContentComponent } from './course-content/course-content.component';

const routes: Routes = [
  { path: 'courses', component: CourseManageComponent },
  { path: 'courses/:id/content', component: CourseContentComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManageRoutingModule {}
