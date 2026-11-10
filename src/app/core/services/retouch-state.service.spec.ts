import { describe, it, expect, beforeEach } from 'vitest';
import { RetouchStateService } from './retouch-state.service';
import { SpotHealPoint, MaskStroke } from '../models/retouch.model';

describe('RetouchStateService', () => {
  let service: RetouchStateService;

  beforeEach(() => {
    service = new RetouchStateService();
  });

  it('initializes with default sliders and preset', () => {
    expect(service.sliders().skinSmoothing).toBe(25);
    expect(service.activePreset()).toBe('Default');
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(false);
    expect(service.isExtreme()).toBe(false);
  });

  it('updates sliders and enforces ethical caps', () => {
    service.updateSlider('skinSmoothing', 85);
    // Skin smoothing is capped at 60 under ethical rules
    expect(service.sliders().skinSmoothing).toBe(60);
    expect(service.canUndo()).toBe(true);
  });

  it('applies presets correctly', () => {
    service.applyPreset('Editorial');
    expect(service.activePreset()).toBe('Editorial');
    expect(service.sliders().skinSmoothing).toBe(45);
    expect(service.sliders().irisClarity).toBe(35);

    service.applyPreset('Reset');
    expect(service.sliders().skinSmoothing).toBe(0);
    expect(service.sliders().textureRetention).toBe(100);
  });

  it('manages undo and redo history stack', () => {
    service.updateSlider('skinSmoothing', 30);
    service.updateSlider('skinSmoothing', 40);

    expect(service.sliders().skinSmoothing).toBe(40);
    expect(service.canUndo()).toBe(true);

    const undone1 = service.undo();
    expect(undone1).toBe(true);
    expect(service.sliders().skinSmoothing).toBe(30);

    const undone2 = service.undo();
    expect(undone2).toBe(true);
    expect(service.sliders().skinSmoothing).toBe(25); // Initial

    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(true);

    const redone = service.redo();
    expect(redone).toBe(true);
    expect(service.sliders().skinSmoothing).toBe(30);
  });

  it('records spot heal points and mask strokes', () => {
    const heal: SpotHealPoint = {
      id: 'h1',
      target: { x: 0.5, y: 0.5 },
      donor: { x: 0.48, y: 0.48 },
      radius: 0.02,
      feather: 0.5,
    };

    service.addHealPoint(heal);
    expect(service.heals().length).toBe(1);

    const stroke: MaskStroke = {
      id: 's1',
      zone: 'FACE_SKIN',
      mode: 'add',
      radius: 0.03,
      softness: 0.5,
      points: [{ x: 0.4, y: 0.4 }],
    };

    service.addStroke(stroke);
    expect(service.strokes().length).toBe(1);
    expect(service.editCount()).toBe(2);

    service.removeHealPoint('h1');
    expect(service.heals().length).toBe(0);
    expect(service.editCount()).toBe(1);
  });

  it('cycles mask visualizer mode correctly', () => {
    expect(service.visualizeZone()).toBe(-1); // Off

    service.toggleMaskVisualizer();
    expect(service.visualizeZone()).toBe(99); // Composite

    service.toggleMaskVisualizer();
    expect(service.visualizeZone()).toBe(0); // Face skin

    service.toggleMaskVisualizer();
    expect(service.visualizeZone()).toBe(-1); // Off again

    service.toggleMaskVisualizer(5); // Direct lips selection
    expect(service.visualizeZone()).toBe(5);

    service.toggleMaskVisualizer(5); // Toggle off
    expect(service.visualizeZone()).toBe(-1);
  });
});
