import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, Play, Pause, MoreVertical, Trash2, Edit2, Users,
    TrendingUp, Calendar, Target, ArrowRight, Search, Filter,
    CheckCircle2, Clock, XCircle, Zap, Copy, Tag, Flag, X, TrendingDown
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useToast } from '../components/ui/toast';
import { Skeleton } from '../components/ui/skeleton';
import PageGuide from '../components/PageGuide';
import CampaignWizard from '../components/CampaignWizard';
import { cn } from '../lib/utils';

export default function CampaignsPage() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterGoal, setFilterGoal] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setError(null);
            setLoading(true);
            const res = await axios.get('/api/campaigns');
            setCampaigns(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
            const errorMsg = err.response?.data?.error || err.message || 'Could not load campaigns';
            addToast(`Error: ${errorMsg}`, 'error');
            setError(errorMsg);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const createCampaign = async (payload) => {
        try {
            const res = await axios.post('/api/campaigns', payload);
            if (res.data) {
                addToast('Campaign created successfully', 'success');
                fetchCampaigns();
                setShowCreateModal(false);
                if (res.data.id) return res.data.id;
            }
        } catch (err) {
            console.error('Failed to create campaign:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to create campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const duplicateCampaign = async (id, e) => {
        e?.stopPropagation();
        try {
            const res = await axios.post(`/api/campaigns/${id}/duplicate`);
            if (res.data?.id) {
                addToast('Campaign duplicated', 'success');
                fetchCampaigns();
                navigate(`/campaigns/${res.data.id}`);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to duplicate';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const launchCampaign = async (id, e) => {
        e.stopPropagation();
        try {
            const res = await axios.post(`/api/campaigns/${id}/launch`);
            addToast(`Campaign launched! Processed ${res.data.leadsProcessed} leads.`, 'success');
            fetchCampaigns();
        } catch (err) {
            console.error('Failed to launch campaign:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to launch campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const pauseCampaign = async (id, e) => {
        e.stopPropagation();
        try {
            await axios.post(`/api/campaigns/${id}/pause`);
            addToast('Campaign paused', 'success');
            fetchCampaigns();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to pause';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const resumeCampaign = async (id, e) => {
        e.stopPropagation();
        try {
            await axios.post(`/api/campaigns/${id}/resume`);
            addToast('Campaign resumed', 'success');
            fetchCampaigns();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to resume';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const deleteCampaign = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this campaign?')) return;
        try {
            await axios.delete(`/api/campaigns/${id}`);
            addToast('Campaign deleted', 'success');
            fetchCampaigns();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to delete';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const getStatusConfig = (status) => {
        const configs = {
            active: {
                icon: Zap,
                color: '#10B981',
                bgColor: 'rgba(16, 185, 129, 0.1)',
                label: 'Active'
            },
            draft: {
                icon: Clock,
                color: '#F59E0B',
                bgColor: 'rgba(245, 158, 11, 0.1)',
                label: 'Draft'
            },
            paused: {
                icon: Pause,
                color: '#64748B',
                bgColor: 'rgba(100, 116, 139, 0.1)',
                label: 'Paused'
            },
            completed: {
                icon: CheckCircle2,
                color: '#8B5CF6',
                bgColor: 'rgba(139, 92, 246, 0.1)',
                label: 'Completed'
            },
        };
        return configs[status] || configs.draft;
    };

    const filteredCampaigns = campaigns.filter((c) => {
        const matchesSearch = !searchTerm ||
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
        const matchesGoal = filterGoal === 'all' || c.goal === filterGoal;
        const matchesType = filterType === 'all' || c.type === filterType;
        return matchesSearch && matchesStatus && matchesGoal && matchesType;
    });

    const stats = {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
        totalLeads: campaigns.reduce((sum, c) => sum + (c.lead_count || 0), 0),
    };

    const hasActiveFilters = filterStatus !== 'all' || filterGoal !== 'all' || filterType !== 'all';

    const clearFilters = () => {
        setFilterStatus('all');
        setFilterGoal('all');
        setFilterType('all');
    };

    const getResponseRateColor = (rate) => {
        if (rate >= 30) return 'text-emerald-600 dark:text-emerald-400';
        if (rate >= 15) return 'text-amber-600 dark:text-amber-400';
        return 'text-slate-600 dark:text-slate-400';
    };

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Campaigns
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Manage your LinkedIn outreach campaigns
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2 h-9 px-4">
                    <Plus className="w-4 h-4" /> New Campaign
                </Button>
            </div>

            {/* Summary Stats - Compact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                            Total Campaigns
                        </p>
                        <p className="text-[32px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                            {stats.total}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                            Active
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[32px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
                                {stats.active}
                            </p>
                            {stats.active > 0 && (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                            Draft
                        </p>
                        <p className="text-[32px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                            {stats.draft}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                            Total Leads
                        </p>
                        <p className="text-[32px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                            {stats.totalLeads.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Unified Toolbar - Sticky */}
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm -mx-6 px-6 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search campaigns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 border-slate-300 dark:border-slate-600 focus:border-primary"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 gap-2 border-slate-300 dark:border-slate-600",
                                        filterStatus !== 'all' && "border-primary bg-primary/5"
                                    )}
                                >
                                    <Filter className="h-4 w-4" />
                                    Status {filterStatus !== 'all' && `(${filterStatus})`}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterStatus('all')}>All</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('draft')}>Draft</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('paused')}>Paused</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('completed')}>Completed</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 gap-2 border-slate-300 dark:border-slate-600",
                                        filterGoal !== 'all' && "border-primary bg-primary/5"
                                    )}
                                >
                                    <Target className="h-4 w-4" />
                                    Goal {filterGoal !== 'all' && `(${filterGoal})`}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterGoal('all')}>All</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterGoal('connections')}>Connections</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterGoal('meetings')}>Meetings</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterGoal('pipeline')}>Pipeline</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterGoal('brand_awareness')}>Brand awareness</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterGoal('event_promotion')}>Event promotion</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 gap-2 border-slate-300 dark:border-slate-600",
                                        filterType !== 'all' && "border-primary bg-primary/5"
                                    )}
                                >
                                    <Tag className="h-4 w-4" />
                                    Type {filterType !== 'all' && `(${filterType})`}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterType('all')}>All</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('standard')}>Standard</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('event')}>Event</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('webinar')}>Webinar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('nurture')}>Nurture</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('re_engagement')}>Re-engagement</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Active Filter Pills */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {filterStatus !== 'all' && (
                            <Badge
                                variant="secondary"
                                className="gap-1.5 px-3 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                                onClick={() => setFilterStatus('all')}
                            >
                                Status: {filterStatus}
                                <X className="h-3 w-3" />
                            </Badge>
                        )}
                        {filterGoal !== 'all' && (
                            <Badge
                                variant="secondary"
                                className="gap-1.5 px-3 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                                onClick={() => setFilterGoal('all')}
                            >
                                Goal: {filterGoal}
                                <X className="h-3 w-3" />
                            </Badge>
                        )}
                        {filterType !== 'all' && (
                            <Badge
                                variant="secondary"
                                className="gap-1.5 px-3 py-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                                onClick={() => setFilterType('all')}
                            >
                                Type: {filterType}
                                <X className="h-3 w-3" />
                            </Badge>
                        )}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary hover:underline ml-2"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-6">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            Error loading campaigns: {error}. Please ensure backend is running.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="h-64">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-6 w-1/4" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <Skeleton className="h-2 w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : filteredCampaigns.length === 0 ? (
                    <Card className="col-span-full border-slate-200/60 dark:border-slate-700/60">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Target className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                                No campaigns found
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center max-w-md">
                                {searchTerm || hasActiveFilters
                                    ? 'Try adjusting your search or filters'
                                    : 'Create your first campaign to start reaching out to your LinkedIn connections'}
                            </p>
                            {!searchTerm && !hasActiveFilters && (
                                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                                    <Plus className="w-4 h-4" /> Create Campaign
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    filteredCampaigns.map((campaign, index) => {
                        const statusConfig = getStatusConfig(campaign.status);
                        const StatusIcon = statusConfig.icon;
                        const responseRate = campaign.response_rate || 0;
                        const responseRateColor = getResponseRateColor(responseRate);

                        return (
                            <Card
                                key={campaign.id}
                                className="group relative border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    animation: 'fadeInUp 300ms ease-out forwards',
                                    opacity: 0
                                }}
                            >
                                {/* Status Indicator Dot */}
                                <div
                                    className="absolute top-6 left-6 w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: statusConfig.color,
                                        boxShadow: campaign.status === 'active' ? `0 0 0 4px ${statusConfig.bgColor}` : 'none'
                                    }}
                                />

                                <CardHeader className="pb-3 pl-10">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                                                {campaign.name}
                                            </CardTitle>
                                            <CardDescription className="mt-2 text-sm line-clamp-2 leading-relaxed">
                                                {campaign.description || 'No description'}
                                            </CardDescription>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/campaigns/${campaign.id}`);
                                                }}>
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => duplicateCampaign(campaign.id, e)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                {campaign.status === 'draft' && (
                                                    <DropdownMenuItem onClick={(e) => launchCampaign(campaign.id, e)}>
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Launch
                                                    </DropdownMenuItem>
                                                )}
                                                {campaign.status === 'active' && (
                                                    <DropdownMenuItem onClick={(e) => pauseCampaign(campaign.id, e)}>
                                                        <Pause className="h-4 w-4 mr-2" />
                                                        Pause
                                                    </DropdownMenuItem>
                                                )}
                                                {campaign.status === 'paused' && (
                                                    <DropdownMenuItem onClick={(e) => resumeCampaign(campaign.id, e)}>
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Resume
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e) => deleteCampaign(campaign.id, e)}
                                                    className="text-red-600 dark:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-5 pt-2">
                                    {/* Metrics Row */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                            <Users className="h-4 w-4" />
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                {campaign.lead_count || 0}
                                            </span>
                                        </div>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <div className={cn("flex items-center gap-1.5 font-semibold", responseRateColor)}>
                                            {responseRate >= 30 ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : responseRate >= 15 ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4" />
                                            )}
                                            <span className="text-lg font-bold tracking-tight">
                                                {responseRate}%
                                            </span>
                                        </div>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                            <Clock className="h-3.5 w-3.5" />
                                            {campaign.created_at
                                                ? new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                : 'N/A'}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2">
                                        <div className="h-[3px] bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${campaign.progress || 0}%`,
                                                    backgroundColor: statusConfig.color
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {(campaign.goal || campaign.type || campaign.priority) && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {campaign.goal && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    {campaign.goal}
                                                </span>
                                            )}
                                            {campaign.type && campaign.type !== 'standard' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    {campaign.type}
                                                </span>
                                            )}
                                            {campaign.priority && campaign.priority !== 'normal' && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                    <Flag className="h-2.5 w-2.5" />
                                                    {campaign.priority}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Create Campaign Wizard */}
            {showCreateModal && (
                <CampaignWizard
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createCampaign}
                />
            )}

            <PageGuide pageKey="campaigns" />

            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
