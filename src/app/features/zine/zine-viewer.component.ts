import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ZineCollection } from '../../core/models/zine.model';

@Component({
  selector: 'app-zine-viewer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="max-w-4xl mx-auto px-4 sm:px-6 py-12" aria-label="Visual Zine Story">
      <nav class="mb-8">
        <a routerLink="/" class="text-xs font-mono text-neutral-400 hover:text-neutral-100 uppercase tracking-widest">
          &larr; Back to Gallery
        </a>
      </nav>

      <header class="mb-12 border-b border-neutral-800 pb-8 text-center">
        <span class="text-xs font-mono uppercase tracking-widest text-emerald-400">Visual Zine</span>
        <h1 class="text-3xl sm:text-4xl font-serif text-neutral-100 mt-2">{{ zine()?.title || 'Story Mode' }}</h1>
        @if (zine()?.subtitle) {
          <p class="text-sm font-sans text-neutral-400 mt-2">{{ zine()?.subtitle }}</p>
        }
      </header>

      <section class="space-y-12">
        @if (zine()?.photographerStatement) {
          <div class="glass-panel p-6 rounded-lg italic text-neutral-300 font-serif text-lg leading-relaxed border-l-2 border-emerald-400">
            "{{ zine()?.photographerStatement }}"
          </div>
        }

        <div class="text-center py-12 text-neutral-500 font-mono text-sm">
          Zine narrative editorial layout active.
        </div>
      </section>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class ZineViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly zine = signal<ZineCollection | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') || 'default';
      this.zine.set({
        id,
        slug: id,
        title: 'Light in Solitude',
        subtitle: 'A monochromatic exploration of dawn geometry',
        photographerStatement: 'In the earliest hours, light does not ask to be understood; it merely reveals the bones of the city.',
        coverPhotoId: 'sample-01',
        publishedDate: '2026-11-10',
        pages: [],
      });
    });
  }
}

