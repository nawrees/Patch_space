import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  readonly features = [
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
