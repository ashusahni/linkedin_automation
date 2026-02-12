// Campaign Leads Table with checkboxes, Email/Phone, and Auto Connect button
import { useState } from 'react';
import { Link as LinkIcon, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import { cn } from '../lib/utils';

export default function CampaignLeadsTable({ leads, onContactLead, onAutoConnectSelected }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);

    const leadIds = leads.map((l) => l.id ?? l.lead_id).filter(Boolean);
    const allSelected = leadIds.length > 0 && selectedIds.size === leadIds.length;
    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(leadIds));
    };
    const toggleOne = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleAutoConnectSelected = () => {
        if (onAutoConnectSelected && selectedIds.size > 0) {
            onAutoConnectSelected(Array.from(selectedIds));
        }
    };

    return (
        <div className="space-y-4">
            {onAutoConnectSelected && selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/5">
                    <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                    <Button
                        size="sm"
                        onClick={handleAutoConnectSelected}
                        className="bg-purple-600 hover:bg-purple-500"
                    >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Auto Connect ({selectedIds.size})
                    </Button>
                </div>
            )}
            <div className="rounded-lg border border-white/10 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="w-12">
                                <input
                                    type="checkbox"
                                    className="rounded border-white/20 bg-white/5 checked:bg-primary cursor-pointer"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead className="text-white font-semibold">Name</TableHead>
                            <TableHead className="text-white font-semibold">Title</TableHead>
                            <TableHead className="text-white font-semibold">Company</TableHead>
                            <TableHead className="text-white font-semibold">Email</TableHead>
                            <TableHead className="text-white font-semibold">Phone</TableHead>
                            <TableHead className="text-white font-semibold">
                                <div className="flex items-center gap-1.5">
                                    Status
                                    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                                        <DialogTrigger asChild>
                                            <button
                                                className="inline-flex items-center justify-center rounded-full hover:bg-white/10 p-1 transition-colors"
                                                onClick={() => setStatusDialogOpen(true)}
                                            >
                                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-sm">
                                            <DialogHeader>
                                                <DialogTitle className="text-base">Status Guide</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-2 py-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Badge variant="secondary" className="text-xs">New</Badge>
                                                    <span className="text-muted-foreground">Just added</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                                                    <span className="text-muted-foreground">Request sent</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Badge variant="default" className="text-xs">Contacted</Badge>
                                                    <span className="text-muted-foreground">Connected/messaged</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Badge variant="default" className="text-xs bg-green-600">Responded</Badge>
                                                    <span className="text-muted-foreground">Lead replied</span>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </TableHead>
                            <TableHead className="text-white font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.map((lead) => {
                            const id = lead.id ?? lead.lead_id;
                            return (
                                <TableRow key={id} className={cn("border-white/5 hover:bg-white/5", selectedIds.has(id) && "bg-primary/5")}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            className="rounded border-white/20 bg-white/5 checked:bg-primary cursor-pointer"
                                            checked={selectedIds.has(id)}
                                            onChange={() => toggleOne(id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {lead.full_name || (lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.full_name) || '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {lead.title || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {lead.company || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {lead.email ? (
                                            <a
                                                href={`mailto:${lead.email}`}
                                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                            >
                                                {lead.email}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground">NA</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {lead.phone || 'NA'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={lead.status === 'contacted' ? 'default' : 'secondary'}
                                            className="capitalize"
                                        >
                                            {lead.status || 'new'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => onContactLead && onContactLead(lead)}
                                            className="bg-purple-600 hover:bg-purple-500"
                                            title="Send LinkedIn connection request via Data Source"
                                        >
                                            <LinkIcon className="w-3 h-3 mr-1" />
                                            Auto Connect
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {leads.length === 0 && (
                <div className="text-center py-12 bg-card/20 rounded-lg border border-white/5">
                    <p className="text-sm text-muted-foreground">No leads in this campaign yet.</p>
                </div>
            )}
        </div>
    );
}
