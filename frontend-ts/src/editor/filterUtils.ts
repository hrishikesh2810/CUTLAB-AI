import type { VideoFilters } from './types';

export const DEFAULT_FILTERS: VideoFilters = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
};

export const PRESETS = {
    vintage: {
        brightness: 110,
        contrast: 120,
        saturation: 90,
        sepia: 30,
    },
    highContrast: {
        contrast: 150,
        saturation: 130,
    },
    warm: {
        hueRotate: -10,
        saturation: 120,
    },
    cool: {
        hueRotate: 10,
        saturation: 90,
        brightness: 105
    },
    soft: {
        contrast: 90,
        saturation: 90,
        brightness: 105,
        blur: 0.5
    },
    monochrome: {
        grayscale: 100,
        contrast: 120
    }
};

export function getFilterString(filters: VideoFilters): string {
    return [
        `brightness(${filters.brightness}%)`,
        `contrast(${filters.contrast}%)`,
        `saturate(${filters.saturation}%)`,
        `blur(${filters.blur}px)`,
        `grayscale(${filters.grayscale}%)`,
        `sepia(${filters.sepia}%)`,
        `hue-rotate(${filters.hueRotate}deg)`
    ].join(' ');
}
