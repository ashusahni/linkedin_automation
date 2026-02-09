import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Info, ArrowRight, CornerDownRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { ActiveFilterSummary } from './ActiveFilterSummary';

// ============================================================================
// FIELD & OPERATOR CONFIGURATION (Sales Navigator-style smart defaults)
// ============================================================================
// Each field has type-specific operators that make sense for that field.
// This prevents users from selecting nonsensical combinations.

const FIELDS = [
    { value: 'title', label: 'Job Title', type: 'text', defaultOp: 'contains' },
    { value: 'industry', label: 'Industry', type: 'select_or_text', defaultOp: 'equals' }, // Can be exact match or search
    { value: 'location', label: 'Location', type: 'text', defaultOp: 'includes' },
    { value: 'company', label: 'Company', type: 'text', defaultOp: 'contains' },
    { value: 'status', label: 'Outreach Status', type: 'select', options: ['new', 'contacted', 'replied'], defaultOp: 'equals' },
    { value: 'review_status', label: 'Review Status', type: 'select', options: ['to_be_reviewed', 'approved', 'rejected'], defaultOp: 'equals' },
    { value: 'source', label: 'Source', type: 'text', defaultOp: 'equals' },
    { value: 'hasEmail', label: 'Has Email', type: 'boolean', defaultOp: 'exists' },
    { value: 'hasLinkedin', label: 'Has LinkedIn', type: 'boolean', defaultOp: 'exists' },
    // { value: 'created_at', label: 'Created Date', type: 'date', defaultOp: 'after' }
];

// Field-specific operators (Sales Navigator pattern)
// Different field types get different operator options
const OPERATORS = {
    text: [
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'does not contain' },
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'starts_with', label: 'starts with' },
    ],
    select_or_text: [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'contains', label: 'contains' },
    ],
    select: [
        { value: 'equals', label: 'is' },
        { value: 'not_equals', label: 'is not' },
    ],
    boolean: [
        { value: 'exists', label: 'exists' },
        { value: 'not_exists', label: 'does not exist' },
    ],
    date: [
        { value: 'after', label: 'after' },
        { value: 'before', label: 'before' },
        { value: 'between', label: 'between' },
    ]
};

export function FilterLogicBuilder({ filters, onChange }) {
    // Ensures filters has the correct structure
    const safeFilters = filters || { operator: 'OR', groups: [] };

    // Highlight state for click-to-highlight from summary
    const [highlightedCondition, setHighlightedCondition] = useState(null);

    const addGroup = () => {
        const newGroup = {
            operator: 'AND',
            conditions: [
                { field: 'title', operator: 'contains', value: '', exclude: false } // Default condition
            ]
        };
        onChange({
            ...safeFilters,
            groups: [...safeFilters.groups, newGroup]
        });
    };

    const removeGroup = (groupIndex) => {
        const newGroups = safeFilters.groups.filter((_, i) => i !== groupIndex);
        onChange({ ...safeFilters, groups: newGroups });
    };

    const updateGroup = (groupIndex, newGroup) => {
        const newGroups = safeFilters.groups.map((g, i) => i === groupIndex ? newGroup : g);
        onChange({ ...safeFilters, groups: newGroups });
    };

    // Remove a specific condition from summary
    const handleRemoveCondition = (groupIndex, condIndex) => {
        const group = safeFilters.groups[groupIndex];
        const newConditions = group.conditions.filter((_, i) => i !== condIndex);

        // If this was the last condition, remove the group
        if (newConditions.length === 0) {
            removeGroup(groupIndex);
        } else {
            updateGroup(groupIndex, { ...group, conditions: newConditions });
        }
    };

    // Highlight a condition when clicked from summary
    const handleHighlight = (groupIndex, condIndex) => {
        setHighlightedCondition({ groupIndex, condIndex });
        // Clear highlight after 2 seconds
        setTimeout(() => setHighlightedCondition(null), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Active Filter Summary (Sales Navigator-style) */}
            <ActiveFilterSummary
                filters={safeFilters}
                onHighlight={handleHighlight}
                onRemoveCondition={handleRemoveCondition}
            />

            {safeFilters.groups.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
                    <p className="mb-4">No logic groups defined. Start by adding a condition group.</p>
                    <Button onClick={addGroup} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Filter Group
                    </Button>
                </div>
            )}

            {safeFilters.groups.map((group, groupIndex) => (
                <div key={groupIndex} className="relative">
                    {/* OR Label between groups */}
                    {groupIndex > 0 && (
                        <div className="absolute -top-5 left-8 bg-background px-2 text-xs font-bold text-muted-foreground z-10 flex items-center justify-center border rounded-full py-0.5 w-8 h-5 transform -translate-y-1/2">
                            OR
                        </div>
                    )}

                    <FilterGroup
                        group={group}
                        index={groupIndex}
                        onUpdate={(newGroup) => updateGroup(groupIndex, newGroup)}
                        onRemove={() => removeGroup(groupIndex)}
                        highlightedCondition={highlightedCondition}
                    />
                </div>
            ))}

            {safeFilters.groups.length > 0 && (
                <Button onClick={addGroup} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary mt-2">
                    <Plus className="w-4 h-4" /> Add OR Group
                </Button>
            )}
        </div>
    );
}

