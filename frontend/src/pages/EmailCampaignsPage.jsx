import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Mail,
    Send,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    ExternalLink,
    Megaphone,
    Loader2,
    ArrowRight,
    CheckCheck,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s) {
    return typeof s === 'string' && EMAIL_REGEX.test(s.trim());
}

export default function EmailCampaignsPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [emailStatus, setEmailStatus] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [manualTo, setManualTo] = useState('');
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualSubject, setManualSubject] = useState('');
    const [manualContent, setManualContent] = useState('');
    const [manualSending, setManualSending] = useState(false);
    // Approve modal: list of pending email drafts, approve per lead or approve all
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [approveModalCampaign, setApproveModalCampaign] = useState(null);
    const [approveModalPending, setApproveModalPending] = useState([]);
    const [approveModalLoading, setApproveModalLoading] = useState(false);
    const [approveModalApprovingId, setApproveModalApprovingId] = useState(null);
    const [approveModalApprovingAll, setApproveModalApprovingAll] = useState(false);
    // Send modal
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [sendModalCampaign, setSendModalCampaign] = useState(null);
    const [sendModalLeads, setSendModalLeads] = useState([]);
    const [sendModalManualEmails, setSendModalManualEmails] = useState({});
    const [sendModalLoading, setSendModalLoading] = useState(false);
    const [sendModalSending, setSendModalSending] = useState(false);

    useEffect(() => {
        axios.get('/api/email/status')
            .then((r) => setEmailStatus(r.data))
            .catch(() => setEmailStatus({ configured: false, provider: 'none', message: 'Could not load status' }))
            .finally(() => setLoadingStatus(false));
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const campaignsToShow = campaigns;

    const fetchCampaigns = () => {
        setLoadingCampaigns(true);
        axios.get('/api/campaigns')
            .then((r) => setCampaigns(Array.isArray(r.data) ? r.data : []))
            .catch(() => setCampaigns([]))
            .finally(() => setLoadingCampaigns(false));
    };

    const openManualEmailModal = (e) => {
        e.preventDefault();
        if (!manualTo?.trim()) {
            addToast('Enter an email address', 'error');
            return;
        }
        if (!isValidEmail(manualTo.trim())) {
            addToast('Enter a valid email address', 'error');
            return;
        }
        setManualSubject('');
        setManualContent('');
        setManualModalOpen(true);
    };

    const handleSendManualEmail = async (e) => {
        e.preventDefault();
        setManualSending(true);
        try {
            await axios.post('/api/email/manual', {
                to: manualTo.trim(),
                subject: manualSubject.trim() || '(No subject)',
                content: manualContent.trim() || '',
            });
            addToast(`Email sent to ${manualTo.trim()}`, 'success');
            setManualModalOpen(false);
            setManualTo('');
            setManualSubject('');
            setManualContent('');
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to send email';
            addToast(msg, 'error');
        } finally {
            setManualSending(false);
        }
    };

    const openApproveModal = async (e, campaign) => {
        e.stopPropagation();
        setApproveModalCampaign(campaign);
        setApproveModalPending([]);
        setApproveModalOpen(true);
        setApproveModalLoading(true);
        try {
            const res = await axios.get(`/api/sow/approvals?campaign_id=${campaign.id}`);
            const items = Array.isArray(res.data) ? res.data : [];
            const emailPending = items.filter((a) => a.step_type === 'email' || a.step_type === 'gmail_outreach');
            setApproveModalPending(emailPending);
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to load pending drafts', 'error');
            setApproveModalOpen(false);
        } finally {
            setApproveModalLoading(false);
        }
    };

    const closeApproveModal = () => {
        setApproveModalOpen(false);
        setApproveModalCampaign(null);
        setApproveModalPending([]);
        setApproveModalApprovingId(null);
        setApproveModalApprovingAll(false);
        setLoadingCampaigns(true);
        axios.get(buildCampaignsQuery())
            .then((r) => setCampaigns(Array.isArray(r.data) ? r.data : []))
            .catch(() => {})
            .finally(() => setLoadingCampaigns(false));
    };

    const handleApproveModalOpenChange = (open) => {
        if (!open) closeApproveModal();
    };

    const handleApproveOne = async (approvalId) => {
        setApproveModalApprovingId(approvalId);
        try {
            await axios.post(`/api/sow/approvals/${approvalId}/review`, { action: 'approve' });
            setApproveModalPending((prev) => prev.filter((a) => a.id !== approvalId));
            addToast('Draft approved', 'success');
        } catch (err) {
            addToast(err.response?.data?.error || 'Approve failed', 'error');
        } finally {
            setApproveModalApprovingId(null);
        }
    };

    const handleApproveAll = async () => {
        if (approveModalPending.length === 0) return;
        setApproveModalApprovingAll(true);
        try {
            const ids = approveModalPending.map((a) => a.id);
            await axios.post('/api/sow/approvals/bulk-approve', { ids });
            addToast(`Approved ${ids.length} draft(s)`, 'success');
            closeApproveModal();
        } catch (err) {
            addToast(err.response?.data?.error || 'Bulk approve failed', 'error');
        } finally {
            setApproveModalApprovingAll(false);
        }
    };

    const openSendModal = async (e, campaign) => {
        e.stopPropagation();
        if ((campaign.approved_email_count ?? 0) === 0) {
            addToast('Approve email drafts first. Use the Approve button to open the list.', 'info');
            return;
        }
        setSendModalCampaign(campaign);
        setSendModalLeads([]);
        setSendModalManualEmails({});
        setSendModalOpen(true);
        setSendModalLoading(true);
        try {
            const [leadsRes, approvedRes] = await Promise.all([
                axios.get(`/api/campaigns/${campaign.id}/leads`),
                axios.get(`/api/sow/approvals?campaign_id=${campaign.id}&status=approved`),
            ]);
            const allLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
            const approvedItems = Array.isArray(approvedRes.data) ? approvedRes.data : [];
            const approvedLeadIds = new Set(approvedItems.map((a) => a.lead_id));
            const approvedLeadsOnly = allLeads.filter((l) => approvedLeadIds.has(l.id));
            setSendModalLeads(approvedLeadsOnly);
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to load leads', 'error');
            setSendModalOpen(false);
        } finally {
            setSendModalLoading(false);
        }
    };

    const sendModalLeadsWithEmail = sendModalLeads.filter((l) => l.email && String(l.email).trim());
    const sendModalLeadsWithoutEmail = sendModalLeads.filter((l) => !l.email || !String(l.email).trim());
    const sendModalHasAnyEmail = sendModalLeadsWithEmail.length > 0;
    const sendModalAllHaveEmail = sendModalLeadsWithoutEmail.length === 0;
    const sendModalNoneHaveEmail = sendModalLeadsWithEmail.length === 0;
    const sendModalEffectiveEmails = { ...Object.fromEntries(sendModalLeadsWithEmail.map((l) => [l.id, l.email])), ...sendModalManualEmails };
    const sendModalLeadIdsToSend = sendModalLeads.filter((l) => {
        if (sendModalLeadsWithEmail.some((w) => w.id === l.id)) return true;
        const manual = sendModalManualEmails[l.id];
        return manual && isValidEmail(manual);
    }).map((l) => l.id);
    const sendModalCanSend = sendModalLeadIdsToSend.length > 0;

    const saveManualEmailsToDb = async () => {
        const toSave = Object.entries(sendModalManualEmails).filter(([, v]) => v && String(v).trim());
        if (toSave.length === 0) return;
        setSendModalSending(true);
        try {
            for (const [leadId, email] of toSave) {
                if (!isValidEmail(email)) continue;
                await axios.put(`/api/leads/${leadId}`, { email: email.trim() });
            }
            addToast(`Saved ${toSave.length} email(s) to contacts`, 'success');
        } catch (err) {
            addToast(err.response?.data?.error || 'Failed to save emails', 'error');
        } finally {
            setSendModalSending(false);
        }
    };

    const handleSendModalSend = async () => {
        if (!sendModalCampaign || !sendModalCanSend) return;
        setSendModalSending(true);
        try {
            await saveManualEmailsToDb();
            const res = await axios.post(`/api/campaigns/${sendModalCampaign.id}/send-approved-emails`, {
                leadIds: sendModalLeadIdsToSend,
            });
            addToast(res.data?.message || `Sent ${res.data?.sent ?? 0} email(s)`, 'success');
            setSendModalOpen(false);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to send emails';
            addToast(msg, 'error');
        } finally {
            setSendModalSending(false);
        }
    };

    const handleSendModalContinueWithout = async () => {
        if (!sendModalCampaign || sendModalLeadsWithEmail.length === 0) return;
        setSendModalSending(true);
        try {
            const res = await axios.post(`/api/campaigns/${sendModalCampaign.id}/send-approved-emails`, {
                leadIds: sendModalLeadsWithEmail.map((l) => l.id),
            });
            addToast(res.data?.message || `Sent ${res.data?.sent ?? 0} email(s)`, 'success');
            setSendModalOpen(false);
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to send emails';
            addToast(msg, 'error');
        } finally {
            setSendModalSending(false);
        }
    };

    const handleSendModalSaveEmailsOnly = async () => {
        const invalid = sendModalLeadsWithoutEmail.filter((l) => {
            const v = sendModalManualEmails[l.id];
            return v && String(v).trim() && !isValidEmail(v);
        });
        if (invalid.length > 0) {
            addToast('Please enter valid email addresses', 'error');
            return;
        }
        await saveManualEmailsToDb();
        setSendModalOpen(false);
    };

    return (
        <div className="relative flex flex-col min-h-0 pb-8">
            <div className="aurora-bg fixed inset-0 -z-10" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/95 via-background/90 to-background" />

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/30">
                    <div className="flex items-center gap-4">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 via-pink-500/15 to-fuchsia-500/20 border border-rose-500/25 shadow-lg shadow-rose-500/10 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            <Mail className="relative w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Email Campaigns</h1>
                            <p className="text-muted-foreground text-sm mt-0.5">Service status, manual email, and Gmail drafts by campaign</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl border-border/50"
                        onClick={() => {
                            setLoadingStatus(true);
                            axios.get('/api/email/status')
                                .then((r) => setEmailStatus(r.data))
                                .catch(() => setEmailStatus({ configured: false }))
                                .finally(() => setLoadingStatus(false));
                        }}
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh status
                    </Button>
                </div>

                {/* 1. Email service status */}
                <Card className="border-border/40 bg-card/60">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            {emailStatus?.configured ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                            )}
                            Email service status
                        </CardTitle>
                        <CardDescription>SendGrid or AWS SES used for manual and failover emails</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStatus ? (
                            <Skeleton className="h-16 w-full rounded-lg" />
                        ) : (
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className={cn(
                                    "font-medium",
                                    emailStatus?.configured ? "text-emerald-500" : "text-amber-500"
                                )}>
                                    {emailStatus?.configured ? 'Configured' : 'Not configured'}
                                </span>
                                {emailStatus?.provider && emailStatus.provider !== 'none' && (
                                    <>
                                        <span className="text-muted-foreground">Provider:</span>
                                        <span className="font-mono text-foreground">{emailStatus.provider}</span>
                                    </>
                                )}
                                {emailStatus?.senderEmail && (
                                    <>
                                        <span className="text-muted-foreground">Sender:</span>
                                        <span className="font-mono text-foreground text-xs">{emailStatus.senderEmail}</span>
                                    </>
                                )}
                                {emailStatus?.message && (
                                    <p className="text-muted-foreground w-full mt-1">{emailStatus.message}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Send manual email */}
                <Card className="border-border/40 bg-card/60">
                    <CardHeader>
                        <CardTitle className="text-white">Send manual email</CardTitle>
                        <CardDescription>Enter an email and click Send to compose and send a message via your configured provider (SendGrid/SES)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={openManualEmailModal} className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">To</label>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={manualTo}
                                    onChange={(e) => setManualTo(e.target.value)}
                                    className="h-9 rounded-xl border-border/50 bg-background"
                                    disabled={!emailStatus?.configured}
                                />
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                className="gap-2 rounded-xl"
                                disabled={!emailStatus?.configured}
                            >
                                <Send className="w-4 h-4" />
                                Send
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Manual email compose modal */}
                <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
                    <DialogContent className="sm:max-w-lg bg-card border-border/50">
                        <DialogHeader>
                            <DialogTitle className="text-white">Compose email</DialogTitle>
                            <p className="text-sm text-muted-foreground">To: {manualTo}</p>
                        </DialogHeader>
                        <form onSubmit={handleSendManualEmail} className="space-y-4 mt-2">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Subject</label>
                                <Input
                                    value={manualSubject}
                                    onChange={(e) => setManualSubject(e.target.value)}
                                    placeholder="Email subject"
                                    className="rounded-xl border-border/50 bg-background"
                                    disabled={manualSending}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Content</label>
                                <textarea
                                    value={manualContent}
                                    onChange={(e) => setManualContent(e.target.value)}
                                    placeholder="Write your email content here..."
                                    rows={8}
                                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y min-h-[120px]"
                                    disabled={manualSending}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)} disabled={manualSending}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="gap-2" disabled={manualSending}>
                                    {manualSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {manualSending ? 'Sending...' : 'Send'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 3. Campaigns list — vertical, clickable; opens campaign email approval tab */}
                <Card className="border-border/40 bg-card/60">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-rose-400" />
                            Campaigns
                        </CardTitle>
                        <CardDescription>Click a campaign to open its email approval tab — edit, regenerate, and approve Gmail drafts there.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingCampaigns ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : campaignsToShow.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-white/5">
                                <p className="text-sm">No campaigns yet.</p>
                                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => navigate('/campaigns')}>
                                    <ArrowRight className="w-4 h-4" /> Go to LinkedIn campaigns
                                </Button>
                            </div>
                        ) : (
                            <div className="max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 -mr-1 pb-0.5">
                                <div className="flex flex-col gap-2">
                                    {campaignsToShow.map((c) => (
                                        <div
                                            key={c.id}
                                            className={cn(
                                                "group w-full rounded-lg border transition-all duration-200 flex items-center gap-3 px-3 py-2.5",
                                                "border-border/40 bg-card/50 hover:bg-white/10 hover:border-rose-500/25 hover:shadow-sm"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/campaigns/${c.id}?tab=approvals&channel=gmail`)}
                                                className="flex flex-1 min-w-0 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 rounded"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/20">
                                                    <Mail className="h-3.5 w-3.5 text-rose-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate leading-snug">{c.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0">
                                                            {(c.type || c.goal || 'standard').replace(/_/g, ' ')}
                                                        </Badge>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Leads {c.lead_count ?? 0}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-rose-500" />
                                            </button>
                                            <div className="flex items-center gap-1.5 shrink-0 border-l border-border/40 pl-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-7 text-[11px] px-2 gap-1",
                                                        (c.approved_email_count ?? 0) > 0 && "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                                                    )}
                                                    onClick={(e) => openApproveModal(e, c)}
                                                >
                                                    <CheckCheck className="h-3 w-3" />
                                                    Approve
                                                    {(c.approved_email_count ?? 0) > 0 && (
                                                        <span className="tabular-nums"> ({c.approved_email_count})</span>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-[11px] px-2 gap-1 bg-rose-600 hover:bg-rose-500"
                                                    onClick={(e) => openSendModal(e, c)}
                                                    disabled={!emailStatus?.configured || (c.approved_email_count ?? 0) === 0}
                                                    title={(c.approved_email_count ?? 0) === 0 ? 'Approve drafts first' : 'Send to approved leads'}
                                                >
                                                    <Send className="h-3 w-3" />
                                                    Send
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Approve modal: list of pending drafts with Approve per row + Approve all */}
                <Dialog open={approveModalOpen} onOpenChange={handleApproveModalOpenChange}>
                    <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {approveModalCampaign ? `Approve email drafts — ${approveModalCampaign.name}` : 'Approve email drafts'}
                            </DialogTitle>
                        </DialogHeader>
                        {approveModalLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : approveModalPending.length === 0 ? (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    No pending email drafts. Approved leads will appear in Send.
                                </p>
                                <Button variant="outline" size="sm" onClick={closeApproveModal}>
                                    Close
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {approveModalPending.length} draft(s) pending. Approve to move leads to the send phase.
                                </p>
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                                        onClick={handleApproveAll}
                                        disabled={approveModalApprovingAll}
                                    >
                                        {approveModalApprovingAll ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <CheckCheck className="h-4 w-4" />
                                        )}
                                        Approve all ({approveModalPending.length})
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {approveModalPending.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/40 bg-card/50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {a.first_name} {a.last_name}
                                                </p>
                                                {a.company && (
                                                    <p className="text-[11px] text-muted-foreground truncate">{a.company}</p>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[11px] px-2 gap-1 shrink-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                                                onClick={() => handleApproveOne(a.id)}
                                                disabled={approveModalApprovingId !== null}
                                            >
                                                {approveModalApprovingId === a.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <CheckCheck className="h-3 w-3" />
                                                )}
                                                Approve
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={closeApproveModal} className="w-full">
                                    Close
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Send modal */}
                <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
                    <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {sendModalCampaign ? `Send email — ${sendModalCampaign.name}` : 'Send email'}
                            </DialogTitle>
                        </DialogHeader>
                        {sendModalLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : sendModalLeads.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No approved leads. Use Approve to approve email drafts first.</p>
                        ) : sendModalNoneHaveEmail && sendModalLeadsWithoutEmail.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No leads in this campaign.</p>
                        ) : (
                            <div className="space-y-4">
                                {sendModalAllHaveEmail && (
                                    <p className="text-sm text-muted-foreground">
                                        Send approved email draft to <strong>{sendModalLeadsWithEmail.length}</strong> lead(s) with email.
                                    </p>
                                )}
                                {!sendModalAllHaveEmail && sendModalHasAnyEmail && (
                                    <p className="text-sm text-muted-foreground">
                                        <strong>{sendModalLeadsWithoutEmail.length}</strong> lead(s) don&apos;t have an email. Enter email below or continue without them.
                                    </p>
                                )}
                                {sendModalNoneHaveEmail && (
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        No email found for any lead. Enter email manually for each contact — they will be saved to the lead record.
                                    </p>
                                )}

                                {sendModalLeadsWithoutEmail.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">Enter email for leads without one (saved to contact)</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {sendModalLeadsWithoutEmail.map((l) => (
                                                <div key={l.id} className="flex items-center gap-2">
                                                    <span className="text-xs text-foreground truncate w-32 shrink-0">
                                                        {l.first_name} {l.last_name}
                                                    </span>
                                                    <Input
                                                        type="email"
                                                        placeholder="email@example.com"
                                                        value={sendModalManualEmails[l.id] ?? ''}
                                                        onChange={(e) =>
                                                            setSendModalManualEmails((prev) => ({ ...prev, [l.id]: e.target.value }))
                                                        }
                                                        className="h-8 text-sm flex-1 min-w-0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-2">
                                    {sendModalAllHaveEmail && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => setSendModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-rose-600 hover:bg-rose-500"
                                                onClick={handleSendModalSend}
                                                disabled={sendModalSending}
                                            >
                                                {sendModalSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                {sendModalSending ? 'Sending...' : `Send to ${sendModalLeadsWithEmail.length} lead(s)`}
                                            </Button>
                                        </>
                                    )}
                                    {!sendModalAllHaveEmail && sendModalHasAnyEmail && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => setSendModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSendModalContinueWithout}
                                                disabled={sendModalSending}
                                            >
                                                {sendModalSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                Continue without these ({sendModalLeadsWithEmail.length} with email)
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-rose-600 hover:bg-rose-500"
                                                onClick={handleSendModalSend}
                                                disabled={sendModalSending || !sendModalCanSend}
                                            >
                                                {sendModalSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                Save emails &amp; send
                                            </Button>
                                        </>
                                    )}
                                    {sendModalNoneHaveEmail && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => setSendModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSendModalSaveEmailsOnly}
                                                disabled={
                                                    sendModalSending ||
                                                    !Object.values(sendModalManualEmails).some((v) => v && isValidEmail(v))
                                                }
                                            >
                                                {sendModalSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                Save emails to contacts
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-rose-600 hover:bg-rose-500"
                                                onClick={handleSendModalSend}
                                                disabled={sendModalSending || !sendModalCanSend}
                                            >
                                                {sendModalSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                Save &amp; send
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}
