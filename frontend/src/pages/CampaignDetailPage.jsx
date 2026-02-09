import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, Play, Pause, Users, TrendingUp, CheckCircle2,
    XCircle, Clock, Edit2, Save, Plus, Trash2, Download,
    MessageSquare, Mail, Link as LinkIcon, ChevronRight, BarChart3, Settings as SettingsIcon,
    AlertCircle, AlertTriangle, Zap, Sparkles, Send, Eye, CheckCheck, Copy, Target, Tag, Flag,
    Phone, Search, Smartphone, AtSign, RefreshCw, Loader2, Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend
} from 'recharts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';
import { Skeleton, CampaignSkeleton, TableSkeleton } from '../components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import CampaignLeadsTable from '../components/CampaignLeadsTable';

export default function CampaignDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [campaign, setCampaign] = useState(null);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('leads'); // 'leads', 'analytics', 'approvals'
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});

    // New Step State
    const [showAddStep, setShowAddStep] = useState(false);
    const [newStep, setNewStep] = useState({ type: 'message', content: '', delay_days: 1 });

    // Bulk Enrich & Generate State
    const [enriching, setEnriching] = useState(false);
    const [enrichProgress, setEnrichProgress] = useState(null);
    const [selectedLeads, setSelectedLeads] = useState([]);

    // Approvals State
    const [approvals, setApprovals] = useState([]);
    const [selectedApprovals, setSelectedApprovals] = useState([]);
    const [editingApproval, setEditingApproval] = useState(null);
    const [approvalStatuses, setApprovalStatuses] = useState({}); // { approvalId: { status, containerId, sentAt } }
    const [recentActivity, setRecentActivity] = useState([]); // Recent sending activity
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [bulkPersonalizing, setBulkPersonalizing] = useState(false);
    const [showBulkPersonalizeModal, setShowBulkPersonalizeModal] = useState(false);
    const [bulkPersonalizeOptions, setBulkPersonalizeOptions] = useState({
        tone: 'professional',
        length: 'medium',
        focus: 'general'
    });
    const [optionsByApproval, setOptionsByApproval] = useState({}); // { approvalId: { tone, length, focus } }

    // Contact Scraper State
    const [scraping, setScraping] = useState(false);
    const [scrapeProgress, setScrapeProgress] = useState(null);
    const [scrapeJobId, setScrapeJobId] = useState(null);

    // Multi-channel Outreach State
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingSMS, setSendingSMS] = useState(false);
    const [showOutreachModal, setShowOutreachModal] = useState(false);
    const [outreachChannel, setOutreachChannel] = useState(null); // 'email' or 'sms'

    useEffect(() => {
        fetchCampaignDetails();
    }, [id]);

    const fetchRecentActivity = async () => {
        try {
            const res = await axios.get(`/api/sow/campaigns/${id}/activity`);
            setRecentActivity(res.data.activities || []);
        } catch (error) {
            console.error('Failed to fetch activity:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'approvals') {
            fetchApprovals();
            fetchRecentActivity();
            // Refresh activity every 10 seconds
            const interval = setInterval(fetchRecentActivity, 10000);
            return () => clearInterval(interval);
        }
    }, [activeTab, id]);

    // Poll for approval statuses when there are approved items
    useEffect(() => {
        const approvedIds = approvals
            .filter(a => a.status === 'approved')
            .map(a => a.id);

        if (approvedIds.length > 0) {
            // Check status for all approved items
            approvedIds.forEach(id => checkApprovalStatus(id));

            // Poll every 10 seconds
            const interval = setInterval(() => {
                approvedIds.forEach(id => checkApprovalStatus(id));
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [approvals]);

    const fetchCampaignDetails = async () => {
        try {
            setLoading(true);
            const [campaignRes, leadsRes] = await Promise.all([
                axios.get(`/api/campaigns/${id}`),
                axios.get(`/api/campaigns/${id}/leads`)
            ]);

            setCampaign(campaignRes.data);
            setFormData(campaignRes.data);
            setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
        } catch (error) {
            console.error('Failed to fetch campaign details', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to load campaign data';
            addToast(`Error loading campaign: ${errorMsg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const checkApprovalStatus = async (approvalId) => {
        try {
            const res = await axios.get(`/api/sow/approvals/${approvalId}/status`);
            setApprovalStatuses(prev => {
                const prevStatus = prev[approvalId];
                const newStatus = res.data;

                // Show prominent toast when status changes to 'sent'
                if (newStatus.sending_status === 'sent' && (!prevStatus || prevStatus.sending_status !== 'sent')) {
                    setTimeout(() => {
                        addToast(`🎉 SUCCESS! Message sent to ${newStatus.lead_name || 'lead'}! Container ID: ${newStatus.container_id?.substring(0, 12)}...`, 'success');
                    }, 100);
                }

                return {
                    ...prev,
                    [approvalId]: newStatus
                };
            });
        } catch (error) {
            console.error('Failed to check approval status:', error);
        }
    };

    const fetchApprovals = async () => {
        try {
            const res = await axios.get(`/api/sow/approvals?campaign_id=${id}`);
            setApprovals(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Failed to fetch approvals', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to load approvals';
            addToast(`Error loading approvals: ${errorMsg}`, 'error');
            setApprovals([]);
        }
    };

    const toggleSelectLead = (leadId) => {
        setSelectedLeads(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        );
    };

    const toggleSelectAllLeads = () => {
        if (selectedLeads.length === leads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l.lead_id || l.id));
        }
    };

    const handleBulkEnrichAndGenerate = async () => {
        // Use selected leads, or all leads if none selected
        const leadsToProcess = selectedLeads.length > 0 ? selectedLeads : leads.map(l => l.lead_id || l.id);

        if (leadsToProcess.length === 0) {
            addToast('No leads selected', 'error');
            return;
        }

        // Warn about OpenAI quota if many leads
        if (leadsToProcess.length > 10) {
            const confirmed = confirm(
                `⚠️ You are about to generate AI messages for ${leadsToProcess.length} leads.\n\n` +
                `This will use OpenAI API credits (approximately $0.001-0.002 per message).\n\n` +
                `Estimated cost: ~$${(leadsToProcess.length * 0.0015).toFixed(2)}\n\n` +
                `Continue?`
            );
            if (!confirmed) return;
        }

        try {
            setEnriching(true);
            setEnrichProgress({ current: 0, total: leadsToProcess.length, status: 'Starting...' });

            console.log(`🚀 Calling bulk enrich API for ${leadsToProcess.length} selected leads`);
            const res = await axios.post(`/api/campaigns/${id}/bulk-enrich-generate`, {
                leadIds: leadsToProcess
            });

            console.log('✅ Bulk enrich response:', res.data);

            if (!res.data || !res.data.results) {
                throw new Error('Invalid response from server');
            }

            setEnrichProgress({
                current: res.data.results.generated || 0,
                total: res.data.results.total || leads.length,
                status: res.data.results.failed?.length > 0
                    ? `Complete! ${res.data.results.failed.length} failed`
                    : 'Complete!'
            });

            const message = res.data.message || `Processed ${res.data.results.generated || 0} leads`;
            addToast(message, res.data.results.failed?.length > 0 ? 'warning' : 'success');

            // Refresh approvals and switch tab
            await fetchApprovals();

            // Switch to approvals tab
            setTimeout(() => {
                setActiveTab('approvals');
                setEnriching(false);
                setEnrichProgress(null);
            }, 1500);

        } catch (error) {
            console.error('❌ Bulk enrich failed:', error);
            let errorMessage = error.response?.data?.error || error.message || 'Failed to enrich and generate messages';

            // Check for quota errors
            if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota')) {
                errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing or wait before trying again.';
            }

            // Show detailed error with results if available
            if (error.response?.data?.results) {
                const results = error.response.data.results;
                errorMessage += `\n\nProcessed: ${results.generated || 0}/${results.total || 0} leads`;
                if (results.failed?.length > 0) {
                    errorMessage += `\nFailed: ${results.failed.length} leads`;
                }
            }

            addToast(`Error: ${errorMessage}`, 'error');
            setEnriching(false);
            setEnrichProgress(null);
        }
    };

    // Contact Scraper Handler
    const handleScrapeContacts = async () => {
        // If already scraping, cancel it
        if (scraping && scrapeJobId) {
            const confirmed = confirm('Stop the current scraping process?');
            if (!confirmed) return;

            try {
                console.log('🛑 Cancelling scraping...');
                const res = await axios.post(`/api/campaigns/${id}/scrape-contacts`, {
                    cancel: true
                });

                if (res.data.success) {
                    addToast('✅ Scraping cancelled', 'info');
                    setScraping(false);
                    setScrapeProgress(null);
                    setScrapeJobId(null);
                    fetchCampaignDetails(); // Refresh to show partial results
                } else {
                    addToast('No active scraping to cancel', 'info');
                }
            } catch (error) {
                console.error('Cancel error:', error);
                addToast('Failed to cancel scraping', 'error');
            }
            return;
        }

        // Start new scraping
        const leadsToProcess = selectedLeads.length > 0 ? selectedLeads : null;

        if (leads.length === 0) {
            addToast('No leads in campaign to scrape', 'error');
            return;
        }

        const confirmMsg = leadsToProcess
            ? `Scrape contact info (email/phone) for ${leadsToProcess.length} selected leads?`
            : `Scrape contact info (email/phone) for leads missing contact info?`;

        if (!confirm(`${confirmMsg}\n\n✅ Smart scraping: Only scrapes leads without contact info\n🛑 Click button again to stop while running\n\nContinue?`)) {
            return;
        }

        try {
            setScraping(true);
            setScrapeProgress({ status: 'Checking...', processed: 0, total: 0 });

            console.log('🔍 Starting contact scrape...');
            const res = await axios.post(`/api/campaigns/${id}/scrape-contacts`, {
                leadIds: leadsToProcess
            });

            if (res.data.error) {
                throw new Error(res.data.error);
            }

            // Check if all leads already have contact info
            if (res.data.alreadyComplete) {
                addToast(`✅ ${res.data.message}`, 'success');
                setScraping(false);
                setScrapeProgress(null);
                return;
            }

            const jobId = res.data.jobId;
            setScrapeJobId(jobId);

            const needsScraping = res.data.needsScraping;
            addToast(`🔍 Scraping ${needsScraping} leads... (Click button to stop)`, 'info');

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`/api/campaigns/scrape-status/${jobId}`);
                    const status = statusRes.data;

                    setScrapeProgress({
                        status: status.status,
                        processed: status.processed || 0,
                        total: status.total || 0,
                        found: status.found || 0,
                        skipped: status.skipped || 0,
                        alreadyHadContacts: status.alreadyHadContacts || 0,
                        progress: status.progress || 0,
                        cancelled: status.cancelled
                    });

                    if (status.status === 'completed') {
                        clearInterval(pollInterval);
                        setScraping(false);
                        setScrapeJobId(null);
                        addToast(`✅ Scraping complete! Found ${status.found} contacts from ${status.processed} leads scraped. ${status.alreadyHadContacts || 0} already had info.`, 'success');
                        fetchCampaignDetails(); // Refresh to show new contact info
                        setTimeout(() => setScrapeProgress(null), 3000);
                    } else if (status.status === 'cancelled') {
                        clearInterval(pollInterval);
                        setScraping(false);
                        setScrapeJobId(null);
                        addToast(`🛑 Scraping cancelled at ${status.processed}/${status.total} leads. Found ${status.found} contacts.`, 'info');
                        fetchCampaignDetails(); // Refresh to show partial results
                        setTimeout(() => setScrapeProgress(null), 2000);
                    } else if (status.status === 'error') {
                        clearInterval(pollInterval);
                        setScraping(false);
                        setScrapeJobId(null);
                        addToast(`❌ Scraping error: ${status.error}`, 'error');
                        setTimeout(() => setScrapeProgress(null), 3000);
                    }
                } catch (pollError) {
                    console.error('Polling error:', pollError);
                }
            }, 3000); // Poll every 3 seconds

            // Stop polling after 10 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                if (scraping) {
                    setScraping(false);
                    setScrapeJobId(null);
                    addToast('Scraping is taking longer than expected. Check backend logs.', 'warning');
                }
            }, 600000);

        } catch (error) {
            console.error('❌ Contact scrape failed:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to start contact scraping';
            addToast(`Error: ${errorMessage}`, 'error');
            setScraping(false);
            setScrapeProgress(null);
            setScrapeJobId(null);
        }
    };

    // Multi-channel Outreach Handlers
    const handleEmailOutreach = async () => {
        const leadsToContact = selectedLeads.length > 0 ? selectedLeads : leads.map(l => l.lead_id || l.id);

        if (leadsToContact.length === 0) {
            addToast('No leads to contact', 'error');
            return;
        }

        // Count leads with email
        const leadsWithEmail = leads.filter(l =>
            (selectedLeads.length === 0 || selectedLeads.includes(l.lead_id || l.id)) && l.email
        );

        if (leadsWithEmail.length === 0) {
            addToast('No leads have email addresses. Run Contact Scraper first!', 'error');
            return;
        }

        const confirmed = confirm(
            `Send AI-generated personalized emails to ${leadsWithEmail.length} leads?\n\n` +
            `This will use the scraped email addresses and generate personalized content using AI.\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        try {
            setSendingEmail(true);
            addToast(`Sending emails to ${leadsWithEmail.length} leads...`, 'info');

            const res = await axios.post(`/api/campaigns/${id}/outreach/email`, {
                leadIds: leadsToContact,
                options: {
                    useAI: true,
                    subject: `Quick question, {firstName}`,
                    companyName: 'Your Company',
                    senderName: 'Your Name'
                }
            });

            if (res.data.success) {
                addToast(`✅ ${res.data.message}`, 'success');
                fetchCampaignDetails(); // Refresh to show updated stats
            } else {
                addToast(`⚠️ ${res.data.message}`, 'warning');
            }
        } catch (error) {
            console.error('Email outreach error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to send emails';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSMSOutreach = async () => {
        const leadsToContact = selectedLeads.length > 0 ? selectedLeads : leads.map(l => l.lead_id || l.id);

        if (leadsToContact.length === 0) {
            addToast('No leads to contact', 'error');
            return;
        }

        // Count leads with phone
        const leadsWithPhone = leads.filter(l =>
            (selectedLeads.length === 0 || selectedLeads.includes(l.lead_id || l.id)) && l.phone
        );

        if (leadsWithPhone.length === 0) {
            addToast('No leads have phone numbers. Run Contact Scraper first!', 'error');
            return;
        }

        const confirmed = confirm(
            `Send AI-generated SMS to ${leadsWithPhone.length} leads?\n\n` +
            `Note: SMS requires Twilio integration (currently logs only).\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        try {
            setSendingSMS(true);
            addToast(`Processing SMS for ${leadsWithPhone.length} leads...`, 'info');

            const res = await axios.post(`/api/campaigns/${id}/outreach/sms`, {
                leadIds: leadsToContact,
                options: {
                    useAI: true
                }
            });

            if (res.data.success) {
                addToast(`${res.data.message}`, 'info');
                if (res.data.note) {
                    addToast(`ℹ️ ${res.data.note}`, 'info');
                }
            }
        } catch (error) {
            console.error('SMS outreach error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to send SMS';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setSendingSMS(false);
        }
    };

    const handleContactLead = async (lead) => {
        const leadId = lead.id ?? lead.lead_id;
        if (!leadId) return;
        try {
            const res = await axios.post(`/api/campaigns/${id}/auto-connect`, { leadIds: [leadId] });
            if (res.data?.success) {
                addToast(`Auto Connect started for 1 lead.`, 'success');
                fetchCampaignDetails();
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Auto Connect failed';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleAutoConnectSelected = async (leadIds) => {
        if (!leadIds?.length) return;
        try {
            const res = await axios.post(`/api/campaigns/${id}/auto-connect`, { leadIds });
            if (res.data?.success) {
                addToast(`Auto Connect started for ${leadIds.length} lead(s).`, 'success');
                fetchCampaignDetails();
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Auto Connect failed';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleEditApproval = async (approvalId, newContent) => {
        try {
            await axios.put(`/api/sow/approvals/${approvalId}/edit`, { content: newContent });
            addToast('Message updated', 'success');
            setEditingApproval(null);
            fetchApprovals();
        } catch (error) {
            console.error('Failed to update approval:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to update message';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleApproveSelected = async () => {
        if (selectedApprovals.length === 0) {
            addToast('No messages selected', 'error');
            return;
        }

        try {
            await axios.post('/api/sow/approvals/bulk-approve', { ids: selectedApprovals });
            addToast(`Approved ${selectedApprovals.length} messages`, 'success');
            setSelectedApprovals([]);
            fetchApprovals();
            fetchCampaignDetails();
        } catch (error) {
            console.error('Failed to approve messages:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to approve messages';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleRejectSelected = async () => {
        if (selectedApprovals.length === 0) {
            addToast('No messages selected', 'error');
            return;
        }

        try {
            await axios.post('/api/sow/approvals/bulk-reject', { ids: selectedApprovals });
            addToast(`Rejected ${selectedApprovals.length} messages`, 'success');
            setSelectedApprovals([]);
            fetchApprovals();
        } catch (error) {
            console.error('Failed to reject messages:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to reject messages';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const toggleSelectApproval = (approvalId) => {
        setSelectedApprovals(prev =>
            prev.includes(approvalId)
                ? prev.filter(id => id !== approvalId)
                : [...prev, approvalId]
        );
    };

    const getOptionsForApproval = (approvalId) => ({
        tone: 'professional',
        length: 'medium',
        focus: 'general',
        ...optionsByApproval[approvalId],
    });

    const setOptionsForApproval = (approvalId, next) => {
        setOptionsByApproval((prev) => ({ ...prev, [approvalId]: { ...prev[approvalId], ...next } }));
    };

    const handleRegenerateApproval = async (approvalId) => {
        const opts = getOptionsForApproval(approvalId);
        try {
            setRegeneratingId(approvalId);
            const res = await axios.post(`/api/sow/approvals/${approvalId}/regenerate`, {
                tone: opts.tone,
                length: opts.length,
                focus: opts.focus,
            });
            setApprovals((prev) =>
                prev.map((item) =>
                    item.id === approvalId ? { ...item, generated_content: res.data.content } : item
                )
            );
            if (res.data.aiUnavailable) {
                addToast('AI unavailable (API/key or quota). Message is a template — edit and send.', 'warning');
            } else {
                addToast('Message regenerated. Edit if needed, then Approve & Send.', 'success');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Regenerate failed';
            addToast(`Error: ${msg}`, 'error');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleBulkPersonalize = async () => {
        if (selectedApprovals.length === 0) return;

        try {
            setBulkPersonalizing(true);
            console.log(`🎨 Bulk personalizing ${selectedApprovals.length} messages...`);

            const res = await axios.post('/api/sow/approvals/bulk-personalize', {
                ids: selectedApprovals,
                tone: bulkPersonalizeOptions.tone,
                length: bulkPersonalizeOptions.length,
                focus: bulkPersonalizeOptions.focus
            });

            // Update items with new content
            const regeneratedMap = new Map(res.data.items.map(item => [item.id, item.content]));
            setApprovals(prev =>
                prev.map(item =>
                    regeneratedMap.has(item.id)
                        ? { ...item, generated_content: regeneratedMap.get(item.id) }
                        : item
                )
            );

            const successCount = res.data.regenerated || 0;
            const failCount = res.data.failed || 0;

            if (res.data.aiUnavailable) {
                addToast(`⚠️ AI unavailable. ${successCount} messages generated with templates.`, 'warning');
            } else {
                addToast(`✅ Bulk personalization complete! ${successCount} messages regenerated.`, 'success');
            }

            if (failCount > 0) {
                addToast(`⚠️ ${failCount} messages failed to regenerate`, 'warning');
            }

            setShowBulkPersonalizeModal(false);

        } catch (err) {
            console.error('Bulk personalize failed:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Bulk personalize failed';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setBulkPersonalizing(false);
        }
    };

    const toggleSelectAllApprovals = () => {
        if (selectedApprovals.length === approvals.length) {
            setSelectedApprovals([]);
        } else {
            setSelectedApprovals(approvals.map(item => item.id));
        }
    };

    const handleSaveMetadata = async () => {
        try {
            await axios.put(`/api/campaigns/${id}`, formData);
            setCampaign({ ...campaign, ...formData });
            setEditing(false);
            addToast('Campaign settings updated', 'success');
        } catch (error) {
            console.error('Failed to update campaign:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to update campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleAddStep = async () => {
        try {
            const allowedTypes = ['connection_request', 'message', 'email'];

            if (!allowedTypes.includes(newStep.type)) {
                addToast('Invalid step type selected. Please choose connection_request, message, or email.', 'error');
                return;
            }

            // Normalize delay_days (non-negative integer)
            let delay = parseInt(newStep.delay_days, 10);
            if (Number.isNaN(delay) || delay < 0) {
                delay = 0;
            }

            // Guardrail: if this is the first step and not a connection_request, warn the user
            const isFirstStep = !campaign.sequences || campaign.sequences.length === 0;
            if (isFirstStep && newStep.type !== 'connection_request') {
                const proceed = confirm(
                    'Your first automation step is not a LinkedIn connection request.\n\n' +
                    'This is allowed, but the recommended first step is a connection_request so the flow aligns with LinkedIn outreach best practices.\n\n' +
                    'Do you still want to create this step as the first step?'
                );
                if (!proceed) {
                    return;
                }
            }

            await axios.post(`/api/campaigns/${id}/sequences`, {
                type: newStep.type,
                content: newStep.content,
                delay_days: delay
            });
            setShowAddStep(false);
            setNewStep({ type: 'message', content: '', delay_days: 1 });
            addToast('Automation step added', 'success');
            fetchCampaignDetails();
        } catch (error) {
            console.error('Failed to add step:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to add step';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleDeleteStep = async (seqId) => {
        try {
            await axios.delete(`/api/campaigns/sequences/${seqId}`);
            addToast('Step removed', 'success');
            fetchCampaignDetails();
        } catch (error) {
            console.error('Failed to delete step:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to delete step';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleLaunch = async () => {
        try {
            await axios.post(`/api/campaigns/${id}/launch`);
            addToast('Campaign launched successfully!', 'success');
            fetchCampaignDetails();
        } catch (error) {
            console.error('Launch failed:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Launch failed. Please check your settings.';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handlePause = async () => {
        try {
            await axios.put(`/api/campaigns/${id}/pause`);
            addToast('Campaign paused', 'success');
            fetchCampaignDetails();
        } catch (error) {
            console.error('Failed to pause campaign:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to pause campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleResume = async () => {
        try {
            await axios.put(`/api/campaigns/${id}/resume`);
            addToast('Campaign resumed', 'success');
            fetchCampaignDetails();
        } catch (error) {
            console.error('Failed to resume campaign:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to resume campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }
        try {
            await axios.delete(`/api/campaigns/${id}`);
            addToast('Campaign deleted', 'success');
            navigate('/campaigns');
        } catch (error) {
            console.error('Failed to delete campaign:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to delete campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleDuplicate = async () => {
        try {
            const res = await axios.post(`/api/campaigns/${id}/duplicate`);
            if (res.data?.id) {
                addToast('Campaign duplicated', 'success');
                navigate(`/campaigns/${res.data.id}`);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Failed to duplicate';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <CampaignSkeleton />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Campaign not found</h2>
                <Button onClick={() => navigate('/campaigns')}>Back to list</Button>
            </div>
        );
    }

    const stats = campaign.stats || { pending: 0, sent: 0, replied: 0, failed: 0 };
    const totalLeads = leads.length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            {/* Nav & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        {editing ? (
                            <Input
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="text-2xl font-bold bg-transparent border-primary/20 focus:border-primary"
                            />
                        ) : (
                            <h1 className="text-3xl font-extrabold tracking-tight text-white">{campaign.name}</h1>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="capitalize px-3">
                                {campaign.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">• {totalLeads} Leads</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <TooltipProvider delayDuration={300}>
                        {editing ? (
                            <Button onClick={handleSaveMetadata} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                <Save className="w-4 h-4 mr-2" /> Save Settings
                            </Button>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => setEditing(true)}>
                                        <SettingsIcon className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Settings</TooltipContent>
                            </Tooltip>
                        )}

                        {campaign.status === 'active' ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handlePause} variant="destructive" size="icon">
                                        <Pause className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Pause Campaign</TooltipContent>
                            </Tooltip>
                        ) : campaign.status === 'paused' ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleResume} size="icon" className="bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20">
                                        <Play className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Resume Campaign</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleLaunch} size="icon" className="bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20">
                                        <Play className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Launch Campaign</TooltipContent>
                            </Tooltip>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={handleDuplicate}>
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="destructive" size="icon" onClick={handleDelete}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Full Settings Panel when editing */}
            {editing && (
                <Card className="bg-card/40 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" /> Campaign Settings
                        </CardTitle>
                        <CardDescription>Update name, goal, schedule, limits, and notes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Campaign name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <select
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                    value={formData.type || 'standard'}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="standard">Standard</option>
                                    <option value="event">Event</option>
                                    <option value="webinar">Webinar</option>
                                    <option value="nurture">Nurture</option>
                                    <option value="re_engagement">Re-engagement</option>
                                    <option value="cold_outreach">Cold outreach</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Goal</label>
                                <select
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                    value={formData.goal || 'connections'}
                                    onChange={e => setFormData({ ...formData, goal: e.target.value })}
                                >
                                    <option value="connections">Connections</option>
                                    <option value="meetings">Meetings</option>
                                    <option value="pipeline">Pipeline</option>
                                    <option value="brand_awareness">Brand awareness</option>
                                    <option value="event_promotion">Event promotion</option>
                                    <option value="content_engagement">Content engagement</option>
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Campaign description"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Target audience</label>
                                <Input
                                    value={formData.target_audience || ''}
                                    onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                                    placeholder="e.g., VP Sales at SaaS companies"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schedule start</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.schedule_start ? formData.schedule_start.slice(0, 16) : ''}
                                    onChange={e => setFormData({ ...formData, schedule_start: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schedule end</label>
                                <Input
                                    type="datetime-local"
                                    value={formData.schedule_end ? formData.schedule_end.slice(0, 16) : ''}
                                    onChange={e => setFormData({ ...formData, schedule_end: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Daily cap (0 = no limit)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.daily_cap ?? ''}
                                    onChange={e => setFormData({ ...formData, daily_cap: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Timezone</label>
                                <Input
                                    value={formData.timezone || 'UTC'}
                                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <select
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                    value={formData.priority || 'normal'}
                                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tags (comma-separated)</label>
                                <Input
                                    value={Array.isArray(formData.tags) ? formData.tags.join(', ') : (formData.tags || '')}
                                    onChange={e => setFormData({ ...formData, tags: e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [] })}
                                    placeholder="enterprise, q1"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Notes</label>
                                <textarea
                                    className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Internal notes"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                            <Button onClick={handleSaveMetadata} className="bg-primary hover:bg-primary/90">
                                <Save className="w-4 h-4 mr-2" /> Save Settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: totalLeads, icon: Users, color: 'text-blue-400' },
                    { label: 'Processing', value: stats.processing || 0, icon: Clock, color: 'text-yellow-400' },
                    { label: 'Sent', value: stats.sent || 0, icon: CheckCircle2, color: 'text-green-400' },
                    { label: 'Replies', value: stats.replied || 0, icon: MessageSquare, color: 'text-purple-400' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-card/50 border-white/5 backdrop-blur-sm">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                                <p className="text-xl font-bold text-white">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-white/5 gap-8">
                {[
                    { id: 'sequence', label: 'Sequence', badge: campaign.sequences?.length ?? 0 },
                    { id: 'leads', label: 'Leads', badge: leads.length },
                    { id: 'approvals', label: 'Approvals', badge: approvals.length },
                    { id: 'analytics', label: 'Analytics', badge: null }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "pb-4 text-sm font-semibold transition-all relative capitalize flex items-center gap-2",
                            activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        {tab.label}
                        {tab.badge !== null && tab.badge > 0 && (
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"
                            )}>
                                {tab.badge}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'sequence' && (
                    <Card className="bg-card/40 border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Automation Sequence</CardTitle>
                                <CardDescription>Steps run in order: connection request, then messages or emails with delays</CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setShowAddStep(true)}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Step
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {showAddStep && (
                                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                                    <p className="text-sm font-medium">New step</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <select
                                            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                                            value={newStep.type}
                                            onChange={e => setNewStep({ ...newStep, type: e.target.value })}
                                        >
                                            <option value="connection_request">Connection request</option>
                                            <option value="message">Message</option>
                                            <option value="email">Email</option>
                                        </select>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="Delay (days)"
                                            value={newStep.delay_days}
                                            onChange={e => setNewStep({ ...newStep, delay_days: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleAddStep}>Add</Button>
                                            <Button size="sm" variant="outline" onClick={() => setShowAddStep(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                    {(newStep.type === 'message' || newStep.type === 'connection_request') && (
                                        <textarea
                                            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                                            placeholder="Optional template (use {firstName}, {company}, etc.)"
                                            value={newStep.content}
                                            onChange={e => setNewStep({ ...newStep, content: e.target.value })}
                                        />
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                {(!campaign.sequences || campaign.sequences.length === 0) ? (
                                    <p className="text-sm text-muted-foreground py-4">No steps yet. Add a step to define your automation flow.</p>
                                ) : (
                                    campaign.sequences.map((seq, idx) => (
                                        <div key={seq.id} className="flex items-center gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
                                            <span className="text-lg font-bold text-primary w-8">{(idx + 1)}</span>
                                            <div className="flex-1">
                                                <Badge variant="outline" className="capitalize">{seq.type}</Badge>
                                                <span className="ml-2 text-sm text-muted-foreground">Delay: {seq.delay_days ?? 0} days</span>
                                                {(seq.send_window_start || seq.send_window_end) && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        Window: {seq.send_window_start || '09:00'}–{seq.send_window_end || '17:00'}
                                                    </span>
                                                )}
                                                {seq.variants?.length > 0 && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                        {seq.variants[0].content?.slice(0, 80)}...
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleDeleteStep(seq.id)} className="text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'leads' && (
                    <Card className="bg-card/40 border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Leads ({leads.length})</CardTitle>
                                <CardDescription>Manage individual contacts in this campaign</CardDescription>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {selectedLeads.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={toggleSelectAllLeads}
                                        className="gap-2"
                                    >
                                        {selectedLeads.length === leads.length ? 'Deselect All' : `Selected: ${selectedLeads.length}`}
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/20"
                                        >
                                            <Info className="w-4 h-4" />
                                            Get Contact Info
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                                        <DropdownMenuLabel>Contact Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleEmailOutreach}
                                            disabled={sendingEmail || leads.length === 0}
                                            className="gap-2 cursor-pointer"
                                        >
                                            <AtSign className={cn("w-4 h-4", sendingEmail && "animate-bounce")} />
                                            {sendingEmail ? 'Sending Emails...' : 'Contact Emails'}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={handleSMSOutreach}
                                            disabled={sendingSMS || leads.length === 0}
                                            className="gap-2 cursor-pointer"
                                        >
                                            <Smartphone className={cn("w-4 h-4", sendingSMS && "animate-bounce")} />
                                            {sendingSMS ? 'Sending SMS...' : 'Contact Phone'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="h-6 w-px bg-white/10" />
                                <Button
                                    size="sm"
                                    onClick={handleBulkEnrichAndGenerate}
                                    disabled={enriching || leads.length === 0}
                                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-primary/20"
                                >
                                    <Sparkles className={cn("w-4 h-4", enriching && "animate-spin")} />
                                    {enriching
                                        ? 'Processing...'
                                        : selectedLeads.length > 0
                                            ? `LinkedIn AI (${selectedLeads.length})`
                                            : 'LinkedIn AI Messages'}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-2">
                                    <Download className="w-4 h-4" /> Export
                                </Button>
                            </div>
                        </CardHeader>

                        {/* Contact Scraping Progress */}
                        {scrapeProgress && (
                            <div className="px-6 pb-4">
                                <div className={cn(
                                    "border rounded-lg p-4",
                                    scrapeProgress.cancelled ? "bg-orange-500/10 border-orange-500/20" : "bg-green-500/10 border-green-500/20"
                                )}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={cn(
                                            "text-sm font-medium flex items-center gap-2",
                                            scrapeProgress.cancelled ? "text-orange-400" : "text-green-400"
                                        )}>
                                            <Search className={cn("w-4 h-4", scraping && "animate-pulse")} />
                                            Contact Scraping: {scrapeProgress.status}
                                            {scraping && (
                                                <span className="text-xs text-muted-foreground">(Click button to stop)</span>
                                            )}
                                        </span>
                                        <div className="text-xs text-muted-foreground text-right">
                                            <div>{scrapeProgress.processed} / {scrapeProgress.total} scraped</div>
                                            {scrapeProgress.found > 0 && (
                                                <div className="text-green-400">✓ {scrapeProgress.found} contacts found</div>
                                            )}
                                            {scrapeProgress.alreadyHadContacts > 0 && (
                                                <div className="text-blue-400">⚡ {scrapeProgress.alreadyHadContacts} already had info</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-500",
                                                scrapeProgress.cancelled
                                                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                                                    : "bg-gradient-to-r from-green-500 to-teal-500"
                                            )}
                                            style={{ width: `${scrapeProgress.progress || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Generation Progress */}
                        {enrichProgress && (
                            <div className="px-6 pb-4">
                                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-primary">
                                            {enrichProgress.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {enrichProgress.current} / {enrichProgress.total}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                            style={{ width: `${(enrichProgress.current / enrichProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <CardContent>
                            {/* Info Banner */}
                            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white mb-2">🎯 Multi-Channel Outreach System:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                                            <div className="space-y-1">
                                                <p className="text-green-400 font-medium flex items-center gap-1"><Search className="w-3 h-3" /> 1. Scrape Contacts</p>
                                                <ul className="list-disc list-inside space-y-0.5 pl-2">
                                                    <li>Gets <strong className="text-white">email & phone</strong></li>
                                                    <li>From LinkedIn profiles</li>
                                                    <li>Browser automation</li>
                                                </ul>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-orange-400 font-medium flex items-center gap-1"><AtSign className="w-3 h-3" /> 2. Email Outreach</p>
                                                <ul className="list-disc list-inside space-y-0.5 pl-2">
                                                    <li>Direct <strong className="text-white">email</strong> to inbox</li>
                                                    <li>AI-personalized content</li>
                                                    <li>Beautiful HTML templates</li>
                                                </ul>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-violet-400 font-medium flex items-center gap-1"><Smartphone className="w-3 h-3" /> 3. SMS Outreach</p>
                                                <ul className="list-disc list-inside space-y-0.5 pl-2">
                                                    <li>Text <strong className="text-white">SMS</strong> messages</li>
                                                    <li>Short, personalized</li>
                                                    <li>Requires Twilio setup</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-xs">
                                                <strong className="text-primary">LinkedIn AI Messages</strong> still go through Approvals Tab.
                                                Email/SMS are sent directly after confirmation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const leadsForTable = leads.map((l) => ({
                                    id: l.lead_id ?? l.id,
                                    lead_id: l.lead_id,
                                    full_name: l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ').trim() || '—',
                                    first_name: l.first_name,
                                    last_name: l.last_name,
                                    title: l.title,
                                    company: l.company,
                                    email: l.email,
                                    phone: l.phone,
                                    status: l.status || 'pending'
                                }));
                                return (
                                    <CampaignLeadsTable
                                        leads={leadsForTable}
                                        onContactLead={handleContactLead}
                                        onAutoConnectSelected={handleAutoConnectSelected}
                                    />
                                );
                            })()}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'approvals' && (
                    <div className="space-y-6">
                        {/* Info Banner */}
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <MessageSquare className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white mb-1">📍 Where AI Messages Are:</p>
                                    <p className="text-xs text-muted-foreground">
                                        These messages were generated using enriched LinkedIn profile data.
                                        After you approve them, they'll be sent automatically by the scheduler.
                                        <strong className="text-primary block mt-2">💡 Click any message to edit it before approving!</strong>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Section - Always visible */}
                        <Card className="bg-card/40 border-white/5">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    Recent Sending Activity
                                    {recentActivity.length > 0 && (
                                        <Badge variant="outline" className="ml-2">
                                            {recentActivity.filter(a => a.status === 'sent').length} Sent
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>Track messages and connection requests that were sent</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentActivity.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No sending activity yet.</p>
                                        <p className="text-xs mt-1">Approved messages will appear here once sent.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {recentActivity.map((activity, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                                                    activity.status === 'sent' && "bg-green-500",
                                                    activity.status === 'failed' && "bg-red-500",
                                                    activity.status === 'approved' && "bg-yellow-500"
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-medium text-white">
                                                            {activity.lead_name || 'Unknown Lead'}
                                                        </span>
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px]",
                                                            activity.action === 'send_message' && "border-green-500/50 text-green-500",
                                                            activity.action === 'send_connection_request' && "border-blue-500/50 text-blue-500"
                                                        )}>
                                                            {activity.action === 'send_message' ? 'Message' :
                                                                activity.action === 'send_connection_request' ? 'Connection' :
                                                                    activity.action}
                                                        </Badge>
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px]",
                                                            activity.status === 'sent' && "border-green-500/50 text-green-500",
                                                            activity.status === 'failed' && "border-red-500/50 text-red-500"
                                                        )}>
                                                            {activity.status === 'sent' ? '✓ Sent' : activity.status}
                                                        </Badge>
                                                    </div>
                                                    {activity.message_preview && (
                                                        <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                                                            {activity.message_preview}...
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span>{new Date(activity.timestamp).toLocaleString()}</span>
                                                        {activity.container_id && (
                                                            <span className="font-mono">Container: {activity.container_id.substring(0, 12)}...</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white">AI-Generated Messages ({approvals.length})</h2>
                                <p className="text-sm text-muted-foreground mt-1">Choose tone, length & focus → Regenerate → edit for a human touch → Approve & Send</p>
                            </div>
                            <div className="flex gap-2">
                                {approvals.length > 0 && (
                                    <Button
                                        onClick={toggleSelectAllApprovals}
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                        {selectedApprovals.length === approvals.length ? 'Deselect All' : `Select All (${approvals.length})`}
                                    </Button>
                                )}
                                {selectedApprovals.length > 0 && (
                                    <>
                                        <Button
                                            onClick={() => setShowBulkPersonalizeModal(true)}
                                            variant="outline"
                                            className="gap-2 border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Bulk Personalize ({selectedApprovals.length})
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleRejectSelected}
                                            className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject ({selectedApprovals.length})
                                        </Button>
                                        <Button
                                            onClick={handleApproveSelected}
                                            className="gap-2 bg-green-600 hover:bg-green-500"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                            Approve & Send ({selectedApprovals.length})
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {approvals.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Eye className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No AI messages yet</h3>
                                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                                    <strong className="text-white">Step 1:</strong> Go to <strong className="text-primary">Leads Tab</strong> and click
                                    <strong className="text-primary"> "Bulk Enrich & Generate AI Messages"</strong>
                                </p>
                                <div className="bg-white/5 rounded-lg p-4 max-w-md mx-auto mb-6 text-left">
                                    <p className="text-xs text-muted-foreground mb-2"><strong className="text-white">What happens:</strong></p>
                                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                        <li>System enriches all leads (scrapes LinkedIn profiles)</li>
                                        <li>AI generates personalized messages using that data</li>
                                        <li>Messages appear here in Approvals Tab</li>
                                        <li>You review, edit, and approve them</li>
                                        <li>Scheduler sends approved messages automatically</li>
                                    </ol>
                                </div>
                                <Button onClick={() => setActiveTab('leads')} className="bg-primary hover:bg-primary/90 gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Go to Leads Tab to Start
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {approvals.map((approval) => (
                                    <Card key={approval.id} className={cn(
                                        "bg-card/40 border transition-all duration-300",
                                        selectedApprovals.includes(approval.id) ? "border-primary/50 bg-primary/5" : "border-white/5"
                                    )}>
                                        <CardContent className="p-6">
                                            <div className="flex gap-4">
                                                {/* Checkbox */}
                                                <div className="pt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedApprovals.includes(approval.id)}
                                                        onChange={() => toggleSelectApproval(approval.id)}
                                                        className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-primary checked:border-primary cursor-pointer"
                                                    />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 space-y-4">
                                                    {/* Lead Info */}
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <h3 className="text-lg font-bold text-white">
                                                                    {approval.first_name} {approval.last_name}
                                                                </h3>
                                                                <Badge variant="outline" className={cn(
                                                                    "text-[10px] font-bold uppercase",
                                                                    approval.step_type === 'connection_request' && "border-blue-500/50 text-blue-500 bg-blue-500/5",
                                                                    approval.step_type === 'message' && "border-green-500/50 text-green-500 bg-green-500/5"
                                                                )}>
                                                                    {approval.step_type === 'connection_request' ? 'Connection' : 'Message'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                {approval.title} at {approval.company}
                                                            </p>

                                                            {/* Personalization Controls */}
                                                            {approval.status === 'pending' && (
                                                                <div className="flex flex-wrap items-center gap-2 text-xs mt-3">
                                                                    <span className="font-medium text-muted-foreground">Personalize:</span>
                                                                    <select
                                                                        className="border border-input bg-background rounded px-2 py-1.5 text-xs"
                                                                        value={getOptionsForApproval(approval.id).tone}
                                                                        onChange={(e) => setOptionsForApproval(approval.id, { tone: e.target.value })}
                                                                    >
                                                                        <option value="professional">Professional</option>
                                                                        <option value="friendly">Friendly</option>
                                                                        <option value="casual">Casual</option>
                                                                        <option value="formal">Formal</option>
                                                                        <option value="warm">Warm</option>
                                                                    </select>
                                                                    <select
                                                                        className="border border-input bg-background rounded px-2 py-1.5 text-xs"
                                                                        value={getOptionsForApproval(approval.id).length}
                                                                        onChange={(e) => setOptionsForApproval(approval.id, { length: e.target.value })}
                                                                    >
                                                                        <option value="short">Short (2–3 sentences)</option>
                                                                        <option value="medium">Medium (3–5 sentences)</option>
                                                                        <option value="long">Long (4–6 sentences)</option>
                                                                    </select>
                                                                    <select
                                                                        className="border border-input bg-background rounded px-2 py-1.5 text-xs"
                                                                        value={getOptionsForApproval(approval.id).focus}
                                                                        onChange={(e) => setOptionsForApproval(approval.id, { focus: e.target.value })}
                                                                    >
                                                                        <option value="general">General (balanced)</option>
                                                                        <option value="recent_post">Recent post / activity</option>
                                                                        <option value="company">Company & role</option>
                                                                        <option value="role">Job title & expertise</option>
                                                                        <option value="mutual_connection">Mutual connection</option>
                                                                    </select>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="gap-1.5"
                                                                        onClick={() => handleRegenerateApproval(approval.id)}
                                                                        disabled={regeneratingId === approval.id}
                                                                    >
                                                                        {regeneratingId === approval.id ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                                        )}
                                                                        Regenerate
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {approval.status === 'approved' && (
                                                                <div className="mt-3 p-3 rounded-lg border" style={{
                                                                    backgroundColor: approvalStatuses[approval.id]?.sending_status === 'sent' ? 'rgba(34, 197, 94, 0.1)' :
                                                                        approvalStatuses[approval.id]?.sending_status === 'queued' ? 'rgba(234, 179, 8, 0.1)' :
                                                                            'rgba(107, 114, 128, 0.1)',
                                                                    borderColor: approvalStatuses[approval.id]?.sending_status === 'sent' ? 'rgba(34, 197, 94, 0.3)' :
                                                                        approvalStatuses[approval.id]?.sending_status === 'queued' ? 'rgba(234, 179, 8, 0.3)' :
                                                                            'rgba(107, 114, 128, 0.3)'
                                                                }}>
                                                                    {approvalStatuses[approval.id] ? (
                                                                        <>
                                                                            {approvalStatuses[approval.id].sending_status === 'sent' && approvalStatuses[approval.id].sent_at && (
                                                                                <div className="space-y-1">
                                                                                    <p className="text-sm font-bold text-green-500 flex items-center gap-2">
                                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                                        ✅ MESSAGE SENT SUCCESSFULLY!
                                                                                    </p>
                                                                                    <p className="text-xs text-green-400">
                                                                                        Sent at {new Date(approvalStatuses[approval.id].sent_at).toLocaleString()}
                                                                                    </p>
                                                                                    {approvalStatuses[approval.id].container_id && (
                                                                                        <p className="text-xs text-muted-foreground font-mono mt-1">
                                                                                            Container: {approvalStatuses[approval.id].container_id}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {approvalStatuses[approval.id].sending_status === 'queued' && (
                                                                                <p className="text-sm text-yellow-500 flex items-center gap-2">
                                                                                    <Clock className="w-4 h-4 animate-spin" />
                                                                                    ⏳ Message queued - scheduler will send within 1 minute...
                                                                                </p>
                                                                            )}
                                                                            {approvalStatuses[approval.id].sending_status === 'pending' && (
                                                                                <p className="text-xs text-gray-400">
                                                                                    Waiting for scheduler to pick up...
                                                                                </p>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <p className="text-xs text-yellow-500 flex items-center gap-2">
                                                                            <Clock className="w-3 h-3 animate-spin" />
                                                                            Checking sending status...
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Message Content */}
                                                    {editingApproval === approval.id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                defaultValue={approval.generated_content}
                                                                id={`edit-${approval.id}`}
                                                                className="w-full min-h-[120px] bg-white/5 border border-primary/30 rounded-lg p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-sans"
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const newContent = document.getElementById(`edit-${approval.id}`).value;
                                                                        handleEditApproval(approval.id, newContent);
                                                                    }}
                                                                    className="bg-primary hover:bg-primary/90"
                                                                >
                                                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setEditingApproval(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="relative bg-white/5 rounded-lg p-4 border border-white/10 group cursor-pointer hover:border-primary/30 transition-all"
                                                            onClick={() => setEditingApproval(approval.id)}
                                                        >
                                                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                                {approval.generated_content}
                                                            </p>
                                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                                                                    <Edit2 className="w-3 h-3" /> Edit
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={async () => {
                                                                try {
                                                                    await axios.post(`/api/sow/approvals/${approval.id}/review`, { action: 'reject' });
                                                                    addToast('Message rejected', 'info');
                                                                    fetchApprovals();
                                                                } catch (error) {
                                                                    console.error('Failed to reject approval:', error);
                                                                    const errorMsg = error.response?.data?.error || error.message || 'Failed to reject message';
                                                                    addToast(`Error: ${errorMsg}`, 'error');
                                                                }
                                                            }}
                                                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    await axios.post(`/api/sow/approvals/${approval.id}/review`, { action: 'approve' });
                                                                    addToast('✅ Message approved! Scheduler will send within 1 minute.', 'success');
                                                                    fetchApprovals();
                                                                    fetchCampaignDetails();
                                                                    fetchRecentActivity(); // Refresh activity

                                                                    // Immediately check status
                                                                    checkApprovalStatus(approval.id);

                                                                    // Start aggressive polling for status (every 3 seconds for first minute, then every 10 seconds)
                                                                    let pollCount = 0;
                                                                    const statusInterval = setInterval(() => {
                                                                        pollCount++;
                                                                        checkApprovalStatus(approval.id);
                                                                        fetchRecentActivity(); // Also refresh activity

                                                                        // After 20 polls (60 seconds), slow down to every 10 seconds
                                                                        if (pollCount > 20) {
                                                                            clearInterval(statusInterval);
                                                                            const slowInterval = setInterval(() => {
                                                                                checkApprovalStatus(approval.id);
                                                                                fetchRecentActivity();
                                                                            }, 10000);
                                                                            // Stop after 5 more minutes
                                                                            setTimeout(() => clearInterval(slowInterval), 300000);
                                                                        }
                                                                    }, 3000); // Check every 3 seconds initially

                                                                    // Stop polling after 6 minutes total
                                                                    setTimeout(() => clearInterval(statusInterval), 360000);
                                                                } catch (error) {
                                                                    console.error('Failed to approve:', error);
                                                                    const errorMsg = error.response?.data?.error || error.message || 'Failed to approve message';
                                                                    addToast(`Error: ${errorMsg}`, 'error');
                                                                }
                                                            }}
                                                            className="bg-green-600 hover:bg-green-500"
                                                        >
                                                            <Send className="w-4 h-4 mr-2" /> Approve & Send
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Bulk Personalize Modal */}
                        {showBulkPersonalizeModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                                <Card className="w-full max-w-2xl bg-card/95 border-white/10 shadow-2xl">
                                    <CardContent className="p-6 space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2">🎨 Bulk Personalize Messages</h2>
                                            <p className="text-sm text-muted-foreground">
                                                Apply personalization settings to all {selectedApprovals.length} selected messages at once.
                                                Each message will be regenerated with AI using these parameters.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Tone</label>
                                                <select
                                                    className="w-full border border-input bg-background rounded-lg px-4 py-2.5"
                                                    value={bulkPersonalizeOptions.tone}
                                                    onChange={(e) => setBulkPersonalizeOptions(prev => ({ ...prev, tone: e.target.value }))}
                                                >
                                                    <option value="professional">Professional</option>
                                                    <option value="friendly">Friendly</option>
                                                    <option value="casual">Casual</option>
                                                    <option value="formal">Formal</option>
                                                    <option value="warm">Warm</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">Length</label>
                                                <select
                                                    className="w-full border border-input bg-background rounded-lg px-4 py-2.5"
                                                    value={bulkPersonalizeOptions.length}
                                                    onChange={(e) => setBulkPersonalizeOptions(prev => ({ ...prev, length: e.target.value }))}
                                                >
                                                    <option value="short">Short (2–3 sentences)</option>
                                                    <option value="medium">Medium (3–5 sentences)</option>
                                                    <option value="long">Long (4–6 sentences)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-2">Focus</label>
                                                <select
                                                    className="w-full border border-input bg-background rounded-lg px-4 py-2.5"
                                                    value={bulkPersonalizeOptions.focus}
                                                    onChange={(e) => setBulkPersonalizeOptions(prev => ({ ...prev, focus: e.target.value }))}
                                                >
                                                    <option value="general">General (balanced)</option>
                                                    <option value="recent_post">Recent post / activity</option>
                                                    <option value="company">Company & role</option>
                                                    <option value="role">Job title & expertise</option>
                                                    <option value="mutual_connection">Mutual connection</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                                <div className="text-sm">
                                                    <p className="font-medium mb-1">What happens next:</p>
                                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                        <li>All {selectedApprovals.length} selected messages will be regenerated</li>
                                                        <li>Each will use the same tone, length, and focus settings</li>
                                                        <li>Content remains personalized per lead using their profile data</li>
                                                        <li>You can still edit individual messages after regeneration</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 justify-end">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowBulkPersonalizeModal(false)}
                                                disabled={bulkPersonalizing}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleBulkPersonalize}
                                                disabled={bulkPersonalizing}
                                                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                            >
                                                {bulkPersonalizing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Personalizing {selectedApprovals.length} messages...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="w-4 h-4" />
                                                        Personalize {selectedApprovals.length} Messages
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Response Rate', value: stats.sent > 0 ? `${((stats.replied || 0) / stats.sent * 100).toFixed(1)}%` : '0%', sub: 'Replies per outreach', icon: MessageSquare, gradient: 'from-emerald-500/20 to-teal-500/10', iconClr: 'text-emerald-400' },
                                { label: 'Conversion Rate', value: stats.replied > 0 && stats.booked ? `${((stats.booked / stats.replied) * 100).toFixed(1)}%` : '0%', sub: 'Meetings per reply', icon: CheckCircle2, gradient: 'from-violet-500/20 to-purple-500/10', iconClr: 'text-violet-400' },
                                { label: 'Total Outreach', value: stats.sent || 0, sub: `of ${totalLeads} leads`, icon: Send, gradient: 'from-blue-500/20 to-cyan-500/10', iconClr: 'text-blue-400' },
                                { label: 'Replies', value: stats.replied || 0, sub: 'Received', icon: TrendingUp, gradient: 'from-amber-500/20 to-orange-500/10', iconClr: 'text-amber-400' },
                            ].map((kpi, i) => (
                                <motion.div key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                    <Card className={cn("overflow-hidden border-white/5 bg-gradient-to-br", kpi.gradient, "hover:shadow-lg transition-shadow")}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className={cn("p-2 rounded-lg bg-white/5", kpi.iconClr)}>
                                                    <kpi.icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                                            </div>
                                            <p className="text-xl font-bold text-white mt-2">{kpi.value}</p>
                                            <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Conversion Funnel */}
                            <Card className="lg:col-span-2 bg-card/40 border-white/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-primary/20"><TrendingUp className="w-4 h-4 text-primary" /></div>
                                        Conversion Funnel
                                    </CardTitle>
                                    <CardDescription>Track progress from leads to meetings</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { label: 'Total Leads', value: totalLeads, icon: Users, fill: 'bg-primary/40', pct: 100 },
                                        { label: 'Outreach Sent', value: stats.sent || 0, icon: Send, fill: 'bg-blue-500/50', pct: totalLeads > 0 ? (stats.sent / totalLeads) * 100 : 0 },
                                        { label: 'Replies Received', value: stats.replied || 0, icon: MessageSquare, fill: 'bg-emerald-500/50', pct: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0 },
                                        { label: 'Meetings Booked', value: stats.booked || 0, icon: CheckCircle2, fill: 'bg-violet-500/50', pct: stats.replied > 0 && stats.booked ? (stats.booked / stats.replied) * 100 : 0 },
                                    ].map((step, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-white/90 flex items-center gap-2"><step.icon className="w-3.5 h-3.5 text-muted-foreground" />{step.label}</span>
                                                <span className="font-bold tabular-nums">{step.value}</span>
                                            </div>
                                            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div className={cn("h-full rounded-full", step.fill)} initial={{ width: 0 }} animate={{ width: `${step.pct}%` }} transition={{ duration: 0.6, delay: i * 0.1 }} />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Status Distribution */}
                            <Card className="bg-card/40 border-white/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-primary/20"><BarChart3 className="w-4 h-4 text-primary" /></div>
                                        Status Distribution
                                    </CardTitle>
                                    <CardDescription>By stage</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(stats.pending || 0) + (stats.sent || 0) + (stats.replied || 0) + (stats.failed || 0) === 0 ? (
                                        <div className="h-[200px] flex items-center justify-center"><p className="text-sm text-muted-foreground">No data yet</p></div>
                                    ) : (
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Pending', value: stats.pending || 0, color: '#f59e0b' },
                                                            { name: 'Sent', value: stats.sent || 0, color: '#3b82f6' },
                                                            { name: 'Replied', value: stats.replied || 0, color: '#10b981' },
                                                            { name: 'Failed', value: stats.failed || 0, color: '#ef4444' },
                                                        ].filter(d => d.value > 0)}
                                                        cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value"
                                                    >
                                                        {[
                                                            { name: 'Pending', value: stats.pending || 0, color: '#f59e0b' },
                                                            { name: 'Sent', value: stats.sent || 0, color: '#3b82f6' },
                                                            { name: 'Replied', value: stats.replied || 0, color: '#10b981' },
                                                            { name: 'Failed', value: stats.failed || 0, color: '#ef4444' },
                                                        ].filter(d => d.value > 0).map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                                    <Legend layout="vertical" align="right" formatter={(v) => <span className="text-sm text-muted-foreground">{v}</span>} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Pipeline Bar Chart */}
                        <Card className="bg-card/40 border-white/5">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-primary/20"><BarChart3 className="w-4 h-4 text-primary" /></div>
                                    Outreach Pipeline
                                </CardTitle>
                                <CardDescription>Stage breakdown</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { stage: 'Leads', count: totalLeads },
                                            { stage: 'Sent', count: stats.sent || 0 },
                                            { stage: 'Replied', count: stats.replied || 0 },
                                            { stage: 'Meetings', count: stats.booked || 0 },
                                        ]} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="stage" width={72} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                                            <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                                <Cell fill="hsl(var(--primary))" />
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#10b981" />
                                                <Cell fill="#8b5cf6" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Daily Performance placeholder */}
                        <Card className="bg-card/40 border-white/5 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-14">
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4"><BarChart3 className="w-10 h-10 text-primary" /></div>
                                <h3 className="text-lg font-bold text-white mb-1">Daily Performance</h3>
                                <p className="text-sm text-muted-foreground text-center max-w-sm">Time-series charts will appear once the campaign has been active for 24+ hours.</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>

        </div>
    );
}
