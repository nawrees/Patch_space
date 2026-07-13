import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { StaffCatalogRoutingModule } from './staff-catalog-routing.module';
import { StaffCatalogComponent } from './staff-catalog/staff-catalog.component';
import { StaffCourseDetailComponent } from './staff-course-detail/staff-course-detail.component';

@NgModule({
  declarations: [StaffCatalogComponent, StaffCourseDetailComponent],
  imports: [SharedModule, StaffCatalogRoutingModule],
})
export class StaffCatalogModule {}
