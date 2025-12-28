/**
 * Media Store - Manages imported media items
 */

import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { MediaItem, generateId } from '../types';

// ============================================================
// STATE INTERFACE
// ============================================================

export interface MediaState {
    items: MediaItem[];
    selectedItemId: string | null;
    isLoading: boolean;
    error: string | null;
}

// ============================================================
// ACTIONS
// ============================================================

type MediaAction =
    | { type: 'ADD_ITEMS'; payload: MediaItem[] }
    | { type: 'REMOVE_ITEM'; payload: string }
    | { type: 'SELECT_ITEM'; payload: string | null }
    | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<MediaItem> } }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'CLEAR_ALL' };

// ============================================================
// REDUCER
// ============================================================

function mediaReducer(state: MediaState, action: MediaAction): MediaState {
    switch (action.type) {
        case 'ADD_ITEMS':
            return {
                ...state,
                items: [...state.items, ...action.payload],
                isLoading: false,
                error: null,
            };

        case 'REMOVE_ITEM':
            return {
                ...state,
                items: state.items.filter(item => item.id !== action.payload),
                selectedItemId: state.selectedItemId === action.payload ? null : state.selectedItemId,
            };

        case 'SELECT_ITEM':
            return {
                ...state,
                selectedItemId: action.payload,
            };

        case 'UPDATE_ITEM':
            return {
                ...state,
                items: state.items.map(item =>
                    item.id === action.payload.id
                        ? { ...item, ...action.payload.updates }
                        : item
                ),
            };

        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                isLoading: false,
            };

        case 'CLEAR_ALL':
            return {
                ...state,
                items: [],
                selectedItemId: null,
            };

        default:
            return state;
    }
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState: MediaState = {
    items: [],
    selectedItemId: null,
    isLoading: false,
    error: null,
};

// ============================================================
// CONTEXT
// ============================================================

interface MediaContextValue {
    state: MediaState;
    dispatch: React.Dispatch<MediaAction>;

    // Convenience methods
    importFiles: () => Promise<MediaItem[]>;
    removeItem: (id: string) => void;
    selectItem: (id: string | null) => void;
    getItemById: (id: string) => MediaItem | undefined;
}

const MediaContext = createContext<MediaContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface MediaProviderProps {
    children: ReactNode;
}

export function MediaProvider({ children }: MediaProviderProps) {
    const [state, dispatch] = useReducer(mediaReducer, initialState);

    // Import files using Electron API or browser fallback
    const importFiles = useCallback(async (): Promise<MediaItem[]> => {
        dispatch({ type: 'SET_LOADING', payload: true });

        try {
            // Check if running in Electron
            if (window.electronAPI?.isElectron) {
                const files = await window.electronAPI.selectVideoFiles();

                if (files.length === 0) {
                    dispatch({ type: 'SET_LOADING', payload: false });
                    return [];
                }

                const mediaItems: MediaItem[] = files.map(file => ({
                    id: generateId('media'),
                    filename: file.name,
                    path: file.url, // file:// URL for video element
                    duration: 0, // Will be updated when video loads
                    width: 1920,
                    height: 1080,
                    fps: 30,
                    hasAudio: true,
                    thumbnailUrl: undefined,
                }));

                dispatch({ type: 'ADD_ITEMS', payload: mediaItems });
                return mediaItems;
            } else {
                // Browser fallback: use file input
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'video/*';

                    input.onchange = async (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (!files || files.length === 0) {
                            dispatch({ type: 'SET_LOADING', payload: false });
                            resolve([]);
                            return;
                        }

                        const mediaItems: MediaItem[] = Array.from(files).map(file => ({
                            id: generateId('media'),
                            filename: file.name,
                            path: URL.createObjectURL(file), // Blob URL for video element
                            duration: 0,
                            width: 1920,
                            height: 1080,
                            fps: 30,
                            hasAudio: true,
                            thumbnailUrl: undefined,
                        }));

                        dispatch({ type: 'ADD_ITEMS', payload: mediaItems });
                        resolve(mediaItems);
                    };

                    input.oncancel = () => {
                        dispatch({ type: 'SET_LOADING', payload: false });
                        resolve([]);
                    };

                    input.click();
                });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
            return [];
        }
    }, []);

    const removeItem = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_ITEM', payload: id });
    }, []);

    const selectItem = useCallback((id: string | null) => {
        dispatch({ type: 'SELECT_ITEM', payload: id });
    }, []);

    const getItemById = useCallback((id: string) => {
        return state.items.find(item => item.id === id);
    }, [state.items]);

    const value: MediaContextValue = {
        state,
        dispatch,
        importFiles,
        removeItem,
        selectItem,
        getItemById,
    };

    return (
        <MediaContext.Provider value={value}>
            {children}
        </MediaContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

export function useMedia(): MediaContextValue {
    const context = useContext(MediaContext);
    if (!context) {
        throw new Error('useMedia must be used within a MediaProvider');
    }
    return context;
}
