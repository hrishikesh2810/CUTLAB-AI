/**
 * AI Insights Data Contract
 * 
 * This file defines the structure for ai_insights.json.
 * AI analysis runs on Analysis pages and outputs this format.
 * The Workspace loads this as read-only data.
 * 
 * OWNER: AI Engine (Python backend)
 * CONSUMER: Workspace Editor (read-only)
 */

// Types of AI suggestions
export type SuggestionType = 'cut' | 'keep' | 'trim' | 'transition';

// Confidence levels for AI suggestions
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Individual AI suggestion
export interface AISuggestion {
    id: string;                     // Unique identifier
    type: SuggestionType;           // Type of edit suggestion

    // Time range this applies to
    startTime: number;              // Start time in seconds
    endTime: number;                // End time in seconds

    // Suggestion details
    confidence: ConfidenceLevel;    // AI confidence level
    score: number;                  // Numeric confidence (0-1)
    reason: string;                 // Human-readable explanation

    // Scene analysis data
    sceneType?: string;             // e.g., 'action', 'dialogue', 'static'
    motionScore?: number;           // Motion intensity (0-1)
    audioEnergy?: number;           // Audio energy level (0-1)
    faceCount?: number;             // Detected faces

    // Transition recommendation (if type === 'transition')
    transitionType?: string;        // 'cross-dissolve', 'fade-in', 'fade-out'
    transitionDuration?: number;    // Duration in seconds

    // Status in workspace (set by editor, not AI)
    status?: 'pending' | 'applied' | 'ignored';
}

// Audio analysis segment
export interface AudioSegment {
    id: string;
    startTime: number;
    endTime: number;
    type: 'speech' | 'music' | 'silence' | 'peak' | 'ambient';
    energy: number;                 // 0-1
    label?: string;
}

// Scene boundary detected by AI
export interface SceneBoundary {
    id: string;
    time: number;                   // Time of scene change
    type: 'content' | 'threshold' | 'adaptive';
    confidence: number;             // 0-1
}

// AI analysis summary
export interface AnalysisSummary {
    totalDuration: number;          // Video duration in seconds
    sceneCount: number;             // Number of detected scenes
    suggestedCuts: number;          // Number of cut suggestions
    suggestedKeeps: number;         // Number of keep suggestions
    averageConfidence: number;      // Overall confidence score
    processingTime: number;         // Analysis time in seconds
    modelVersion: string;           // AI model version
}

// Complete AI Insights document (ai_insights.json)
export interface AIInsights {
    version: string;                // Schema version
    projectId: string;              // Project this belongs to
    videoPath: string;              // Source video path
    createdAt: string;              // ISO timestamp

    // Analysis results
    summary: AnalysisSummary;
    suggestions: AISuggestion[];
    audioSegments: AudioSegment[];
    sceneBoundaries: SceneBoundary[];

    // Metadata
    analysisConfig?: {
        sensitivityLevel?: number;
        audioEnabled?: boolean;
        faceDetectionEnabled?: boolean;
    };
}

// Create empty AI insights object
export function createEmptyAIInsights(projectId: string, videoPath: string): AIInsights {
    return {
        version: '1.0',
        projectId,
        videoPath,
        createdAt: new Date().toISOString(),
        summary: {
            totalDuration: 0,
            sceneCount: 0,
            suggestedCuts: 0,
            suggestedKeeps: 0,
            averageConfidence: 0,
            processingTime: 0,
            modelVersion: 'cutlab-ai-v1',
        },
        suggestions: [],
        audioSegments: [],
        sceneBoundaries: [],
    };
}

// Convert workspace suggestion status updates to be applied
export interface SuggestionAction {
    suggestionId: string;
    action: 'apply' | 'ignore' | 'reset';
}

// Helper to filter pending suggestions
export function getPendingSuggestions(insights: AIInsights): AISuggestion[] {
    return insights.suggestions.filter(s => s.status === 'pending' || !s.status);
}

// Helper to get suggestions for a time range
export function getSuggestionsInRange(
    insights: AIInsights,
    startTime: number,
    endTime: number
): AISuggestion[] {
    return insights.suggestions.filter(
        s => s.startTime < endTime && s.endTime > startTime
    );
}
