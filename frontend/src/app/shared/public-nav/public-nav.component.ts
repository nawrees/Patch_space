import { Component, Input } from '@angular/core';
import { UserService } from '../../core/services/user.service';

// Nav bar shared by the public pages (Home / About / Contact). A logged-out
// visitor gets the full public nav (brand + links + Login/Sign up) — the
// only nav on the page. A logged-in visitor already has their real app nav
// showing above this (AppComponent's own nav is always visible), so this
// renders as just a slim About/Contact sub-nav instead of repeating the
// brand or offering a redundant dashboard link.
@Component({
  selector: 'app-public-nav',
  templateUrl: './public-nav.component.html',
  styleUrls: ['./public-nav.component.css'],
})
export class PublicNavComponent {
  @Input() active: 'home' | 'about' | 'contact' | '' = '';

  constructor(private user: UserService) {}

  get isAuthenticated(): boolean {
    return this.user.getUserRole() !== null;
  }
}