function FilterGroup({ group, index, onUpdate, onRemove, highlightedCondition }) {
    const addCondition = () => {
        const newCondition = { field: 'title', operator: 'contains', value: '', exclude: false };
        onUpdate({
            ...group,
            conditions: [...group.conditions, newCondition]
        });
    };

    const removeCondition = (conditionIndex) => {
        const newConditions = group.conditions.filter((_, i) => i !== conditionIndex);
        onUpdate({ ...group, conditions: newConditions });
    };

    const updateCondition = (conditionIndex, newCondition) => {
        const newConditions = group.conditions.map((c, i) => i === conditionIndex ? newCondition : c);
        onUpdate({ ...group, conditions: newConditions });
    };

    return (
        <Card className="bg-muted/30 border-l-4 border-l-primary/50 relative overflow-hidden group-hover:border-l-primary transition-colors">
            <CardContent className="p-4 space-y-3 pt-5">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>

                <div className="space-y-3">
                    {group.conditions.map((condition, cIndex) => {
                        // Check if this condition is highlighted
                        const isHighlighted = highlightedCondition &&
                            highlightedCondition.groupIndex === index &&
                            highlightedCondition.condIndex === cIndex;

                        return (
                            <div
                                key={cIndex}
                                className={cn(
                                    "flex items-center gap-2 group/condition transition-all rounded-lg p-2 -mx-2",
                                    isHighlighted && "bg-primary/10 ring-2 ring-primary/50"
                                )}
                            >
                                {cIndex > 0 && (
                                    <div className="text-[10px] font-bold text-muted-foreground w-8 text-center shrink-0">AND</div>
                                )}
                                {cIndex === 0 && (
                                    <div className="w-8 shrink-0 flex justify-center">
                                        <CornerDownRight className="w-4 h-4 text-muted-foreground/50" />
                                    </div>
                                )}

                                <FilterCondition
                                    condition={condition}
                                    onUpdate={(newCond) => updateCondition(cIndex, newCond)}
                                />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/condition:opacity-100 transition-opacity ml-auto"
                                    onClick={() => removeCondition(cIndex)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        );
                    })}
                </div>

                <div className="pl-10 pt-1">
                    <Button onClick={addCondition} variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                        <Plus className="w-3 h-3" /> Add Condition
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function FilterCondition({ condition, onUpdate }) {
    const [inputValue, setInputValue] = useState('');
    const fieldConfig = FIELDS.find(f => f.value === condition.field) || FIELDS[0];
    const operators = OPERATORS[fieldConfig.type] || OPERATORS.text;

    // Multi-value support: condition.value can be string or array
    // For UI convenience, we show chips for multi-value fields
    const values = Array.isArray(condition.value) ? condition.value : (condition.value ? [condition.value] : []);
    const isMultiValue = values.length > 1 || (values.length === 1 && inputValue);

    const handleFieldChange = (e) => {
        const newField = e.target.value;
        const newConfig = FIELDS.find(f => f.value === newField);
        const newOps = OPERATORS[newConfig.type] || OPERATORS.text;

        // Use smart default operator for the field
        const defaultOp = newConfig.defaultOp || newOps[0].value;

        // Reset operator if current one fits new type, otherwise use default
        const currentOpValid = newOps.find(op => op.value === condition.operator);

        onUpdate({
            ...condition,
            field: newField,
            operator: currentOpValid ? condition.operator : defaultOp,
            value: newConfig.type === 'boolean' ? '' : '', // Reset value for type change
            exclude: condition.exclude || false
        });
    };

    // Add a chip value
    const addChipValue = () => {
        if (!inputValue.trim()) return;

        const newValues = [...values, inputValue.trim()];
        onUpdate({ ...condition, value: newValues.length === 1 ? newValues[0] : newValues });
        setInputValue('');
    };

    // Remove a chip value
    const removeChipValue = (index) => {
        const newValues = values.filter((_, i) => i !== index);
        onUpdate({ ...condition, value: newValues.length === 1 ? newValues[0] : (newValues.length > 0 ? newValues : '') });
    };

    // Handle Enter key for chips
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addChipValue();
        }
    };

    return (
        <div className="flex-1 flex flex-col gap-2">
            <div className="flex gap-2 items-center">
                {/* Include/Exclude Toggle (Sales Navigator-style) */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => onUpdate({ ...condition, exclude: false })}
                        className={cn(
                            "px-2 py-1 text-xs font-medium rounded-l transition-colors",
                            !condition.exclude
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        Include
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate({ ...condition, exclude: true })}
                        className={cn(
                            "px-2 py-1 text-xs font-medium rounded-r transition-colors",
                            condition.exclude
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        Exclude
                    </button>
                </div>

                {/* Field Selector */}
                <div className="w-1/3 min-w-[120px]">
                    <select
                        className={cn(
                            "w-full h-8 rounded-md border border-input bg-background pl-2 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            condition.exclude && "opacity-60"
                        )}
                        value={condition.field}
                        onChange={handleFieldChange}
                    >
                        {FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                </div>

                {/* Operator Selector */}
                <div className="w-[140px]">
                    <select
                        className={cn(
                            "w-full h-8 rounded-md border border-input bg-background pl-2 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            condition.exclude && "opacity-60"
                        )}
                        value={condition.operator}
                        onChange={(e) => onUpdate({ ...condition, operator: e.target.value })}
                    >
                        {operators.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                    </select>
                </div>

                {/* Value Input */}
                <div className="flex-1">
                    {fieldConfig.type === 'boolean' ? (
                        <div className="text-xs text-muted-foreground px-2 italic">
                            {/* Boolean fields use operator (exists/not exists) - no value needed */}
                        </div>
                    ) : fieldConfig.type === 'select' ? (
                        <select
                            className={cn(
                                "w-full h-8 rounded-md border border-input bg-background pl-2 pr-8 text-sm",
                                condition.exclude && "opacity-60 line-through"
                            )}
                            value={condition.value}
                            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
                        >
                            <option value="">Select...</option>
                            {fieldConfig.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <Input
                            className={cn(
                                "h-8",
                                condition.exclude && "opacity-60 line-through"
                            )}
                            placeholder="Value..."
                            value={isMultiValue ? inputValue : (condition.value || '')}
                            onChange={(e) => isMultiValue ? setInputValue(e.target.value) : onUpdate({ ...condition, value: e.target.value })}
                            onKeyDown={isMultiValue ? handleKeyDown : undefined}
                        />
                    )}
                </div>
            </div>

            {/* Multi-value chips (Sales Navigator-style visual convenience) */}
            {/* Note: Each chip becomes its own condition internally - this is just UI sugar */}
            {values.length > 0 && isMultiValue && (
                <div className="flex flex-wrap gap-1 pl-24">
                    {values.map((val, idx) => (
                        <Badge
                            key={idx}
                            variant={condition.exclude ? "destructive" : "secondary"}
                            className="gap-1 pr-1"
                        >
                            {val}
                            <button
                                type="button"
                                onClick={() => removeChipValue(idx)}
                                className="hover:bg-background/20 rounded-full p-0.5"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
