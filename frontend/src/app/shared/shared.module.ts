import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { IconComponent } from './icon/icon.component';
import { PublicNavComponent } from './public-nav/public-nav.component';
import { NodeBackgroundComponent } from './node-background/node-background.component';

@NgModule({
  declarations: [NotificationBellComponent, IconComponent, PublicNavComponent, NodeBackgroundComponent],
  imports: [CommonModule, FormsModule, RouterModule],
  exports: [CommonModule, FormsModule, RouterModule, NotificationBellComponent, IconComponent, PublicNavComponent, NodeBackgroundComponent],
})
export class SharedModule {}
