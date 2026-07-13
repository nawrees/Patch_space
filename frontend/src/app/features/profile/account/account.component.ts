import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  profile: any = null;
  form = { full_name: '', bio: '', avatar_url: '' };
  saving = false;
  saved = false;
  errorMsg = '';
  imgError = false;

  constructor(private api: ApiService, private userSvc: UserService) {}

  ngOnInit() {
    this.userSvc.currentUser$.subscribe(cu => {
      if (!cu) return;
      this.profile = cu.profile;
      this.form = {
        full_name: cu.profile.full_name ?? '',
        bio:       cu.profile.bio       ?? '',
        avatar_url: cu.profile.avatar_url ?? '',
      };
    });
  }

  get initial(): string {
    return this.form.full_name?.trim()[0]?.toUpperCase()
      ?? this.profile?.full_name?.trim()[0]?.toUpperCase()
      ?? '?';
  }

  save() {
    this.saving = true;
    this.saved = false;
    this.errorMsg = '';

    this.api.updateProfile({
      full_name:  this.form.full_name.trim() || undefined,
      bio:        this.form.bio.trim()       || undefined,
      avatar_url: this.form.avatar_url.trim() || undefined,
    }).subscribe({
      next: r => {
        this.userSvc.patchProfile(r.profile);
        this.saved = true;
        this.saving = false;
        setTimeout(() => this.saved = false, 3000);
      },
      error: err => {
        this.errorMsg = err?.error?.error || 'Failed to save. Please try again.';
        this.saving = false;
      },
    });
  }
}
