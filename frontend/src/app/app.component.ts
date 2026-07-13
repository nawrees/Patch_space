import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { ThemeService } from './core/services/theme.service';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  isAuthenticated = false;
  currentUser: any = null;
  isStudent = false;
  isTutor = false;
  isAdmin = false;
  dropdownOpen = false;
  soundEnabled = localStorage.getItem('sound-enabled') !== 'false';
  streak = 0;
  streakActiveToday = false;

  constructor(
    private auth: AuthService,
    private user: UserService,
    private router: Router,
    public theme: ThemeService,
    private api: ApiService,
  ) {}

  async ngOnInit() {
    this.auth.session$.subscribe((session) => {
      this.isAuthenticated = !!session;
      if (!session) {
        this.router.navigate(['/login']);
      } else {
        this.loadUserProfile();
      }
    });
  }

  async loadUserProfile() {
    try {
      const current = await this.user.fetchCurrentUser();
      this.currentUser = current;
      this.isStudent = this.user.isStudent();
      this.isTutor = this.user.isTutor();
      this.isAdmin = this.user.isAdmin();
      if (this.isStudent) {
        this.api.getStreak().subscribe(s => {
          this.streak = s.current_streak;
          this.streakActiveToday = s.active_today;
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.auth.signOut();
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.dropdownOpen = false;
  }

  get avatarInitial(): string {
    const name = this.currentUser?.profile?.full_name;
    return name ? name.trim()[0].toUpperCase() : '?';
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('sound-enabled', String(this.soundEnabled));
  }

  async onLogout() {
    this.dropdownOpen = false;
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
