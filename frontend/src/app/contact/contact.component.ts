import { Component, OnInit } from '@angular/core';
import { ApiService } from '../core/services/api.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
})
export class ContactComponent implements OnInit {
  contactEmail = 'contact@patchspace.io'; // fallback until settings load (or if the call fails)

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getSiteSettings().subscribe({
      next: (r) => { if (r.settings?.contact_email) this.contactEmail = r.settings.contact_email; },
      error: () => {},
    });
  }
}
