import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shortcuts-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      (click)="close.emit()"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheat Sheet"
    >
      <div
        class="w-full max-w-lg glass-panel p-6 rounded-2xl border border-neutral-700 bg-neutral-950/95 shadow-2xl space-y-6"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 class="text-sm font-mono uppercase tracking-widest text-neutral-100">Keyboard Shortcuts</h2>
          </div>
          <button
            (click)="close.emit()"
            class="text-neutral-400 hover:text-neutral-100 font-mono text-sm p-1"
            aria-label="Close shortcuts"
          >
            &times;
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs font-mono">
          <div class="space-y-2">
            <span class="text-neutral-500 uppercase tracking-wider text-[10px] block">Tools & Masks</span>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Smart Brush</span>
              <kbd class="kbd-key">B</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Mask Eraser</span>
              <kbd class="kbd-key">E</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Spot Healer</span>
              <kbd class="kbd-key">H</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Mask Visualizer</span>
              <kbd class="kbd-key">M</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Brush Size</span>
              <kbd class="kbd-key">[ ]</kbd>
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-neutral-500 uppercase tracking-wider text-[10px] block">Canvas & History</span>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Compare (Hold)</span>
              <kbd class="kbd-key">\\</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Toggle Grade</span>
              <kbd class="kbd-key">G</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Undo</span>
              <kbd class="kbd-key">Ctrl+Z</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Redo</span>
              <kbd class="kbd-key">Ctrl+Y</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Save Draft</span>
              <kbd class="kbd-key">Ctrl+S</kbd>
            </div>
            <div class="flex items-center justify-between py-1 border-b border-neutral-900">
              <span class="text-neutral-300">Cheat Sheet</span>
              <kbd class="kbd-key">?</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .kbd-key {
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      background: #1e293b;
      border: 1px solid #334155;
      color: #34d399;
      font-size: 0.65rem;
      font-weight: 600;
    }
  `],
})
export class ShortcutsModalComponent {
  @Output() close = new EventEmitter<void>();
}
