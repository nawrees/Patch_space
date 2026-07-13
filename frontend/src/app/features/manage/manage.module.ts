import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ManageRoutingModule } from './manage-routing.module';
import { CourseManageComponent } from './course-manage/course-manage.component';
import { CourseContentComponent } from './course-content/course-content.component';

@NgModule({
  declarations: [CourseManageComponent, CourseContentComponent],
  imports: [SharedModule, ManageRoutingModule],
})
export class ManageModule {}
