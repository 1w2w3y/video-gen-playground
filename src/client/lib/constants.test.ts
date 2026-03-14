import { describe, it, expect } from 'vitest';
import {
  AZURE_RESOLUTIONS,
  OPENAI_RESOLUTIONS,
  AZURE_DURATIONS,
  OPENAI_DURATIONS,
  OPENAI_MODELS,
} from './constants';

describe('constants', () => {
  describe('AZURE_RESOLUTIONS', () => {
    it('has 4 resolution options', () => {
      expect(AZURE_RESOLUTIONS).toHaveLength(4);
    });

    it('includes HD landscape 1280x720', () => {
      expect(AZURE_RESOLUTIONS).toContainEqual(
        expect.objectContaining({ width: 1280, height: 720 }),
      );
    });

    it('all entries have labelKey, width, height', () => {
      for (const r of AZURE_RESOLUTIONS) {
        expect(r).toHaveProperty('labelKey');
        expect(r).toHaveProperty('width');
        expect(r).toHaveProperty('height');
        expect(r.width).toBeGreaterThan(0);
        expect(r.height).toBeGreaterThan(0);
      }
    });
  });

  describe('OPENAI_RESOLUTIONS', () => {
    it('has 6 resolution options (superset of Azure)', () => {
      expect(OPENAI_RESOLUTIONS).toHaveLength(6);
    });

    it('includes FHD options not in Azure', () => {
      expect(OPENAI_RESOLUTIONS).toContainEqual(
        expect.objectContaining({ width: 1920, height: 1080 }),
      );
      expect(OPENAI_RESOLUTIONS).toContainEqual(
        expect.objectContaining({ width: 1080, height: 1920 }),
      );
    });
  });

  describe('AZURE_DURATIONS', () => {
    it('contains [4, 8, 12]', () => {
      expect(AZURE_DURATIONS).toEqual([4, 8, 12]);
    });
  });

  describe('OPENAI_DURATIONS', () => {
    it('contains [8, 16, 20]', () => {
      expect(OPENAI_DURATIONS).toEqual([8, 16, 20]);
    });
  });

  describe('OPENAI_MODELS', () => {
    it('includes sora-2 and sora-2-pro', () => {
      expect(OPENAI_MODELS).toContain('sora-2');
      expect(OPENAI_MODELS).toContain('sora-2-pro');
    });
  });
});
