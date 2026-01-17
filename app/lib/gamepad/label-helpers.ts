/**
 * Button label utility functions
 *
 * Helper functions for working with button labels (A/B/X/Y, D-pad, etc.)
 * Used throughout the UI to display human-readable button names
 */

import { ButtonLabel, Binding, ControllerProfileV2 } from './types-v2';

// ============================================================================
// Label Lookup
// ============================================================================

/**
 * Find the button label for a given button index
 * Returns null if no label is assigned to this index
 */
export function labelForIndex(
    labels: Partial<Record<ButtonLabel, number>>,
    index: number
): ButtonLabel | null {
    const entry = Object.entries(labels).find(([_, idx]) => idx === index);
    return entry ? (entry[0] as ButtonLabel) : null;
}

/**
 * Get all button indices that have labels
 */
export function getLabeledIndices(
    labels: Partial<Record<ButtonLabel, number>>
): number[] {
    return Object.values(labels).filter((idx): idx is number => idx !== undefined);
}

/**
 * Check if a button index has a label
 */
export function hasLabel(
    labels: Partial<Record<ButtonLabel, number>>,
    index: number
): boolean {
    return labelForIndex(labels, index) !== null;
}

// ============================================================================
// Binding Display Formatting
// ============================================================================

/**
 * Format a binding with button label for display
 * Examples:
 *   - "Button 3 (Y)" if button 3 is labeled Y
 *   - "Button 3" if button 3 has no label
 *   - "Axis 2 (+)" for positive axis
 *   - "Axis 2 (−)" for negative axis
 */
export function formatBindingWithLabel(
    binding: Binding | undefined,
    profile: ControllerProfileV2
): string {
    if (!binding) return 'Not bound';

    if (binding.type === 'button') {
        const label = labelForIndex(profile.labels, binding.index);
        if (label) {
            return `Button ${binding.index} (${formatButtonLabel(label)})`;
        }
        return `Button ${binding.index}`;
    }

    if (binding.type === 'axis') {
        const sign = binding.sign > 0 ? '+' : '−';
        return `Axis ${binding.index} (${sign})`;
    }

    return 'Unknown binding';
}

/**
 * Format binding without labels (compact)
 */
export function formatBinding(binding: Binding | undefined): string {
    if (!binding) return 'Not bound';

    if (binding.type === 'button') {
        return `Button ${binding.index}`;
    }

    if (binding.type === 'axis') {
        const sign = binding.sign > 0 ? '+' : '−';
        return `Axis ${binding.index} (${sign})`;
    }

    return 'Unknown';
}

// ============================================================================
// Button Label Formatting
// ============================================================================

/**
 * Format button label for display
 * Converts internal labels to friendly names
 */
export function formatButtonLabel(label: ButtonLabel): string {
    const formatMap: Record<ButtonLabel, string> = {
        'A': 'A',
        'B': 'B',
        'X': 'X',
        'Y': 'Y',
        'L1': 'L1 / LB',
        'R1': 'R1 / RB',
        'L2': 'L2 / LT',
        'R2': 'R2 / RT',
        'L3': 'L3',
        'R3': 'R3',
        'DPAD_UP': 'D-pad Up',
        'DPAD_DOWN': 'D-pad Down',
        'DPAD_LEFT': 'D-pad Left',
        'DPAD_RIGHT': 'D-pad Right',
        'START': 'Start',
        'SELECT': 'Select',
    };

    return formatMap[label] || label;
}

/**
 * Get a short version of button label for compact display
 */
export function formatButtonLabelShort(label: ButtonLabel): string {
    const shortMap: Record<ButtonLabel, string> = {
        'A': 'A',
        'B': 'B',
        'X': 'X',
        'Y': 'Y',
        'L1': 'L1',
        'R1': 'R1',
        'L2': 'L2',
        'R2': 'R2',
        'L3': 'L3',
        'R3': 'R3',
        'DPAD_UP': 'D↑',
        'DPAD_DOWN': 'D↓',
        'DPAD_LEFT': 'D←',
        'DPAD_RIGHT': 'D→',
        'START': '⏵',
        'SELECT': '⏸',
    };

    return shortMap[label] || label;
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Detect if a button index is already assigned to another label
 * Returns the conflicting label if found, null otherwise
 */
export function detectLabelConflict(
    labels: Partial<Record<ButtonLabel, number>>,
    newIndex: number,
    excludeLabel?: ButtonLabel
): ButtonLabel | null {
    for (const [label, index] of Object.entries(labels)) {
        if (index === newIndex && label !== excludeLabel) {
            return label as ButtonLabel;
        }
    }
    return null;
}

/**
 * Check if assigning a new index to a label would create a conflict
 */
export function wouldCreateConflict(
    labels: Partial<Record<ButtonLabel, number>>,
    targetLabel: ButtonLabel,
    newIndex: number
): boolean {
    const conflict = detectLabelConflict(labels, newIndex, targetLabel);
    return conflict !== null;
}

/**
 * Get all labels assigned to a button index
 */
export function getLabelsForIndex(
    labels: Partial<Record<ButtonLabel, number>>,
    index: number
): ButtonLabel[] {
    return Object.entries(labels)
        .filter(([_, idx]) => idx === index)
        .map(([label, _]) => label as ButtonLabel);
}

// ============================================================================
// Label Validation
// ============================================================================

/**
 * Check if labels object has any labels assigned
 */
export function hasAnyLabels(labels: Partial<Record<ButtonLabel, number>>): boolean {
    return Object.keys(labels).length > 0;
}

/**
 * Check if all required labels are assigned (core buttons)
 */
export function hasRequiredLabels(labels: Partial<Record<ButtonLabel, number>>): boolean {
    const required: ButtonLabel[] = ['A', 'B', 'X', 'Y'];
    return required.every(label => labels[label] !== undefined);
}

/**
 * Get missing required labels
 */
export function getMissingRequiredLabels(
    labels: Partial<Record<ButtonLabel, number>>
): ButtonLabel[] {
    const required: ButtonLabel[] = ['A', 'B', 'X', 'Y'];
    return required.filter(label => labels[label] === undefined);
}

/**
 * Get completion percentage (out of 16 possible labels)
 */
export function getLabelsCompletionPercent(
    labels: Partial<Record<ButtonLabel, number>>
): number {
    const total = 16; // Total possible labels
    const assigned = Object.keys(labels).length;
    return Math.round((assigned / total) * 100);
}

// ============================================================================
// Label Statistics
// ============================================================================

/**
 * Get statistics about assigned labels
 */
export function getLabelStats(labels: Partial<Record<ButtonLabel, number>>): {
    total: number;
    assigned: number;
    missing: number;
    percent: number;
    hasRequired: boolean;
} {
    const total = 16;
    const assigned = Object.keys(labels).length;
    const missing = total - assigned;
    const percent = getLabelsCompletionPercent(labels);
    const hasRequired = hasRequiredLabels(labels);

    return { total, assigned, missing, percent, hasRequired };
}
