import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AUTHOR_NAME, COPYRIGHT_NOTICE } from './core/constants/site.constants';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  readonly authorName = AUTHOR_NAME;
  readonly copyrightNotice = COPYRIGHT_NOTICE;
  readonly toastMessage = signal<string | null>(null);

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.closest('[role="img"]') || target.closest('.protected-art'))) {
      event.preventDefault();
      this.showToast('© Theng Nioh — protected artwork. Contact me for licensing.');
    }
  }

  showToast(message: string): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMessage.set(message);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }
}
