import React from 'react';
import { X, MinusCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

// ============================================================================
// ACTIVE FILTER SUMMARY (Sales Navigator-style)
// ============================================================================
// Shows a human-readable summary of all active filters
// Clicking an item highlights the corresponding condition
// Updates in real-time as filters change

export function ActiveFilterSummary({ filters, onHighlight, onRemoveCondition }) {
    if (!filters || !filters.groups || filters.groups.length === 0) {
        return null;
    }

    // Extract all conditions from all groups
    const allConditions = [];
    filters.groups.forEach((group, groupIndex) => {
        group.conditions.forEach((condition, condIndex) => {
            if (condition.value || condition.operator === 'exists' || condition.operator === 'not_exists') {
                allConditions.push({
                    ...condition,
                    groupIndex,
                    condIndex,
                    id: `${groupIndex}-${condIndex}`
                });
            }
        });
    });

    if (allConditions.length === 0) {
        return null;
    }

    // Separate included and excluded conditions
    const included = allConditions.filter(c => !c.exclude);
    const excluded = allConditions.filter(c => c.exclude);

    // Helper to get field label
    const getFieldLabel = (fieldValue) => {
        const FIELDS = [
            { value: 'title', label: 'Job Title' },
            { value: 'industry', label: 'Industry' },
            { value: 'location', label: 'Location' },
            { value: 'company', label: 'Company' },
            { value: 'status', label: 'Outreach Status' },
            { value: 'review_status', label: 'Review Status' },
            { value: 'source', label: 'Source' },
            { value: 'hasEmail', label: 'Has Email' },
            { value: 'hasLinkedin', label: 'Has LinkedIn' },
        ];
        return FIELDS.find(f => f.value === fieldValue)?.label || fieldValue;
    };

    // Helper to format condition as human-readable text
    const formatCondition = (condition) => {
        const field = getFieldLabel(condition.field);
        const op = condition.operator;
        const val = condition.value;

        // Handle boolean fields
        if (op === 'exists') return `${field} exists`;
        if (op === 'not_exists') return `${field} does not exist`;

        // Handle other operators
        const opMap = {
            'contains': 'contains',
            'not_contains': 'does not contain',
            'equals': 'equals',
            'not_equals': 'does not equal',
            'starts_with': 'starts with',
            'includes': 'includes',
            'excludes': 'excludes',
        };

        return `${field} ${opMap[op] || op} ${val}`;
    };

    return (
        <div className="bg-muted/30 border rounded-lg p-4 space-y-3 mb-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Active Filters</h4>
                <Badge variant="secondary" className="text-xs">
                    {allConditions.length} filter{allConditions.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Included Filters */}
            {included.length > 0 && (
                <div className="space-y-1.5">
                    {included.map((condition) => (
                        <div
                            key={condition.id}
                            className="flex items-center gap-2 text-sm group/summary cursor-pointer hover:bg-background/50 rounded px-2 py-1 transition-colors"
                            onClick={() => onHighlight && onHighlight(condition.groupIndex, condition.condIndex)}
                        >
                            <span className="text-primary">•</span>
                            <span className="flex-1 text-foreground">{formatCondition(condition)}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover/summary:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveCondition && onRemoveCondition(condition.groupIndex, condition.condIndex);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Excluded Filters */}
            {excluded.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <MinusCircle className="h-3 w-3" />
                        <span>Excluding:</span>
                    </div>
                    {excluded.map((condition) => (
                        <div
                            key={condition.id}
                            className="flex items-center gap-2 text-sm group/summary cursor-pointer hover:bg-background/50 rounded px-2 py-1 transition-colors"
                            onClick={() => onHighlight && onHighlight(condition.groupIndex, condition.condIndex)}
                        >
                            <span className="text-destructive">•</span>
                            <span className="flex-1 text-muted-foreground line-through">{formatCondition(condition)}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover/summary:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveCondition && onRemoveCondition(condition.groupIndex, condition.condIndex);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
