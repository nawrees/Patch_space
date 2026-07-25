import { Component, OnInit, HostListener, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css'],
})
export class NotificationBellComponent implements OnInit {
  open = false;
  notifications: any[] = [];
  unreadCount = 0;

  // Fires when this dropdown opens, so sibling overlays (profile menu, streak
  // popup) can close themselves — their own click handlers stop propagation
  // to avoid instantly self-closing, which also stops the shared
  // document-click listener from ever seeing the click, so they can't find
  // out about each other any other way.
  @Output() opened = new EventEmitter<void>();

  constructor(public notifSvc: NotificationService, private router: Router) {}

  ngOnInit() {
    this.notifSvc.notifications$.subscribe(n => (this.notifications = n));
    this.notifSvc.unreadCount$.subscribe(c => (this.unreadCount = c));
  }

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.opened.emit();
  }

  @HostListener('document:click')
  close() {
    this.open = false;
  }

  onNotificationClick(n: any) {
    this.notifSvc.markRead(n.id);
    this.open = false;
    this.router.navigateByUrl(this.notifSvc.getLink(n));
  }

  markAllRead(event: MouseEvent) {
    event.stopPropagation();
    this.notifSvc.markAllRead();
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
