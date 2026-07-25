import { Component, OnInit } from '@angular/core';
import { ApiService } from '../core/services/api.service';

// Defaults mirror the DB migration's defaults, so the page still renders
// sensibly even before the admin ever edits anything, or before the
// site_settings migration has been applied.
const DEFAULT_SETTINGS = {
  about_hero_title: 'Practicing security should feel like doing security.',
  about_hero_subtitle:
    'Patch Space is built on one idea: you don’t learn to find and fix vulnerabilities by ' +
    'reading about them — you learn by getting your hands on a real, breakable system.',
  about_values: [
    {
      icon: 'box',
      title: 'Real over simulated',
      body: 'Every lab is a real, isolated Docker container — not a video, not a quiz. You attack an actual running target.',
    },
    {
      icon: 'graduation-cap',
      title: 'Practice, not just theory',
      body: 'Courses exist to get you into a lab faster, not to replace one. Reading about SQL injection isn’t the same as exploiting it.',
    },
    {
      icon: 'users',
      title: 'People, not just content',
      body: 'Real tutors answer real questions. Streaks and badges track progress that’s actually yours.',
    },
  ],
  about_company_title: 'Built by Data do it',
  about_company_body:
    'Patch Space is developed and operated by Data do it, a team focused on building practical, ' +
    'hands-on tools for learning technical skills — starting with cybersecurity. We built the ' +
    'platform we wished existed when we were learning: fewer slides, more shells.',
  about_cta_title: 'Questions before you sign up?',
  about_cta_body: 'We’re happy to talk through what Patch Space does and doesn’t cover.',
};

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent implements OnInit {
  settings: typeof DEFAULT_SETTINGS = DEFAULT_SETTINGS;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getSiteSettings().subscribe({
      next: (r) => { this.settings = { ...DEFAULT_SETTINGS, ...r.settings }; },
      error: () => {}, // keep defaults if the API call fails
    });
  }
}
