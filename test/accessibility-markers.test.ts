import { ACCESSIBILITY_FEATURE_TYPES } from '@ou-campus-map/shared-types';
import { ACCESSIBILITY_FEATURE_META, LAYER_KEYS, LAYER_META } from '../apps/mobile/src/constants/categories';

describe('Accessibility map markers', () => {
  it('has a label and icon for every accessibility feature type', () => {
    for (const type of ACCESSIBILITY_FEATURE_TYPES) {
      const meta = ACCESSIBILITY_FEATURE_META[type];
      expect(meta).toBeDefined();
      expect(meta.label.trim().length).toBeGreaterThan(0);
      expect(meta.icon.trim().length).toBeGreaterThan(0);
    }
  });

  it('does not define markers for feature types that do not exist', () => {
    expect(Object.keys(ACCESSIBILITY_FEATURE_META).sort()).toEqual(
      [...ACCESSIBILITY_FEATURE_TYPES].sort(),
    );
  });

  it('gives each feature type its own label and icon so markers can be told apart', () => {
    const metas = Object.values(ACCESSIBILITY_FEATURE_META);
    expect(new Set(metas.map((m) => m.label)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.icon)).size).toBe(metas.length);
  });

  it('uses the expected labels and icons for key features', () => {
    expect(ACCESSIBILITY_FEATURE_META.accessible_entrance).toEqual({
      label: 'Accessible entrance',
      icon: 'door-open',
    });
    expect(ACCESSIBILITY_FEATURE_META.elevator.label).toBe('Elevator');
    expect(ACCESSIBILITY_FEATURE_META.ramp.label).toBe('Ramp');
  });

  it('registers accessibility as a toggleable map layer with its own color and icon', () => {
    expect(LAYER_KEYS).toContain('accessibility');
    const layer = LAYER_META.accessibility;
    expect(layer.label).toBe('Accessibility');
    expect(layer.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(layer.icon).toBe('wheelchair-accessibility');
  });

  it('keeps the accessibility layer color distinct from every other layer', () => {
    const others = LAYER_KEYS.filter((k) => k !== 'accessibility').map((k) => LAYER_META[k].color);
    expect(others).not.toContain(LAYER_META.accessibility.color);
  });
});
