import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { ThemeService } from './core/services/theme.service';
import { ApiService } from './core/services/api.service';
import { NotificationService } from './core/services/notification.service';
import { NotificationBellComponent } from './shared/notification-bell/notification-bell.component';

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
  longestStreak = 0;
  streakActiveToday = false;
  streakPopupOpen = false;
  profileLoadFailed = false;
  profileLoadRetrying = false;

  @ViewChild(NotificationBellComponent) notifBell?: NotificationBellComponent;

  // Pages a signed-out visitor is allowed to browse without being bounced to /login.
  private readonly publicPaths = ['/', '/login', '/signup', '/reset-password', '/about', '/contact'];
  // Of those, the ones an already-logged-in visitor should be sent away from
  // (straight to their dashboard) rather than shown again. "/" is deliberately
  // excluded — clicking the "Patch Space" brand should always show the real
  // Home page, logged in or not. The app's own nav stays visible there too
  // (see app.component.html) — only About/Contact collapse to a slim sub-nav
  // in that case, handled by PublicNavComponent.
  private readonly authEntryPaths = ['/login', '/signup'];

  constructor(
    private auth: AuthService,
    private user: UserService,
    private router: Router,
    public theme: ThemeService,
    private api: ApiService,
    private notifSvc: NotificationService,
  ) {}

  async ngOnInit() {
    // session$ emits twice on startup (getSession + onAuthStateChange INITIAL_SESSION).
    // Track previous state so loadUserProfile only runs once per login, not per emission.
    let sessionActive = false;

    this.auth.session$.subscribe((session) => {
      this.isAuthenticated = !!session;
      if (!session) {
        sessionActive = false;
        this.currentUser = null;
        this.isStudent = false;
        this.isTutor = false;
        this.isAdmin = false;
        // Only bounce to /login when leaving a page that actually needs a
        // session — the home page and the other auth pages should stay
        // browsable for signed-out visitors.
        if (!this.publicPaths.includes(this.currentPath())) {
          this.router.navigate(['/login']);
        }
      } else if (!sessionActive) {
        sessionActive = true;
        if (this.auth.isRecoveryMode()) {
          this.router.navigate(['/reset-password']);
        } else {
          this.loadUserProfile();
        }
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
      this.profileLoadFailed = false;
      // A returning, already-authenticated visitor landing on the public
      // marketing/auth pages should go straight to their own dashboard.
      if (this.authEntryPaths.includes(this.currentPath())) {
        if (this.isAdmin) this.router.navigate(['/admin']);
        else if (this.isTutor) this.router.navigate(['/tutor']);
        else this.router.navigate(['/student']);
      }
      if (this.isStudent) {
        this.api.getStreak().subscribe({
          next: s => {
            this.streak = s.current_streak;
            this.longestStreak = s.longest_streak;
            this.streakActiveToday = s.active_today;
          },
          error: () => {},
        });
      }
      this.notifSvc.load();
      this.notifSvc.subscribe(current.user.id);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Do not sign out here — a transient API failure should not end the session.
      // Surface it instead, so the user isn't silently stuck with a blank profile.
      this.profileLoadFailed = true;
    } finally {
      this.profileLoadRetrying = false;
    }
  }

  async retryLoadProfile() {
    this.profileLoadRetrying = true;
    await this.loadUserProfile();
  }

  private currentPath(): string {
    return this.router.url.split('?')[0].split('#')[0];
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeOverlays();
  }

  // Streak popup, notification bell, and profile dropdown each stop click
  // propagation on their own trigger (so clicking them doesn't instantly
  // self-close via the document listener above) — which also means none of
  // them can find out about each other through that listener. So opening any
  // one of them explicitly closes the other two here instead.
  private closeOverlays() {
    this.dropdownOpen = false;
    this.streakPopupOpen = false;
    this.notifBell?.close();
  }

  toggleStreakPopup(event: MouseEvent) {
    event.stopPropagation();
    const opening = !this.streakPopupOpen;
    this.closeOverlays();
    this.streakPopupOpen = opening;
  }

  toggleProfileDropdown() {
    const opening = !this.dropdownOpen;
    this.closeOverlays();
    this.dropdownOpen = opening;
  }

  onNotificationBellOpened() {
    this.dropdownOpen = false;
    this.streakPopupOpen = false;
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
