import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageGuide from './PageGuide';
import axios from 'axios';
import { Search, MoreVertical, RefreshCw, Linkedin, Trash2, Edit2, Download, Filter, ChevronDown, ChevronUp, Loader2, Sparkles, MapPin, Building2, Briefcase, Target, Database, Eye, Check, X, Mail, Phone, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useToast } from './ui/toast';
import { Skeleton, TableSkeleton } from './ui/skeleton';
import { FilterLogicBuilder } from './FilterLogicBuilder';

const QUICK_FILTERS = [
    { id: 'ceo_saas', label: 'CEOs in SaaS', preset: { title: 'CEO', industry: 'SaaS' }, icon: Target },
    { id: 'cto_tech', label: 'CTOs in Tech', preset: { title: 'CTO', industry: 'Technology' }, icon: Briefcase },
    { id: 'mkt_mgr', label: 'Marketing Managers', preset: { title: 'Marketing Manager' }, icon: Briefcase },
    { id: 'sales_dir', label: 'Sales Directors', preset: { title: 'Sales Director' }, icon: Target }
];

export default function LeadsTable() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [leads, setLeads] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [stats, setStats] = useState({ totalLeads: 0, statusCount: {}, sourceCount: {} });
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

    // Combined Meta Filters (includes all filters)
    const [searchParams] = useSearchParams();
    const [metaFilters, setMetaFilters] = useState({
        // Lead search filters
        title: '',
        location: '',
        industry: searchParams.get('industry') || '',
        company: '',
        connectionDegree: searchParams.get('connection_degree') || '',
        quality: searchParams.get('quality') || '', // primary, secondary, tertiary
        // Status and source
        status: 'all',
        source: 'all',
        // Advanced filters
        hasEmail: false,
        hasLinkedin: false,
        createdFrom: '',
        createdTo: '',
    });
    // Multi-select Quick Filters state
    const [activeQuickFilters, setActiveQuickFilters] = useState([]);
    const [showMetaFilters, setShowMetaFilters] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        quickFilters: false,
        leadInformation: false,
        statusSource: false,
        advancedOptions: false,
    });

    // Advanced Logic Mode
    const [filterMode, setFilterMode] = useState('simple'); // 'simple' | 'advanced'
    const [advancedFilters, setAdvancedFilters] = useState({ operator: 'OR', groups: [] });

    const toggleFilterMode = () => {
        if (filterMode === 'simple') {
            // Convert simple filters to advanced logic
            const conditions = [];
            if (metaFilters.title) conditions.push({ field: 'title', operator: 'contains', value: metaFilters.title });
            if (metaFilters.industry) conditions.push({ field: 'industry', operator: 'contains', value: metaFilters.industry });
            if (metaFilters.location) conditions.push({ field: 'location', operator: 'contains', value: metaFilters.location });
            if (metaFilters.company) conditions.push({ field: 'company', operator: 'contains', value: metaFilters.company });
            if (metaFilters.connectionDegree) conditions.push({ field: 'connection_degree', operator: 'contains', value: metaFilters.connectionDegree });
            if (metaFilters.status !== 'all') conditions.push({ field: 'status', operator: 'equals', value: metaFilters.status });
            if (metaFilters.source !== 'all') conditions.push({ field: 'source', operator: 'equals', value: metaFilters.source });
            if (metaFilters.hasEmail) conditions.push({ field: 'hasEmail', operator: 'is_true', value: 'true' });
            if (metaFilters.hasLinkedin) conditions.push({ field: 'hasLinkedin', operator: 'is_true', value: 'true' });
            if (metaFilters.createdFrom) conditions.push({ field: 'created_at', operator: 'after', value: metaFilters.createdFrom }); // Simplified mapping

            const newGroups = [];
            if (conditions.length > 0) {
                newGroups.push({ operator: 'AND', conditions });
            } else {
                // Default empty state
                newGroups.push({ operator: 'AND', conditions: [{ field: 'title', operator: 'contains', value: '' }] });
            }

            setAdvancedFilters({ operator: 'OR', groups: newGroups });
            setFilterMode('advanced');
        } else {
            setFilterMode('simple');
        }
    };

    // User preferences / branding (for personalized sorting)
    const [usePreferences, setUsePreferences] = useState(() => {
        return localStorage.getItem('usePreferences') === 'true';
    });
    const [preferences, setPreferences] = useState({
        linkedinProfileUrl: '',
        preferredCompanyKeywords: '',
    });
    const [branding, setBranding] = useState({
        companyName: '',
    });

    // PHASE 4: Review Workflow State
    const [reviewStatusTab, setReviewStatusTab] = useState('approved'); // 'approved' | 'to_be_reviewed' | 'rejected'
    const [reviewStats, setReviewStats] = useState({
        to_be_reviewed: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Selection State
    const [selectedLeads, setSelectedLeads] = useState(new Set());

    // Add to Campaign Modal State
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [isBulkEnrich, setIsBulkEnrich] = useState(false);
    const [selectedCampaignId, setSelectedCampaignId] = useState('');

    // Enrichment State
    const [enriching, setEnriching] = useState(false);

    // Import Leads (Phantom search-import) State
    const [importingLeads, setImportingLeads] = useState(false);
    const [importProgress, setImportProgress] = useState(null);

    // Fetch data on mount
    useEffect(() => {
        // If industry or quality or connection param is present, expand filters automatically
        if (searchParams.get('industry') || searchParams.get('quality') || searchParams.get('connection_degree')) {
            setShowMetaFilters(true);
            setExpandedSections((prev) => ({
                ...prev,
                leadInformation: true,
                quickFilters: !!searchParams.get('quality') // Expand quick filters if quality is set
            }));
        }
        fetchLeads();
        fetchStats();
        fetchCampaigns();

        // Load preference context (settings + branding)
        const fetchPreferencesAndBranding = async () => {
            try {
                const [settingsRes, brandingRes] = await Promise.allSettled([
                    axios.get('/api/settings'),
                    axios.get('/api/settings/branding'),
                ]);

                if (settingsRes.status === 'fulfilled') {
                    const data = settingsRes.value.data || {};
                    setPreferences({
                        linkedinProfileUrl: data.preferences?.linkedinProfileUrl || '',
                        preferredCompanyKeywords: data.preferences?.preferredCompanyKeywords || '',
                    });
                }

                if (brandingRes.status === 'fulfilled') {
                    const b = brandingRes.value.data || {};
                    setBranding({
                        companyName: b.companyName || '',
                    });
                }
            } catch (error) {
                console.error('Failed to load preferences/branding', error);
            }
        };

        fetchPreferencesAndBranding();
    }, []);

    // PHASE 4: Fetch whenever review tab changes
    useEffect(() => {
        setPagination(p => ({ ...p, page: 1 })); // Reset to page 1
        fetchLeads();
    }, [reviewStatusTab]);

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get('/api/campaigns');
            setCampaigns(res.data);
        } catch (e) {
            console.error("Failed to fetch campaigns", e);
            const errorMsg = e.response?.data?.error || e.message || 'Failed to load campaigns';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleAddToCampaign = async () => {
        // PHASE 4: Gating - Check if leads are approved
        const selectedLeadObjects = leads.filter(l => selectedLeads.has(l.id));
        const unapprovedCount = selectedLeadObjects.filter(l => (l.review_status || 'approved') !== 'approved').length;

        if (unapprovedCount > 0) {
            addToast(`⚠️ ${unapprovedCount} selected leads are not qualified. Only qualified leads can be added to campaigns.`, 'error');
            return;
        }

        if (!selectedCampaignId) {
            addToast('Please select a campaign', 'warning');
            return;
        }

        if (isBulkEnrich) {
            handleBulkEnrichAndPersonalize();
            return;
        }

        try {
            await axios.post(`/api/campaigns/${selectedCampaignId}/leads`, {
                leadIds: Array.from(selectedLeads)
            });
            addToast(`Successfully added ${selectedLeads.size} leads to campaign`, 'success');
            setSelectedLeads(new Set());
            setShowCampaignModal(false);
            fetchLeads();
        } catch (error) {
            console.error('Failed to add leads to campaign:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to add leads to campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleBulkEnrichAndPersonalize = async () => {
        const leadIds = Array.from(selectedLeads);
        if (leadIds.length === 0) return;

        try {
            setEnriching(true);
            setShowCampaignModal(false);
            addToast(`🚀 Starting bulk enrichment and personalization for ${leadIds.length} leads...`, 'info');

            const res = await axios.post('/api/leads/bulk-enrich-personalize', {
                leadIds,
                campaignId: selectedCampaignId
            });

            console.log('Bulk enrich response:', res.data);

            const results = res.data.results || {};
            const message = `Enrichment complete! ${results.enriched || 0} enriched, ${results.generated || 0} AI messages created.`;

            addToast(message, 'success');
            setSelectedLeads(new Set());
            fetchLeads();

            // Optional: navigate to campaign to see results
            if (window.confirm(`${message}\n\nWould you like to view the campaign approvals?`)) {
                navigate(`/campaigns/${selectedCampaignId}`);
            }
        } catch (error) {
            console.error('Bulk enrich failed:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to bulk enrich';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setEnriching(false);
            setIsBulkEnrich(false);
            setSelectedCampaignId('');
        }
    };

    const fetchLeads = async (append = false, overrideFilters = null) => {
        const filtersToUse = overrideFilters ?? metaFilters;
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setPagination((p) => ({ ...p, page: 1, total: 0 }));
        }

        try {
            const params = new URLSearchParams();
            const currentPage = append ? pagination.page + 1 : 1;
            params.set('page', currentPage.toString());
            params.set('limit', '50');

            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            // Meta filters (combined)
            if (filtersToUse.title?.trim()) {
                params.set('title', filtersToUse.title.trim());
            }
            if (filtersToUse.location?.trim()) {
                params.set('location', filtersToUse.location.trim());
            }
            if (filtersToUse.company?.trim()) {
                params.set('company', filtersToUse.company.trim());
            }
            if (filtersToUse.industry?.trim()) {
                params.set('industry', filtersToUse.industry.trim());
            }
            if (filtersToUse.connectionDegree?.trim()) {
                params.set('connection_degree', filtersToUse.connectionDegree.trim());
            }
            if (filtersToUse.quality?.trim()) {
                params.set('quality', filtersToUse.quality.trim());
            }
            if (filtersToUse.status && filtersToUse.status !== 'all') {
                params.set('status', filtersToUse.status);
            }
            if (filtersToUse.source && filtersToUse.source !== 'all') {
                params.set('source', filtersToUse.source);
            }
            if (filtersToUse.hasEmail) {
                params.set('hasEmail', 'true');
            }
            if (filtersToUse.hasLinkedin) {
                params.set('hasLinkedin', 'true');
            }
            if (filtersToUse.createdFrom) {
                params.set('createdFrom', filtersToUse.createdFrom);
            }
            if (filtersToUse.createdTo) {
                params.set('createdTo', filtersToUse.createdTo);
            }

            // PHASE 4: Filter by Review Status Tab
            if (reviewStatusTab) {
                params.set('review_status', reviewStatusTab);
            }

            // Quick / Advanced Logic construction
            let advancedPayload = null;

            // 1. Convert Quick Filters to Groups (OR logic between presets)
            const quickGroups = activeQuickFilters.map(id => {
                const q = QUICK_FILTERS.find(x => x.id === id);
                if (!q) return null;
                return {
                    operator: 'AND',
                    conditions: Object.entries(q.preset).map(([field, value]) => ({
                        field,
                        operator: 'contains',
                        value
                    }))
                };
            }).filter(Boolean);

            // 2. Combine with Manual Advanced Logic
            let manualGroups = [];
            if (filterMode === 'advanced' && !overrideFilters) {
                // extract groups from manual advanced filters
                manualGroups = advancedFilters.groups;
            }

            // If we have either quick filters OR manual advanced filters, send 'filters' param
            if (quickGroups.length > 0 || manualGroups.length > 0) {
                params.set('filters', JSON.stringify({
                    operator: 'OR', // Top level OR between Quick Presets and Manual Groups
                    groups: [...quickGroups, ...manualGroups]
                }));
            }

            const res = await axios.get(`/api/leads?${params.toString()}`);
            const data = Array.isArray(res.data) ? res.data : res.data.leads;
            const paginationData = res.data.pagination || { page: currentPage, limit: 50, total: data?.length || 0 };

            if (append) {
                setLeads(prev => [...prev, ...(data || [])]);
            } else {
                setLeads(data || []);
            }

            setPagination({
                page: paginationData.page,
                limit: paginationData.limit,
                total: paginationData.total || 0
            });
        } catch (error) {
            console.error("Failed to fetch leads", error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to load leads';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [statsRes, reviewRes] = await Promise.all([
                axios.get('/api/leads/stats'),
                axios.get('/api/leads/review-stats')
            ]);

            setStats(statsRes.data);
            if (reviewRes.data?.reviewStats) {
                setReviewStats(reviewRes.data.reviewStats);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
            // Don't show toast on stats error to avoid annoyance
        }
    };

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedLeads.size === leads.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedLeads);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedLeads(newSet);
    };

    const getReviewStatusBadge = (reviewStatus) => {
        switch (reviewStatus) {
            case 'to_be_reviewed':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-medium">🟡 Review</Badge>;
            case 'approved':
                return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 font-medium">✔ Qualified</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 font-medium">❌ Rejected</Badge>;
            default:
                // Fallback for null or other states
                return <Badge variant="outline" className="opacity-50 text-xs">Unknown</Badge>;
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLeads();
    };

    const handleResetFilters = () => {
        const emptyFilters = {
            title: '',
            location: '',
            industry: '',
            company: '',
            connectionDegree: '',
            status: 'all',
            source: 'all',
            hasEmail: false,
            hasLinkedin: false,
            createdFrom: '',
            createdTo: '',
        };
        setMetaFilters(emptyFilters);
        setActiveQuickFilters([]); // Clear quick filters
        setAdvancedFilters({ operator: 'OR', groups: [{ operator: 'AND', conditions: [{ field: 'title', operator: 'contains', value: '' }] }] });
        setSearchTerm('');
        setPagination({ page: 1, limit: 50, total: 0 });

        // Fetch with empty overrides
        fetchLeads(false, emptyFilters);
    };

    const toggleQuickFilter = (id) => {
        setActiveQuickFilters(prev => {
            const next = prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id];

            // Trigger fetch immediately with new quick filters state
            // Note: We can't rely on 'activeQuickFilters' state in this tick, so we pass nothing 
            // but we need fetchLeads to see the NEW activeQuickFilters.
            // Since fetchLeads uses closure state, we must wait for render or pass as arg.
            // But we didn't update fetchLeads signature to accept quickFilter overrides.
            // Best approach: Use useEffect on activeQuickFilters.
            return next;
        });
    };

    // Fetch when quick filters change
    useEffect(() => {
        // Debounce slightly or just fetch
        fetchLeads();
    }, [activeQuickFilters]);



    const hasActiveFilters = () => {
        if (activeQuickFilters.length > 0) return true;
        if (filterMode === 'advanced') {
            return advancedFilters.groups.some(g => g.conditions.length > 0 && g.conditions.some(c => c.value || c.operator.startsWith('is_')));
        }
        return metaFilters.title?.trim() ||
            metaFilters.location?.trim() ||
            metaFilters.industry?.trim() ||
            metaFilters.company?.trim() ||
            metaFilters.status !== 'all' ||
            metaFilters.source !== 'all' ||
            metaFilters.hasEmail ||
            metaFilters.hasLinkedin ||
            metaFilters.createdFrom ||
            metaFilters.createdTo;
    };

    const handleLoadMore = () => {
        fetchLeads(true);
    };

    const hasMoreLeads = () => {
        return leads.length < pagination.total;
    };

    const getStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'new': return 'default'; // Primary color
            case 'contacted': return 'secondary';
            case 'replied': return 'outline';
            default: return 'outline';
        }
    };

    // --- Preference-based scoring / sorting helpers ---

    const buildPreferredCompanyTerms = () => {
        const terms = new Set();

        if (branding.companyName) {
            terms.add(branding.companyName.toLowerCase());
        }

        if (preferences.preferredCompanyKeywords) {
            preferences.preferredCompanyKeywords
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((t) => terms.add(t.toLowerCase()));
        }

        return Array.from(terms);
    };

    const preferredCompanyTerms = buildPreferredCompanyTerms();

    const computePreferenceScore = (lead) => {
        let score = 0;

        const company = (lead.company || '').toLowerCase();
        if (company && preferredCompanyTerms.length > 0) {
            if (preferredCompanyTerms.some((term) => company.includes(term))) {
                score += 3;
            }
        }

        const connection =
            (lead.connection_degree ||
                lead.connectionDegree ||
                '').toString().toLowerCase();
        if (connection.startsWith('1')) {
            score += 2;
        } else if (connection.startsWith('2')) {
            score += 1;
        }

        const source = (lead.source || '').toLowerCase();
        if (source.includes('connection')) {
            score += 1;
        }

        return score;
    };

    const scoredLeads = usePreferences
        ? [...leads].sort((a, b) => computePreferenceScore(b) - computePreferenceScore(a))
        : leads;

    const handleExport = async (format = 'csv') => {
        if (reviewStatusTab === 'rejected') {
            addToast('Cannot export rejected leads.', 'error');
            return;
        }

        try {
            const params = {
                query: searchTerm,
                review_status: reviewStatusTab,
                format: format
            };

            // Add other filters if present
            if (metaFilters.title) params.title = metaFilters.title;
            if (metaFilters.industry) params.industry = metaFilters.industry;
            if (metaFilters.location) params.location = metaFilters.location;
            if (metaFilters.company) params.company = metaFilters.company;
            if (metaFilters.status !== 'all') params.status = metaFilters.status;
            if (metaFilters.source !== 'all') params.source = metaFilters.source;
            if (metaFilters.quality) params.quality = metaFilters.quality;

            const res = await axios.get('/api/leads/export', {
                responseType: 'blob',
                params
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(`Failed to export ${format.toUpperCase()}`, error);
            const errorMsg = error.response?.data?.error || error.message || `Failed to export ${format.toUpperCase()}`;
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleImportLeads = async () => {
        try {
            setImportingLeads(true);
            setImportProgress({ status: 'Starting...', progress: 0 });
            addToast('Starting Phantom search-import...', 'info');

            const body = searchTerm.trim() ? { query: searchTerm.trim() } : {};
            const res = await axios.post('/api/phantom/search-import', body);
            const jobId = res.data?.jobId;
            if (!jobId) {
                addToast('No job ID returned from search-import', 'error');
                setImportingLeads(false);
                setImportProgress(null);
                return;
            }

            const pollStatus = async () => {
                const statusRes = await axios.get(`/api/phantom/status/${jobId}`);
                const { status, progress, message } = statusRes.data;
                setImportProgress({ status: message || status, progress: progress ?? 0 });
                if (status === 'completed') {
                    addToast(`Import completed! ${statusRes.data?.jobInfo?.savedCount ?? 0} leads saved.`, 'success');
                    setImportingLeads(false);
                    setImportProgress(null);
                    fetchLeads();
                    fetchStats();
                    return;
                }
                if (status === 'error') {
                    addToast(`Import failed: ${message || 'Unknown error'}`, 'error');
                    setImportingLeads(false);
                    setImportProgress(null);
                    return;
                }
                setTimeout(pollStatus, 3000);
            };
            pollStatus();
        } catch (error) {
            console.error('Import leads error:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to start import';
            addToast(`Error: ${errorMsg}`, 'error');
            setImportingLeads(false);
            setImportProgress(null);
        }
    };

    // ============================================================================
    // PHASE 4: Bulk Action Handlers
    // ============================================================================

    const handleBulkApprove = async () => {
        const leadIds = Array.from(selectedLeads);
        if (leadIds.length === 0) return;

        try {
            await axios.post('/api/leads/bulk-approve', { leadIds });
            addToast(`✅ Qualified ${leadIds.length} lead(s)`, 'success');
            setSelectedLeads(new Set());
            fetchLeads();
            fetchStats(); // Update counters
        } catch (error) {
            console.error('Approve failed:', error);
            addToast('Failed to approve leads', 'error');
        }
    };

    const handleConfirmReject = async () => {
        const leadIds = Array.from(selectedLeads);
        if (leadIds.length === 0) return;

        try {
            await axios.post('/api/leads/bulk-reject', {
                leadIds,
                reason: rejectReason || 'other'
            });
            addToast(`❌ Rejected ${leadIds.length} lead(s)`, 'success');
            setSelectedLeads(new Set());
            setShowRejectModal(false);
            setRejectReason('');
            fetchLeads();
            fetchStats();
        } catch (error) {
            console.error('Reject failed:', error);
            addToast('Failed to reject leads', 'error');
        }
    };

    const handleMoveToReview = async () => {
        const leadIds = Array.from(selectedLeads);
        if (leadIds.length === 0) return;

        try {
            await axios.post('/api/leads/move-to-review', { leadIds });
            addToast(`↩ Moved ${leadIds.length} lead(s) back to review`, 'info');
            setSelectedLeads(new Set());
            fetchLeads();
            fetchStats();
        } catch (error) {
            console.error('Move to review failed:', error);
            addToast('Failed to move leads', 'error');
        }
    };

    // Single item handlers (wrappers for convenience)
    const handleApproveSingle = async (id) => {
        try {
            await axios.post('/api/leads/bulk-approve', { leadIds: [id] });
            addToast('Lead qualified', 'success');
            fetchLeads();
            fetchStats();
        } catch (error) { addToast('Failed to approve', 'error'); }
    };

    const handleRejectSingle = async (id) => {
        // Can directly reject or show modal? 
        // Showing modal for consistency if reason is needed, but for speed maybe default reason?
        // Let's force modal for single reject too since we want reason tracking
        setSelectedLeads(new Set([id]));
        setShowRejectModal(true);
    };

    const handleMoveToReviewSingle = async (id) => {
        try {
            await axios.post('/api/leads/move-to-review', { leadIds: [id] });
            addToast('Moved to review', 'info');
            fetchLeads();
            fetchStats();
        } catch (error) {
            addToast('Failed to move', 'error');
        }
    };
    const handleManualScrape = async () => {
        const leadIds = Array.from(selectedLeads);
        try {
            setEnriching(true);
            addToast(`🚀 Starting to get contacts for ${leadIds.length > 0 ? leadIds.length : 'all missing'} leads...`, 'info');

            const res = await axios.post('/api/scraper/scrape-contacts', { leadIds });

            if (res.data.success) {
                if (res.data.count === 0) {
                    addToast('No leads found that need contact info.', 'warning');
                } else {
                    addToast(res.data.message || 'Started getting contacts', 'success');
                    setSelectedLeads(new Set());
                }
            }
        } catch (error) {
            console.error('Scrape failed:', error);
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setEnriching(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Total Leads" value={reviewStats.total || stats.totalLeads} />
                <StatCard label="Qualified" value={reviewStats.approved} className="text-green-600" />
                <StatCard label="Review" value={reviewStats.to_be_reviewed} className="text-yellow-600" />
                <StatCard label="Rejected" value={reviewStats.rejected} className="text-red-600" />
            </div>

            {/* Main Content Card */}
            <Card className="border-border bg-card">
                <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl">Lead Management</CardTitle>
                                <CardDescription className="mt-1">
                                    Manage and track your potential clients here.
                                    {usePreferences && (
                                        <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                                            <Target className="h-3 w-3" />
                                            Prioritized by Preferences
                                        </span>
                                    )}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {reviewStatusTab === 'approved' && (
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-primary/50 text-primary hover:bg-primary/10 shadow-sm"
                                        onClick={handleManualScrape}
                                        disabled={enriching}
                                    >
                                        <Database className={cn("h-4 w-4", enriching && "animate-spin")} />
                                        Get Missing Contacts
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button className="gap-2 shadow-sm">
                                            <Download className="h-4 w-4" /> Export
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2">
                                            <Database className="h-4 w-4" /> Export CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport('xlsx')} className="gap-2">
                                            <Database className="h-4 w-4" /> Export Excel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Search and Filter Bar */}
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2 w-full">
                                <form onSubmit={handleSearch} className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search name, company, title..."
                                        className="pl-9 h-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </form>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowMetaFilters((prev) => !prev)}
                                    className={cn(
                                        "shrink-0 h-10 w-10 relative",
                                        hasActiveFilters() && "bg-primary/10 border-primary text-primary"
                                    )}
                                    title="Filters"
                                >
                                    <Filter className="h-4 w-4" />
                                    {hasActiveFilters() && (
                                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full font-semibold">
                                            {
                                                Object.keys(metaFilters).filter(k => {
                                                    // Filter out boolean flags if false, strings if empty/all
                                                    const v = metaFilters[k];
                                                    if (k === 'hasEmail' || k === 'hasLinkedin') return v === true;
                                                    return v && v !== 'all';
                                                }).length + activeQuickFilters.length
                                            }
                                        </span>
                                    )}
                                </Button>
                                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => fetchLeads(false)} title="Refresh">
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Combined Meta Filters Panel */}
                            {showMetaFilters && (
                                <div className="rounded-lg border bg-muted/40 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-semibold text-foreground">Filters</span>
                                            <div className="h-4 w-px bg-border mx-2" />
                                            <div className="flex bg-muted rounded-lg p-0.5">
                                                <button
                                                    onClick={() => filterMode !== 'simple' && toggleFilterMode()}
                                                    className={cn(
                                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                        filterMode === 'simple' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    Simple Filters
                                                </button>
                                                <button
                                                    onClick={() => filterMode !== 'advanced' && toggleFilterMode()}
                                                    className={cn(
                                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                                        filterMode === 'advanced' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    Advanced Logic
                                                </button>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setShowMetaFilters(false)}>
                                            Collapse
                                        </Button>
                                    </div>

                                    {/* Quick Search Presets */}
                                    <div className="border-b border-border/50 pb-4">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedSections(prev => ({ ...prev, quickFilters: !prev.quickFilters }))}
                                            className="flex items-center justify-between w-full text-left"
                                        >
                                            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                                Quick Filters
                                            </p>
                                            {expandedSections.quickFilters ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                        {expandedSections.quickFilters && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                                                {QUICK_FILTERS.map((filter) => {
                                                    const isActive = activeQuickFilters.includes(filter.id);

                                                    return (
                                                        <Button
                                                            key={filter.id}
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className={cn(
                                                                "h-auto flex-col items-start p-2.5 gap-1 text-xs transition-all duration-200 border",
                                                                isActive
                                                                    ? "bg-primary/10 border-primary text-primary hover:bg-primary/15 hover:border-primary ring-1 ring-primary/20"
                                                                    : "text-muted-foreground hover:text-foreground hover:border-primary/50"
                                                            )}
                                                            onClick={() => toggleQuickFilter(filter.id)}
                                                        >
                                                            <filter.icon className={cn("h-3.5 w-3.5 mb-0.5", isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-primary")} />
                                                            <span className={cn("font-medium", isActive ? "text-primary" : "text-foreground")}>{filter.label}</span>
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {filterMode === 'simple' ? (
                                        <>
                                            {/* Lead Search Fields */}
                                            <div className="border-b border-border/50 pb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedSections(prev => ({ ...prev, leadInformation: !prev.leadInformation }))}
                                                    className="flex items-center justify-between w-full text-left"
                                                >
                                                    <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                                        Lead Information
                                                    </p>
                                                    {expandedSections.leadInformation ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                                {expandedSections.leadInformation && (
                                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mt-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                                <Briefcase className="h-3 w-3" /> Job Title
                                                            </label>
                                                            <Input
                                                                placeholder="e.g. CEO, CTO"
                                                                value={metaFilters.title}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, title: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                                <Building2 className="h-3 w-3" /> Industry
                                                            </label>
                                                            <Input
                                                                placeholder="e.g. SaaS, Technology"
                                                                value={metaFilters.industry}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, industry: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                                <MapPin className="h-3 w-3" /> Location
                                                            </label>
                                                            <Input
                                                                placeholder="e.g. San Francisco, Remote"
                                                                value={metaFilters.location}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, location: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                                <Building2 className="h-3 w-3" /> Company
                                                            </label>
                                                            <Input
                                                                placeholder="e.g. Google, Startup"
                                                                value={metaFilters.company}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, company: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                                <UserPlus className="h-3 w-3" /> Connection Degree
                                                            </label>
                                                            <Input
                                                                placeholder="e.g. 1st, 2nd"
                                                                value={metaFilters.connectionDegree}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, connectionDegree: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status and Source */}
                                            <div className="border-b border-border/50 pb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedSections(prev => ({ ...prev, statusSource: !prev.statusSource }))}
                                                    className="flex items-center justify-between w-full text-left"
                                                >
                                                    <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                                        Status & Source
                                                    </p>
                                                    {expandedSections.statusSource ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                                {expandedSections.statusSource && (
                                                    <div className="grid gap-3 md:grid-cols-2 mt-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                                                            <select
                                                                className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm h-9"
                                                                value={metaFilters.status}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, status: e.target.value }))}
                                                            >
                                                                <option value="all">All Status</option>
                                                                <option value="new">New</option>
                                                                <option value="contacted">Contacted</option>
                                                                <option value="replied">Replied</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground">Source</label>
                                                            <select
                                                                className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm h-9"
                                                                value={metaFilters.source}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, source: e.target.value }))}
                                                            >
                                                                <option value="all">All Sources</option>
                                                                {stats.sourceCount &&
                                                                    Object.keys(stats.sourceCount).map((src) => (
                                                                        <option key={src} value={src}>
                                                                            {src} ({stats.sourceCount[src]})
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Advanced Options */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedSections(prev => ({ ...prev, advancedOptions: !prev.advancedOptions }))}
                                                    className="flex items-center justify-between w-full text-left"
                                                >
                                                    <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                                                        Advanced Options
                                                    </p>
                                                    {expandedSections.advancedOptions ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                                {expandedSections.advancedOptions && (
                                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground">Created From</label>
                                                            <Input
                                                                type="date"
                                                                value={metaFilters.createdFrom}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, createdFrom: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-medium text-muted-foreground">Created To</label>
                                                            <Input
                                                                type="date"
                                                                value={metaFilters.createdTo}
                                                                onChange={(e) => setMetaFilters((f) => ({ ...f, createdTo: e.target.value }))}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col justify-end gap-2">
                                                            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="accent-primary h-4 w-4"
                                                                    checked={metaFilters.hasEmail}
                                                                    onChange={(e) => setMetaFilters((f) => ({ ...f, hasEmail: e.target.checked }))}
                                                                />
                                                                Has Email
                                                            </label>
                                                            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="accent-primary h-4 w-4"
                                                                    checked={metaFilters.hasLinkedin}
                                                                    onChange={(e) => setMetaFilters((f) => ({ ...f, hasLinkedin: e.target.checked }))}
                                                                />
                                                                Has LinkedIn
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="animate-in fade-in duration-300">
                                            <FilterLogicBuilder
                                                filters={advancedFilters}
                                                onChange={setAdvancedFilters}
                                            />
                                        </div>
                                    )}


                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button size="sm" onClick={() => fetchLeads(false)}>
                                            Apply Filters
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleResetFilters}
                                        >
                                            Clear All
                                        </Button>
                                        {hasActiveFilters() && (
                                            <div className="flex-1 flex items-center justify-end text-xs text-muted-foreground">
                                                {Object.values(metaFilters).filter(v => v && v !== 'all').length} active filter(s)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader >
                <CardContent className="pt-0">
                    {/* PHASE 4: Review Status Tabs */}
                    <div className="flex gap-2 mb-4 border-b">
                        <button
                            onClick={() => setReviewStatusTab('approved')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
                                reviewStatusTab === 'approved'
                                    ? "border-green-500 text-green-600"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            🟢 Qualified Leads ({reviewStats.approved})
                        </button>
                        <button
                            onClick={() => setReviewStatusTab('to_be_reviewed')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
                                reviewStatusTab === 'to_be_reviewed'
                                    ? "border-yellow-500 text-yellow-600"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            🟡 Review ({reviewStats.to_be_reviewed})
                        </button>
                        <button
                            onClick={() => setReviewStatusTab('rejected')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
                                reviewStatusTab === 'rejected'
                                    ? "border-red-500 text-red-600"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            🔴 Rejected ({reviewStats.rejected})
                        </button>
                    </div>

                    {/* Selection Toolbar */}
                    {selectedLeads.size > 0 && (
                        <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg flex justify-between items-center mb-4 text-sm animate-in fade-in">
                            <span className="font-medium">{selectedLeads.size} leads selected</span>
                            <div className="flex gap-2">
                                {/* PHASE 4: Bulk Actions */}
                                {reviewStatusTab === 'to_be_reviewed' && (
                                    <>
                                        <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white border-none" onClick={handleBulkApprove}>
                                            ✅ Qualify
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => setShowRejectModal(true)}>
                                            ❌ Reject
                                        </Button>
                                    </>
                                )}
                                {(reviewStatusTab === 'approved' || reviewStatusTab === 'rejected') && (
                                    <Button size="sm" variant="outline" onClick={handleMoveToReview}>
                                        ↩ Move to Review
                                    </Button>
                                )}

                                <div className="w-px h-6 bg-primary/20 mx-1" />

                                <Button variant="ghost" size="sm" onClick={() => setSelectedLeads(new Set())} >
                                    Cancel
                                </Button>
                                {reviewStatusTab === 'approved' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
                                            onClick={() => {
                                                setIsBulkEnrich(true);
                                                setShowCampaignModal(true);
                                            }}
                                            disabled={enriching}
                                        >
                                            <Sparkles className={cn("h-4 w-4", enriching && "animate-spin")} />
                                            {enriching ? 'Enriching...' : 'Bulk Enrich & Personalize'}
                                        </Button>
                                        {reviewStatusTab === 'approved' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
                                                onClick={handleManualScrape}
                                                disabled={enriching}
                                            >
                                                <Database className={cn("h-4 w-4", enriching && "animate-spin")} />
                                                Get Contacts
                                            </Button>
                                        )}
                                        <Button size="sm" variant="default" onClick={() => {
                                            setIsBulkEnrich(false);
                                            setShowCampaignModal(true);
                                        }}>
                                            Add to Campaign
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {enriching && (
                        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg animate-pulse">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                <p className="text-sm font-medium text-primary">
                                    Enriching leads via PhantomBuster and generating AI messages... This may take a few minutes.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <input
                                            type="checkbox"
                                            className="accent-primary h-4 w-4"
                                            checked={leads.length > 0 && selectedLeads.size === leads.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    {/* Contact column only visible in Approved tab */}
                                    {reviewStatusTab === 'approved' && (
                                        <TableHead className="min-w-[180px]">Contact</TableHead>
                                    )}
                                    <TableHead className="text-center">Profile</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="p-0">
                                            <TableSkeleton rows={8} cols={7} />
                                        </TableCell>
                                    </TableRow>
                                ) : leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No leads found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    scoredLeads.map((lead) => (
                                        <TableRow key={lead.id} data-state={selectedLeads.has(lead.id) ? "selected" : undefined}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    className="accent-primary h-4 w-4"
                                                    checked={selectedLeads.has(lead.id)}
                                                    onChange={() => toggleSelect(lead.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-background">
                                                        {lead.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <button
                                                            onClick={() => navigate(`/leads/${lead.id}`)}
                                                            className="font-semibold hover:text-primary hover:underline text-left transition-colors truncate"
                                                        >
                                                            {lead.full_name || 'Unknown'}
                                                        </button>
                                                        {lead.email && (
                                                            <span className="text-xs text-muted-foreground truncate">{lead.email}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[180px] max-w-[250px]">
                                                <div className="flex flex-col">
                                                    {lead.company && lead.company.trim() ? (
                                                        <span className="font-semibold text-sm text-foreground break-words" title={lead.company}>
                                                            {lead.company}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground italic">—</span>
                                                    )}
                                                    {lead.location && lead.location.trim() && (
                                                        <span className="text-xs text-muted-foreground mt-1 break-words">
                                                            {lead.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[200px] max-w-[350px]">
                                                <span className="text-xs text-foreground leading-relaxed line-clamp-3 break-words" title={lead.title}>
                                                    {lead.title || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {lead.review_status === 'to_be_reviewed' ? (
                                                        <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">Review</span>
                                                    ) : (
                                                        <span className={cn(
                                                            "text-xs px-2 py-0.5 rounded border font-medium uppercase tracking-wider",
                                                            lead.review_status === 'approved' ? "bg-green-50 text-green-700 border-green-200" :
                                                                lead.review_status === 'rejected' ? "bg-red-50 text-red-700 border-red-200" :
                                                                    "text-muted-foreground border-transparent"
                                                        )}>
                                                            {lead.review_status === 'approved' && 'Qualified'}
                                                            {lead.review_status === 'rejected' && 'Rejected'}
                                                            {!lead.review_status && lead.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {/* Contact column only visible in Approved tab */}
                                            {reviewStatusTab === 'approved' && (
                                                <TableCell className="min-w-[180px]">
                                                    <div className="flex flex-col gap-1.5">
                                                        {/* Email */}
                                                        {lead.email ? (
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                                <span className="truncate" title={lead.email}>{lead.email}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                                                <span>—</span>
                                                            </div>
                                                        )}

                                                        {/* Phone */}
                                                        {lead.phone ? (
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                                <span className="truncate" title={lead.phone}>{lead.phone}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                                                <span>—</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-center">
                                                {lead.linkedin_url && (
                                                    <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors text-[#0077b5]">
                                                        <Linkedin className="w-5 h-5" />
                                                    </a>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                                        {/* PHASE 4: Review Actions */}
                                                        {lead.review_status === 'to_be_reviewed' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleApproveSingle(lead.id)}>
                                                                    ✅ Approve
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleRejectSingle(lead.id)}>
                                                                    ❌ Reject
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                            </>
                                                        )}
                                                        {lead.review_status !== 'to_be_reviewed' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleMoveToReviewSingle(lead.id)}>
                                                                    ↩ Move to Review
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                            </>
                                                        )}

                                                        <DropdownMenuItem onClick={() => navigate(`/leads/${lead.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4" /> View Details
                                                        </DropdownMenuItem>

                                                        {/* Campaign/Enrichment Actions (Gated) */}
                                                        {lead.review_status === 'approved' && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedLeads(new Set([lead.id]));
                                                                setSelectedCampaignId('');
                                                                setShowCampaignModal(true);
                                                            }}>
                                                                <Target className="mr-2 h-4 w-4" /> Add to Campaign
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive">Delete Lead</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* View More Button */}
                    {!loading && leads.length > 0 && hasMoreLeads() && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        View More ({pagination.total - leads.length} remaining)
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Pagination Info */}
                    {!loading && leads.length > 0 && (
                        <div className="mt-2 text-center text-xs text-muted-foreground">
                            Showing {leads.length} of {pagination.total} leads
                        </div>
                    )}
                </CardContent>
            </Card >

            {/* Add to Campaign Modal */}
            {
                showCampaignModal && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md shadow-2xl border-primary/20">
                            <CardHeader>
                                <CardTitle>{isBulkEnrich ? 'Bulk Enrich & Personalize' : 'Add Leads to Campaign'}</CardTitle>
                                <CardDescription>
                                    {isBulkEnrich
                                        ? `Select a campaign to generate personalized AI messages for ${selectedLeads.size} leads.`
                                        : `Select a campaign to assign the ${selectedLeads.size} selected leads.`
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isBulkEnrich && (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
                                        <p className="font-bold flex items-center gap-1 mb-1">
                                            <Sparkles className="h-3 w-3" /> AI Enrichment Flow:
                                        </p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Scrape full LinkedIn bio & activity via PhantomBuster</li>
                                            <li>Generate unique personalized message via OpenAI/Ollama</li>
                                            <li>Add messages to Campaign Approval Queue</li>
                                        </ul>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Select Campaign</label>
                                    <select
                                        className="w-full bg-muted border border-border rounded-md p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={selectedCampaignId}
                                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                                    >
                                        <option value="">-- Choose a Campaign --</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end pt-4">
                                    <Button variant="ghost" onClick={() => {
                                        setShowCampaignModal(false);
                                        setIsBulkEnrich(false);
                                    }}>Cancel</Button>
                                    <Button onClick={handleAddToCampaign} disabled={!selectedCampaignId} className="bg-primary hover:bg-primary/90">
                                        {isBulkEnrich ? 'Start Enrichment' : `Add ${selectedLeads.size} Leads`}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* PHASE 4: Reject Modal */}
            <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Leads</DialogTitle>
                        <DialogDescription>
                            Please select a reason for rejecting these leads. This helps improve lead quality tracking.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="reason" className="text-sm font-medium">Rejection Reason</label>
                            <select
                                id="reason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Select reason...</option>
                                <option value="not_icp">Not ICP (Ideal Customer Profile)</option>
                                <option value="low_quality">Low Quality Profile</option>
                                <option value="duplicate">Duplicate Entry</option>
                                <option value="wrong_geography">Wrong Geography</option>
                                <option value="other">Other / No Reason</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmReject}>
                            Reject {selectedLeads.size > 0 ? selectedLeads.size : ''} Lead(s)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <PageGuide pageKey="leads" />
        </div >
    );
}

function StatCard({ label, value, className }) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="text-sm font-medium text-muted-foreground mb-1">{label}</div>
                <div className={cn("text-2xl font-bold", className)}>{value}</div>
            </CardContent>
        </Card>
    );
}
