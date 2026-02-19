import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { MoreVertical, Mail, Phone, Linkedin, Eye, Send, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function CampaignLeadsTable({
    leads = [],
    selectedLeads = [], // Array of IDs
    onToggleLead,
    onToggleAll,
    onContactLead,
    onAutoConnectSelected
}) {
    const navigate = useNavigate();

    // Helper to check if a lead is selected
    const isSelected = (id) => selectedLeads.includes(id);

    // Calculate selection state
    const allSelected = leads.length > 0 && leads.every(l => isSelected(l.id));
    const isIndeterminate = leads.some(l => isSelected(l.id)) && !allSelected;

    return (
        <div className="rounded-md border bg-card/50">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
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
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="min-w-[150px]">Contact</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No leads in this campaign yet.
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => (
                            <TableRow key={lead.id} data-state={isSelected(lead.id) ? "selected" : undefined}>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        className="accent-primary h-4 w-4 cursor-pointer"
                                        checked={isSelected(lead.id)}
                                        onChange={() => onToggleLead(lead.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-background">
                                            {lead.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate max-w-[150px]" title={lead.full_name}>
                                                {lead.full_name || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-medium text-muted-foreground truncate block max-w-[150px]" title={lead.company}>
                                        {lead.company || '—'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-muted-foreground truncate block max-w-[150px]" title={lead.title}>
                                        {lead.title || '—'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        {lead.email ? (
                                            <div className="flex items-center gap-1.5 text-xs text-foreground/90">
                                                <Mail className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate max-w-[150px]" title={lead.email}>{lead.email}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                                <Mail className="h-3 w-3" /> —
                                            </div>
                                        )}
                                        {lead.phone ? (
                                            <div className="flex items-center gap-1.5 text-xs text-foreground/90">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <span className="truncate max-w-[150px]" title={lead.phone}>{lead.phone}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                                <Phone className="h-3 w-3" /> —
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={
                                        lead.status === 'replied' ? 'default' :
                                            lead.status === 'contacted' ? 'secondary' :
                                                lead.status === 'failed' ? 'destructive' :
                                                    'outline'
                                    } className="capitalize">
                                        {lead.status || 'Pending'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => navigate(`/leads/${lead.lead_id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" /> View Lead
                                                </DropdownMenuItem>
                                                {lead.linkedin_url && (
                                                    <DropdownMenuItem asChild>
                                                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer">
                                                            <Linkedin className="mr-2 h-4 w-4 text-[#0077b5]" /> View LinkedIn
                                                        </a>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => onContactLead(lead)}>
                                                    <Send className="mr-2 h-4 w-4" /> Auto Connect
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
