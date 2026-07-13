import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'app-theme';
  isDark = true;

  constructor() {
    const saved = localStorage.getItem(this.KEY);
    this.isDark = saved !== 'light';
    this.apply();
  }

  toggle() {
    this.isDark = !this.isDark;
    localStorage.setItem(this.KEY, this.isDark ? 'dark' : 'light');
    this.apply();
  }

  private apply() {
    document.documentElement.classList.toggle('light-theme', !this.isDark);
  }
}
