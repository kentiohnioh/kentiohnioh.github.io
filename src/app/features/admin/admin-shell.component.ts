import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-label="Admin Darkroom Studio">
      <header class="flex items-center justify-between pb-6 mb-8 border-b border-neutral-800">
        <div>
          <span class="text-xs font-mono uppercase tracking-widest text-warm-amber">Local Admin Studio</span>
          <h1 class="text-2xl font-serif text-neutral-100 mt-1">Digital Darkroom & Ingest</h1>
        </div>
        <a routerLink="/" class="text-xs font-mono text-neutral-400 hover:text-neutral-100 uppercase tracking-widest">
          &larr; View Public Site
        </a>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 rounded-lg space-y-3">
          <h2 class="text-xs font-mono uppercase tracking-wider text-emerald-400">1. Raw Ingest</h2>
          <p class="text-sm text-neutral-400">
            Drop raw photographs for automated EXIF extraction, P3/sRGB conversion, and multi-resolution AVIF ladder encoding.
          </p>
        </div>

        <div class="glass-panel p-6 rounded-lg space-y-3">
          <h2 class="text-xs font-mono uppercase tracking-wider text-ice-blue">2. 12-Zone Retouch</h2>
          <p class="text-sm text-neutral-400">
            Partition of unity anatomical segmentation: hair, skin, eye suite, teeth, and background protection.
          </p>
        </div>

        <div class="glass-panel p-6 rounded-lg space-y-3">
          <h2 class="text-xs font-mono uppercase tracking-wider text-warm-amber">3. Cloud Publish</h2>
          <p class="text-sm text-neutral-400">
            Hugging Face Dataset commit + mirror verification with SHA-256 and CORS integrity gates.
          </p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class AdminShellComponent {}
