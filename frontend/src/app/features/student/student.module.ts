import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { StudentRoutingModule } from './student-routing.module';
import { StudentDashboardComponent } from './dashboard/dashboard.component';
import { CourseCatalogComponent } from './catalog/catalog.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { LessonDetailComponent } from './lesson-detail/lesson-detail.component';
import { LabComponent } from './lab/lab.component';
import { ContinueLearningComponent } from './continue-learning/continue-learning.component';
import { RecommendationsComponent } from './recommendations/recommendations.component';
import { StudyCalendarComponent } from './study-calendar/study-calendar.component';

@NgModule({
  declarations: [
    StudentDashboardComponent,
    CourseCatalogComponent,
    CourseDetailComponent,
    LessonDetailComponent,
    LabComponent,
    ContinueLearningComponent,
    RecommendationsComponent,
    StudyCalendarComponent,
  ],
  imports: [SharedModule, StudentRoutingModule],
})
export class StudentModule {}
