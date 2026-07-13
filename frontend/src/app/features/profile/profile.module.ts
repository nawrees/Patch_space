import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileComponent } from './profile/profile.component';
import { AccountComponent } from './account/account.component';
import { SavedComponent } from './saved/saved.component';

@NgModule({
  declarations: [ProfileComponent, AccountComponent, SavedComponent],
  imports: [SharedModule, ProfileRoutingModule],
})
export class ProfileModule {}
