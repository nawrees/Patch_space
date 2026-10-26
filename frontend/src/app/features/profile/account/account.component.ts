import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { isValidTunisianPhone } from '../../../core/utils/phone';

@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.css'],
    standalone: false
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

  // Change Password — a separate form/state from the profile fields above,
  // so saving one never touches the other.
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmNewPassword = false;
  pwTouched = false;
  changingPassword = false;
  pwSuccess = false;
  pwError = '';

  constructor(private api: ApiService, private auth: AuthService, private userSvc: UserService) {}

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

  get pwChecks() {
    const p = this.newPassword;
    return {
      length:  p.length >= 8,
      upper:   /[A-Z]/.test(p),
      lower:   /[a-z]/.test(p),
      number:  /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
  }

  get newPasswordValid(): boolean {
    return Object.values(this.pwChecks).every(Boolean);
  }

  get newPasswordsMatch(): boolean {
    return this.newPassword === this.confirmNewPassword && this.confirmNewPassword.length > 0;
  }

  get strengthLevel(): number {
    return Object.values(this.pwChecks).filter(Boolean).length;
  }

  get strengthLabel(): string {
    return this.newPassword ? ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][this.strengthLevel] : '';
  }

  get strengthClass(): string {
    return this.newPassword ? ['', 'pw-weak', 'pw-fair', 'pw-good', 'pw-strong', 'pw-strong'][this.strengthLevel] : '';
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

  toggleCurrentPasswordVisibility() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmNewPasswordVisibility() {
    this.showConfirmNewPassword = !this.showConfirmNewPassword;
  }

  async changePassword() {
    this.pwTouched = true;
    this.pwError = '';
    this.pwSuccess = false;

    if (!this.currentPassword.trim()) {
      this.pwError = 'Enter your current password';
      return;
    }
    if (!this.newPasswordValid || !this.newPasswordsMatch) return;

    this.changingPassword = true;

    // updateUser() only needs a valid session, which a hijacked or
    // unattended logged-in tab already has — re-checking the current
    // password here is what stops that session from being enough on its
    // own to lock the real owner out.
    try {
      await this.auth.signIn(this.profile.email, this.currentPassword);
    } catch {
      this.pwError = 'Current password is incorrect';
      this.changingPassword = false;
      return;
    }

    try {
      await this.auth.updatePassword(this.newPassword);
      this.pwSuccess = true;
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.pwTouched = false;
      setTimeout(() => this.pwSuccess = false, 4000);
    } catch (err: any) {
      this.pwError = err.message || 'Failed to update password. Please try again.';
    } finally {
      this.changingPassword = false;
    }
  }
}
