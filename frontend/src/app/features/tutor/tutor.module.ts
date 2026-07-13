import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { TutorRoutingModule } from './tutor-routing.module';
import { TutorDashboardComponent } from './dashboard/dashboard.component';
import { DropOffComponent } from './drop-off/drop-off.component';
import { QaModerationComponent } from './qa-moderation/qa-moderation.component';
import { StudentProgressComponent } from './student-progress/student-progress.component';

@NgModule({
  declarations: [
    TutorDashboardComponent,
    DropOffComponent,
    QaModerationComponent,
    StudentProgressComponent,
  ],
  imports: [SharedModule, TutorRoutingModule],
})
export class TutorModule {}
