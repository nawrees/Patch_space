import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent {
  readonly values = [
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
  ];
}
