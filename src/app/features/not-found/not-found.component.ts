import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="max-w-md mx-auto px-4 py-24 text-center">
      <span class="text-xs font-mono uppercase tracking-widest text-safelight-red">Error 404</span>
      <h1 class="text-3xl font-serif text-neutral-100 mt-2 mb-4">Photograph Not Found</h1>
      <p class="text-sm font-sans text-neutral-400 mb-8 leading-relaxed">
        The requested image or archive destination does not exist or may have been repositioned.
      </p>
      <a
        routerLink="/"
        class="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-md text-xs font-mono uppercase tracking-wider transition-colors inline-block"
      >
        Return to Gallery
      </a>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class NotFoundComponent {}
