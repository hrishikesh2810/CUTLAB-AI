/**
 * Filters Panel
 * =============
 * Control panel for video filters.
 */

import React from 'react';
import { RotateCcw, Zap, X } from 'lucide-react';
import type { VideoFilters } from './types';
import { PRESETS, DEFAULT_FILTERS } from './filterUtils';
import './VideoEditor.css'; // Reusing editor styles, but we will add more specific ones

interface FiltersPanelProps {
    filters: VideoFilters;
    onUpdateFilters: (filters: VideoFilters) => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ filters, onUpdateFilters }) => {

    // Helper to update a single filter
    const updateFilter = (key: keyof VideoFilters, value: number) => {
        onUpdateFilters({
            ...filters,
            [key]: value
        });
    };

    // Helper to apply a preset
    const applyPreset = (presetName: keyof typeof PRESETS) => {
        const presetValues = PRESETS[presetName];
        onUpdateFilters({
            ...DEFAULT_FILTERS,
            ...presetValues
        });
    };

    // Reset all filters
    const resetFilters = () => {
        onUpdateFilters(DEFAULT_FILTERS);
    };

    // Check if a filter is active (different from default)
    const isFilterActive = (key: keyof VideoFilters) => {
        return filters[key] !== DEFAULT_FILTERS[key];
    };

    // Render a slider control
    const renderSlider = (
        label: string,
        key: keyof VideoFilters,
        min: number,
        max: number,
        unit: string = ''
    ) => (
        <div className="filter-control">
            <div className="filter-header">
                <span className="filter-label">{label}</span>
                <span className="filter-value">
                    {filters[key].toFixed(0)}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={filters[key]}
                onChange={(e) => updateFilter(key, parseFloat(e.target.value))}
                className="filter-slider"
            />
        </div>
    );

    return (
        <div className="filters-panel">
            {/* Active Filters Section */}
            <div className="filter-section">
                <div className="section-header">
                    <h3>Active Filters</h3>
                    <button
                        className="reset-all-btn"
                        onClick={resetFilters}
                        title="Reset all filters"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>

                <div className="active-filters-list">
                    {Object.keys(DEFAULT_FILTERS).map((key) => {
                        const filterKey = key as keyof VideoFilters;
                        if (!isFilterActive(filterKey)) return null;

                        return (
                            <div key={key} className="active-filter-chip">
                                <span>{key}: {filters[filterKey]}</span>
                                <button
                                    onClick={() => updateFilter(filterKey, DEFAULT_FILTERS[filterKey])}
                                    className="remove-filter-btn"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}

                    {!Object.keys(DEFAULT_FILTERS).some(k => isFilterActive(k as keyof VideoFilters)) && (
                        <div className="no-filters-text">No active filters</div>
                    )}
                </div>
            </div>

            {/* Presets Section */}
            <div className="filter-section">
                <h3>Presets</h3>
                <div className="presets-grid">
                    {Object.keys(PRESETS).map((presetKey) => (
                        <button
                            key={presetKey}
                            className="preset-btn"
                            onClick={() => applyPreset(presetKey as keyof typeof PRESETS)}
                        >
                            <Zap size={14} />
                            {presetKey.replace(/([A-Z])/g, ' $1').trim()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Sliders Section */}
            <div className="filter-section">
                <h3>Custom Adjustments</h3>
                <div className="sliders-list">
                    {renderSlider('Brightness', 'brightness', 0, 200, '%')}
                    {renderSlider('Contrast', 'contrast', 0, 200, '%')}
                    {renderSlider('Saturation', 'saturation', 0, 200, '%')}
                    {renderSlider('Blur', 'blur', 0, 10, 'px')}
                    {renderSlider('Grayscale', 'grayscale', 0, 100, '%')}
                    {renderSlider('Sepia', 'sepia', 0, 100, '%')}
                    {renderSlider('Hue Rotate', 'hueRotate', 0, 360, '°')}
                </div>
            </div>
        </div>
    );
};
