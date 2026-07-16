import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { IconComponent } from './icon/icon.component';

@NgModule({
  declarations: [NotificationBellComponent, IconComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [CommonModule, FormsModule, RouterModule, NotificationBellComponent, IconComponent],
})
export class SharedModule {}
