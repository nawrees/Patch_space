import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { SoundService } from './sound.service';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private _notifications = new BehaviorSubject<any[]>([]);
  notifications$ = this._notifications.asObservable();
  unreadCount$ = this.notifications$.pipe(map(n => n.filter(x => !x.is_read).length));

  private channel: any = null;

  constructor(private api: ApiService, private auth: AuthService, private sound: SoundService) {}

  load() {
    this.api.getNotifications().subscribe({
      next: d => this._notifications.next(d.notifications ?? []),
    });
  }

  subscribe(userId: string) {
    this.channel = this.auth.client
      .channel(`notif:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          this._notifications.next([payload.new, ...this._notifications.value]);
          this.sound.playNotification();
        }
      )
      .subscribe();
  }

  markRead(id: string) {
    this.api.markNotificationRead(id).subscribe();
    this._notifications.next(
      this._notifications.value.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  }

  markAllRead() {
    this.api.markAllNotificationsRead().subscribe();
    this._notifications.next(
      this._notifications.value.map(n => ({ ...n, is_read: true }))
    );
  }

  getLink(notification: any): string {
    if (notification.type === 'question_answered' && notification.lesson_id) {
      return `/student/lesson/${notification.lesson_id}`;
    }
    if (notification.type === 'question_asked') {
      return '/tutor/qa';
    }
    return '/';
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
  }
}
