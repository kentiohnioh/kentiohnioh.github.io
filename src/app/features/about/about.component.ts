import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AUTHOR_NAME, CONTACT_EMAIL, COPYRIGHT_NOTICE } from '../../core/constants/site.constants';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16" aria-label="About Theng Nioh">
      <header class="mb-12 border-b border-neutral-800 pb-8">
        <h1 class="text-4xl sm:text-5xl font-serif text-neutral-100 tracking-tight mb-3">{{ authorName }}</h1>
        <p class="text-sm font-mono text-emerald-400 tracking-widest uppercase">Photographer & Visual Artist</p>
      </header>

      <section class="space-y-6 text-neutral-300 font-sans leading-relaxed text-base sm:text-lg">
        <p>
          Welcome to my personal photography archive. I am {{ authorName }}, an independent photographer focused on natural light, portraiture, street candids, and architectural studies.
        </p>

        <p>
          My work is built on the philosophy of photographic honesty: capturing genuine light, human nuance, and quiet moments without artificial skin-altering deformation. Every digital retouching adjustment applied in my darkroom respects anatomical integrity and preserves genuine skin tone across all human subjects.
        </p>

        <p>
          This website is built from scratch without commercial CMS platforms, tracking cookies, or corporate sponsors. It exists purely to present my visual journey at the highest possible fidelity.
        </p>
      </section>

      <section class="mt-12 pt-8 border-t border-neutral-800 space-y-4">
        <h2 class="text-xs font-mono uppercase tracking-widest text-neutral-400">Licensing & Commissions</h2>
        <p class="text-sm text-neutral-400 leading-relaxed">
          All images displayed on this site are protected original artworks. For licensing enquiries, editorial commissions, exhibition prints, or private portrait sessions, please contact me directly:
        </p>
        <div class="pt-2 flex flex-wrap items-center gap-4">
          <a
            [href]="'mailto:' + contactEmail + '?subject=Licensing Enquiry — ' + authorName"
            class="px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-md text-xs font-mono tracking-wider uppercase transition-colors"
          >
            Contact Me: {{ contactEmail }}
          </a>
          <a
            routerLink="/"
            class="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-md text-xs font-mono tracking-wider uppercase transition-colors"
          >
            Explore My Work &rarr;
          </a>
        </div>
      </section>

      <footer class="mt-16 pt-6 border-t border-neutral-900 text-xs font-mono text-neutral-600">
        <p>{{ copyrightNotice }}</p>
      </footer>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class AboutComponent {
  readonly authorName = AUTHOR_NAME;
  readonly contactEmail = CONTACT_EMAIL;
  readonly copyrightNotice = COPYRIGHT_NOTICE;
}
