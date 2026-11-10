import { Injectable, signal, computed } from '@angular/core';
import {
  RetouchSliders,
  RetouchRecipe,
  SpotHealPoint,
  MaskStroke,
  AnatomicalZoneId,
} from '../models/retouch.model';
import {
  DEFAULT_RETOUCH_SLIDERS,
  RETOUCH_PRESETS,
  RetouchPresetName,
  clampSlidersToEthicalCaps,
  isExtremeRetouch,
} from '../utils/retouch-presets';

export type RetouchTool = 'select' | 'brush' | 'eraser' | 'healer';

export interface RetouchHistoryEntry {
  sliders: RetouchSliders;
  heals: SpotHealPoint[];
  strokes: MaskStroke[];
}

@Injectable({
  providedIn: 'root',
})
export class RetouchStateService {
  // Primary state signals
  readonly sliders = signal<RetouchSliders>({ ...DEFAULT_RETOUCH_SLIDERS });
  readonly heals = signal<SpotHealPoint[]>([]);
  readonly strokes = signal<MaskStroke[]>([]);
  readonly activePreset = signal<RetouchPresetName>('Default');

  // Tool and visualization state
  readonly activeTool = signal<RetouchTool>('select');
  readonly activeZone = signal<AnatomicalZoneId>('FACE_SKIN');
  readonly brushRadius = signal<number>(0.03); // in normalized [0, 1] coordinates
  readonly brushSoftness = signal<number>(0.5);
  readonly brushOpacity = signal<number>(0.7);

  readonly visualizeZone = signal<number>(-1); // -1 = off, 0..11 = zone, 99 = composite
  readonly splitPosition = signal<number>(-1.0); // -1 = disabled (full after), 0..1 = split line
  readonly allowExtreme = signal<boolean>(false);

  // Undo / Redo history stack
  private readonly history = signal<RetouchHistoryEntry[]>([
    {
      sliders: { ...DEFAULT_RETOUCH_SLIDERS },
      heals: [],
      strokes: [],
    },
  ]);
  private readonly historyIndex = signal<number>(0);

  // Computed properties
  readonly canUndo = computed(() => this.historyIndex() > 0);
  readonly canRedo = computed(() => this.historyIndex() < this.history().length - 1);
  readonly isExtreme = computed(() => isExtremeRetouch(this.sliders()));

  // Number of active edits
  readonly editCount = computed(() => {
    return this.heals().length + this.strokes().length;
  });

  /**
   * Applies a preset configuration.
   */
  applyPreset(presetName: RetouchPresetName): void {
    const preset = RETOUCH_PRESETS[presetName];
    if (!preset) return;

    this.activePreset.set(presetName);
    this.updateSliders(preset);
  }

  /**
   * Updates an individual slider or a partial set of sliders.
   */
  updateSlider<K extends keyof RetouchSliders>(key: K, value: number): void {
    const current = { ...this.sliders() };
    current[key] = value;
    const clamped = clampSlidersToEthicalCaps(current, this.allowExtreme());
    this.sliders.set(clamped);
    this.recordHistory();
  }

  /**
   * Replaces all slider settings.
   */
  updateSliders(newSliders: Partial<RetouchSliders>): void {
    const merged: RetouchSliders = { ...this.sliders(), ...newSliders };
    const clamped = clampSlidersToEthicalCaps(merged, this.allowExtreme());
    this.sliders.set(clamped);
    this.recordHistory();
  }

  /**
   * Toggles the mask visualizer mode.
   * Cycles: Off (-1) -> Composite (99) -> Active Zone (0..11) -> Off (-1).
   */
  toggleMaskVisualizer(zoneIndex?: number): void {
    const current = this.visualizeZone();
    if (zoneIndex !== undefined) {
      this.visualizeZone.set(current === zoneIndex ? -1 : zoneIndex);
      return;
    }

    if (current === -1) {
      this.visualizeZone.set(99); // Composite
    } else if (current === 99) {
      this.visualizeZone.set(0); // Face skin
    } else {
      this.visualizeZone.set(-1);
    }
  }

  /**
   * Adds a spot heal point.
   */
  addHealPoint(heal: SpotHealPoint): void {
    this.heals.update(list => [...list, heal]);
    this.recordHistory();
  }

  /**
   * Removes a spot heal point by ID.
   */
  removeHealPoint(id: string): void {
    this.heals.update(list => list.filter(h => h.id !== id));
    this.recordHistory();
  }

  /**
   * Adds a painted mask stroke.
   */
  addStroke(stroke: MaskStroke): void {
    this.strokes.update(list => [...list, stroke]);
    this.recordHistory();
  }

  /**
   * Undo the last change.
   */
  undo(): boolean {
    if (!this.canUndo()) return false;
    const newIdx = this.historyIndex() - 1;
    this.historyIndex.set(newIdx);
    this.restoreEntry(this.history()[newIdx]);
    return true;
  }

  /**
   * Redo the undone change.
   */
  redo(): boolean {
    if (!this.canRedo()) return false;
    const newIdx = this.historyIndex() + 1;
    this.historyIndex.set(newIdx);
    this.restoreEntry(this.history()[newIdx]);
    return true;
  }

  /**
   * Resets all sliders, heals, and strokes to defaults.
   */
  resetAll(): void {
    this.sliders.set({ ...DEFAULT_RETOUCH_SLIDERS });
    this.heals.set([]);
    this.strokes.set([]);
    this.activePreset.set('Default');
    this.recordHistory();
  }

  /**
   * Generates a RetouchRecipe export object.
   */
  exportRecipe(): RetouchRecipe {
    return {
      schemaVersion: 1,
      modelVersion: 'mediapipe-face-landmarker-v1',
      algorithmVersion: 'theng-nioh-gpu-retouch-v1',
      extreme: this.isExtreme(),
      faces: [
        {
          faceIndex: 0,
          boundingBox: { x: 0, y: 0, width: 1, height: 1 },
          sliders: { ...this.sliders() },
          extreme: this.isExtreme(),
        },
      ],
      strokes: [...this.strokes()],
      heals: [...this.heals()],
    };
  }

  private recordHistory(): void {
    const entry: RetouchHistoryEntry = {
      sliders: { ...this.sliders() },
      heals: [...this.heals()],
      strokes: [...this.strokes()],
    };

    const currentIdx = this.historyIndex();
    const updatedHistory = this.history().slice(0, currentIdx + 1);
    updatedHistory.push(entry);

    // Keep max 30 history steps to conserve memory
    if (updatedHistory.length > 30) {
      updatedHistory.shift();
    }

    this.history.set(updatedHistory);
    this.historyIndex.set(updatedHistory.length - 1);
  }

  private restoreEntry(entry: RetouchHistoryEntry): void {
    this.sliders.set({ ...entry.sliders });
    this.heals.set([...entry.heals]);
    this.strokes.set([...entry.strokes]);
  }
}
