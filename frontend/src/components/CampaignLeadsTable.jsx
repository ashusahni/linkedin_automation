import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { Mail, Phone, Clock, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Map campaign_leads.status → user-friendly label + color
const STATUS_MAP = {
    pending: { label: 'Pending', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
    ready_for_action: { label: 'Ready', color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
    processing: { label: 'Processing', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5' },
    needs_approval: { label: 'Needs Approval', color: 'text-orange-400 border-orange-400/30 bg-orange-400/5' },
    sent: { label: 'Sent', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
    replied: { label: 'Replied ✓', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' },
    completed: { label: 'Completed', color: 'text-violet-400 border-violet-400/30 bg-violet-400/5' },
    failed: { label: 'Failed', color: 'text-red-400 border-red-400/30 bg-red-400/5' },
    rejected: { label: 'Rejected', color: 'text-red-500 border-red-500/30 bg-red-500/5' },
};

// Map current_step number → friendly stage name (generic fallback, backend provides step type label)
function getSequenceStage(lead) {
    const step = lead.current_step;
    if (!step && step !== 0) return '—';
    // step_order is 1-indexed in DB
    return `Step ${step}`;
}

// Approval status badge
function ApprovalBadge({ status }) {
    if (status === 'needs_approval') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-orange-400 border-orange-400/30 bg-orange-400/5">
                <AlertCircle className="w-2.5 h-2.5" /> Awaiting
            </span>
        );
    }
    if (status === 'replied') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-emerald-400 border-emerald-400/30 bg-emerald-400/5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Replied – Stopped
            </span>
        );
    }
    if (status === 'completed') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-violet-400 border-violet-400/30 bg-violet-400/5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Done
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-red-400 border-red-400/30 bg-red-400/5">
                <XCircle className="w-2.5 h-2.5" /> Failed
            </span>
        );
    }
    if (status === 'processing') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-cyan-400 border-cyan-400/30 bg-cyan-400/5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border text-muted-foreground border-white/10 bg-white/5">
            <Clock className="w-2.5 h-2.5" /> Scheduled
        </span>
    );
}

export default function CampaignLeadsTable({
    leads = [],
    selectedLeads = [],
    onToggleLead,
    onToggleAll,
}) {
    const isSelected = (id) => selectedLeads.includes(id);
    const allSelected = leads.length > 0 && leads.every(l => isSelected(l.id));
    const isIndeterminate = leads.some(l => isSelected(l.id)) && !allSelected;

    return (
        <div className="rounded-md border border-white/5 bg-card/50 overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="w-[40px]">
                            <input
                                type="checkbox"
                                className="accent-primary h-4 w-4 cursor-pointer"
                                checked={allSelected}
                                ref={input => {
                                    if (input) input.indeterminate = isIndeterminate;
                                }}
                                onChange={onToggleAll}
                            />
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sequence Stage</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Step</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval Status</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2">
                                    <Clock className="w-8 h-8 opacity-30" />
                                    <p className="text-sm">No leads in this campaign yet.</p>
                                    <p className="text-xs opacity-60">Add leads from the Campaigns page to get started.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => {
                            const statusInfo = STATUS_MAP[lead.status] || { label: lead.status || 'Pending', color: 'text-muted-foreground border-white/10 bg-white/5' };
                            return (
                                <TableRow
                                    key={lead.id}
                                    data-state={isSelected(lead.id) ? "selected" : undefined}
                                    className="border-white/5 hover:bg-white/2 transition-colors"
                                >
                                    {/* Checkbox */}
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            className="accent-primary h-4 w-4 cursor-pointer"
                                            checked={isSelected(lead.id)}
                                            onChange={() => onToggleLead(lead.id)}
                                        />
                                    </TableCell>

                                    {/* Lead Identity */}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-white/5 flex-shrink-0">
                                                {lead.full_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-sm text-white truncate max-w-[140px]" title={lead.full_name}>
                                                    {lead.full_name || 'Unknown'}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={lead.title}>
                                                    {lead.title ? `${lead.title}` : ''}
                                                    {lead.company ? ` · ${lead.company}` : ''}
                                                </span>
                                                {lead.phone && (
                                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/60">
                                                        <Phone className="w-2.5 h-2.5" />
                                                        <span className="truncate max-w-[90px]">{lead.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Sequence Stage — maps to status label */}
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                            statusInfo.color
                                        )}>
                                            {statusInfo.label}
                                        </span>
                                    </TableCell>

                                    {/* Current Step — step number from backend */}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                {lead.current_step ?? '—'}
                                            </span>
                                            {lead.step_type && (
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {lead.step_type.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Approval Status */}
                                    <TableCell>
                                        <ApprovalBadge status={lead.status} />
                                        {lead.status === 'replied' && (
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Sequence stopped</p>
                                        )}
                                    </TableCell>

                                    {/* Email */}
                                    <TableCell>
                                        {lead.email ? (
                                            <a
                                                href={`mailto:${lead.email}`}
                                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline truncate max-w-[160px]"
                                                title={lead.email}
                                            >
                                                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                                                <span className="truncate">{lead.email}</span>
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
