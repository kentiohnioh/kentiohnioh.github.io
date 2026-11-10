import { Routes } from '@angular/router';

/**
 * Admin routes (local studio configuration only): Replaces app.routes.ts at build time via fileReplacements.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/gallery/gallery-shell.component').then(
        (m) => m.GalleryShellComponent
      ),
    title: 'Theng Nioh — Photography Portfolio',
  },
  {
    path: 'photo/:slug',
    loadComponent: () =>
      import('./features/inspector/photo-inspector.component').then(
        (m) => m.PhotoInspectorComponent
      ),
    title: 'Photograph — Theng Nioh',
  },
  {
    path: 'zine/:id',
    loadComponent: () =>
      import('./features/zine/zine-viewer.component').then(
        (m) => m.ZineViewerComponent
      ),
    title: 'Visual Zine — Theng Nioh',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about.component').then((m) => m.AboutComponent),
    title: 'About — Theng Nioh',
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    title: 'Admin Studio — Theng Nioh',
  },
  {
    path: 'admin/mask-lab',
    loadComponent: () =>
      import('./features/admin/mask-lab/mask-lab.component').then(
        (m) => m.MaskLabComponent
      ),
    title: 'Mask Lab QA — Theng Nioh',
  },
  {
    path: 'admin/retouch-studio',
    loadComponent: () =>
      import('./features/admin/retouch-studio/retouch-studio.component').then(
        (m) => m.RetouchStudioComponent
      ),
    title: 'Retouch Studio — Theng Nioh',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
    title: 'Photograph Not Found — Theng Nioh',
  },
];

