import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileComponent } from './profile/profile.component';
import { AccountComponent } from './account/account.component';
import { SavedComponent } from './saved/saved.component';
import { BadgesComponent } from './badges/badges.component';

const routes: Routes = [
  { path: 'profile', component: ProfileComponent },
  { path: 'account', component: AccountComponent },
  { path: 'saved',   component: SavedComponent   },
  { path: 'badges',  component: BadgesComponent  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}
