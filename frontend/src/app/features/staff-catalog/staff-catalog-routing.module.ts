import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StaffCatalogComponent } from './staff-catalog/staff-catalog.component';
import { StaffCourseDetailComponent } from './staff-course-detail/staff-course-detail.component';

const routes: Routes = [
  { path: 'courses', component: StaffCatalogComponent },
  { path: 'course/:id', component: StaffCourseDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StaffCatalogRoutingModule {}
