import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { isValidTunisianPhone } from '../../../core/utils/phone';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  profile: any = null;
  form = { firstName: '', lastName: '', bio: '', avatar_url: '', phone: '', address: '' };
  saving = false;
  saved = false;
  errorMsg = '';
  imgError = false;
  touched = false;

  pendingAvatarFile: File | null = null;
  avatarPreview: string | null = null;
  uploadingAvatar = false;

  constructor(private api: ApiService, private userSvc: UserService) {}

  ngOnInit() {
    this.userSvc.currentUser$.subscribe(cu => {
      if (!cu) return;
      this.profile = cu.profile;
      // full_name is stored as one field (same as signup builds it from
      // first_name + last_name) — split it back apart for the two inputs.
      const [firstName = '', ...rest] = (cu.profile.full_name ?? '').trim().split(/\s+/);
      this.form = {
        firstName,
        lastName: rest.join(' '),
        bio:       cu.profile.bio       ?? '',
        avatar_url: cu.profile.avatar_url ?? '',
        phone:     cu.profile.phone     ?? '',
        address:   cu.profile.address   ?? '',
      };
    });
  }

  get initial(): string {
    return this.form.firstName?.trim()[0]?.toUpperCase()
      ?? this.profile?.full_name?.trim()[0]?.toUpperCase()
      ?? '?';
  }

  get phoneValid(): boolean {
    return isValidTunisianPhone(this.form.phone);
  }

  get formValid(): boolean {
    return !!this.form.firstName.trim() && !!this.form.lastName.trim() && this.phoneValid;
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingAvatarFile = file;
    this.imgError = false;
    const reader = new FileReader();
    reader.onload = (e) => { this.avatarPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeAvatarSelection() {
    this.pendingAvatarFile = null;
    this.avatarPreview = null;
  }

  async save() {
    this.touched = true;
    if (!this.formValid) return;

    this.saving = true;
    this.saved = false;
    this.errorMsg = '';

    try {
      // A newly-picked photo takes priority over whatever's in the URL
      // field — upload it first so the profile update below carries the
      // real storage URL, not a stale one.
      if (this.pendingAvatarFile) {
        this.uploadingAvatar = true;
        const uploaded = await firstValueFrom(this.api.uploadAvatar(this.pendingAvatarFile));
        this.uploadingAvatar = false;
        this.userSvc.patchProfile(uploaded.profile);
        this.form.avatar_url = uploaded.profile.avatar_url ?? '';
        this.pendingAvatarFile = null;
        this.avatarPreview = null;
      }

      const fullName = `${this.form.firstName.trim()} ${this.form.lastName.trim()}`.trim();
      const r = await firstValueFrom(this.api.updateProfile({
        full_name:  fullName,
        bio:        this.form.bio.trim()       || undefined,
        avatar_url: this.form.avatar_url.trim() || undefined,
        phone:      this.form.phone.trim(),
        address:    this.form.address.trim()   || undefined,
      }));
      this.userSvc.patchProfile(r.profile);
      this.saved = true;
      setTimeout(() => this.saved = false, 3000);
    } catch (err: any) {
      this.uploadingAvatar = false;
      this.errorMsg = err?.error?.error || err?.error?.message || 'Failed to save. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}
