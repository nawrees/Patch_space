import { Component, OnInit } from '@angular/core';
import { UserService } from '../core/services/user.service';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  constructor(private user: UserService, private api: ApiService) {}

  // Defaults shown until (or if) the admin-editable settings load — keeps
  // the page from ever looking blank/broken on a slow or failed fetch.
  heroEyebrow = 'Cybersecurity training';
  heroTitle = 'Learn to break things safely.';
  heroSubtitle = "Hands-on courses and real Docker-backed labs for people who'd rather exploit a vulnerability than just read about one.";
  ctaTitle = 'Ready to start your first lab?';
  ctaBody = 'Create an account and start learning today.';

  ngOnInit() {
    this.api.getSiteSettings().subscribe({
      next: (data) => {
        const s = data.settings;
        if (s.home_hero_eyebrow) this.heroEyebrow = s.home_hero_eyebrow;
        if (s.home_hero_title) this.heroTitle = s.home_hero_title;
        if (s.home_hero_subtitle) this.heroSubtitle = s.home_hero_subtitle;
        if (s.home_cta_title) this.ctaTitle = s.home_cta_title;
        if (s.home_cta_body) this.ctaBody = s.home_cta_body;
        if (Array.isArray(s.home_features) && s.home_features.length) this.features = s.home_features;
      },
      error: () => {}, // keep the hardcoded defaults above
    });
  }

  // The nav no longer needs this (it's always visible, see AppComponent) —
  // but the hero and closing CTA are direct sign-up prompts, which don't
  // make sense to show someone who already has an account, whatever their role.
  get isAuthenticated(): boolean {
    return this.user.getUserRole() !== null;
  }

  get dashboardLink(): string {
    const role = this.user.getUserRole();
    if (role === 'admin') return '/admin';
    if (role === 'tutor') return '/tutor';
    return '/student';
  }

  features = [
    {
      icon: 'box',
      title: 'Hands-on Docker labs',
      body: 'Every lab boots a real, isolated container just for you — exploit it, break it, capture the flag. Nothing simulated.',
    },
    {
      icon: 'book-open',
      title: 'Structured courses',
      body: 'Lessons build on each other with tracked progress, so you always know what to tackle next.',
    },
    {
      icon: 'flame',
      title: 'Streaks & badges',
      body: 'Daily streaks and earned badges turn steady practice into visible progress.',
    },
    {
      icon: 'message-circle',
      title: 'Tutor support',
      body: 'Stuck on a lab? Ask a real tutor and get an answer, not a canned hint.',
    },
  ];
}
