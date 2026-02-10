import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, Play, Pause, MoreVertical, Trash2, Edit2, Users,
    TrendingUp, Calendar, Target, ArrowRight, Search, Filter,
    CheckCircle2, Clock, XCircle, Zap, Copy, Tag, Flag
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
import { Skeleton, TableSkeleton } from '../components/ui/skeleton';
import PageGuide from '../components/PageGuide';

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

    const deleteCampaign = async (id, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`/api/campaigns/${id}`);
            addToast('Campaign deleted', 'info');
            fetchCampaigns();
        } catch (err) {
            console.error('Failed to delete campaign:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to delete campaign';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const getStatusConfig = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return { variant: 'default', icon: Zap, color: 'text-green-500' };
            case 'draft':
                return { variant: 'secondary', icon: Clock, color: 'text-yellow-500' };
            case 'completed':
                return { variant: 'outline', icon: CheckCircle2, color: 'text-blue-500' };
            case 'paused':
                return { variant: 'outline', icon: Pause, color: 'text-orange-500' };
            default:
                return { variant: 'outline', icon: XCircle, color: 'text-gray-500' };
        }
    };

    const filteredCampaigns = campaigns.filter(camp => {
        const matchesSearch = camp.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || camp.status === filterStatus;
        const matchesGoal = filterGoal === 'all' || camp.goal === filterGoal;
        const matchesType = filterType === 'all' || camp.type === filterType;
        return matchesSearch && matchesStatus && matchesGoal && matchesType;
    });

    const stats = {
        total: campaigns.length,
        active: campaigns.filter(c => c.status === 'active').length,
        draft: campaigns.filter(c => c.status === 'draft').length,
        totalLeads: campaigns.reduce((sum, c) => sum + (c.lead_count || 0), 0)
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
                    <p className="text-muted-foreground mt-1">
                        Organize and manage your LinkedIn outreach campaigns
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> New Campaign
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All campaigns</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Zap className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently running</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Draft</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.draft}</div>
                        <p className="text-xs text-muted-foreground">Not yet started</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalLeads}</div>
                        <p className="text-xs text-muted-foreground">Across all campaigns</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filter */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search campaigns..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Filter className="h-4 w-4" />
                                    Status: {filterStatus === 'all' ? 'All' : filterStatus}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setFilterStatus('all')}>All</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('draft')}>Draft</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('paused')}>Paused</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus('completed')}>Completed</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Target className="h-4 w-4" />
                                    Goal: {filterGoal === 'all' ? 'All' : filterGoal}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Goal</DropdownMenuLabel>
                                <DropdownMenuSeparator />
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
                                <Button variant="outline" className="gap-2">
                                    <Tag className="h-4 w-4" />
                                    Type: {filterType === 'all' ? 'All' : filterType}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Type</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setFilterType('all')}>All</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('standard')}>Standard</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('event')}>Event</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('webinar')}>Webinar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('nurture')}>Nurture</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('re_engagement')}>Re-engagement</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-sm text-destructive">
                            Error loading campaigns: {error}. Please ensure backend is running.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {searchTerm || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Create your first campaign to get started'}
                            </p>
                            {!searchTerm && filterStatus === 'all' && (
                                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                                    <Plus className="w-4 h-4" /> Create Campaign
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    filteredCampaigns.map((campaign) => {
                        const statusConfig = getStatusConfig(campaign.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <Card
                                key={campaign.id}
                                className="group hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-card/40 backdrop-blur-sm border-white/5 transition-all duration-500 cursor-pointer hover:border-primary/40 relative overflow-hidden"
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            >
                                {/* Hover Gradient Accent */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl font-bold flex items-center gap-2 group-hover:text-primary transition-colors">
                                                {campaign.name}
                                            </CardTitle>
                                            <CardDescription className="mt-1.5">
                                                {campaign.description || 'No description'}
                                            </CardDescription>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {campaign.goal && (
                                                    <Badge variant="outline" className="text-[10px] capitalize">{campaign.goal}</Badge>
                                                )}
                                                {campaign.type && campaign.type !== 'standard' && (
                                                    <Badge variant="outline" className="text-[10px]">{campaign.type}</Badge>
                                                )}
                                                {campaign.priority && campaign.priority !== 'normal' && (
                                                    <Badge variant="outline" className="text-[10px] gap-0.5">
                                                        <Flag className="h-2.5 w-2.5" /> {campaign.priority}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                                    Duplicate Campaign
                                                </DropdownMenuItem>
                                                {campaign.status !== 'active' && (
                                                    <DropdownMenuItem onClick={(e) => launchCampaign(campaign.id, e)}>
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Launch Campaign
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={(e) => deleteCampaign(campaign.id, e)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2">
                                        <Badge variant={statusConfig.variant} className="gap-1.5">
                                            <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                                            <span className="capitalize">{campaign.status || 'draft'}</span>
                                        </Badge>
                                        {campaign.status === 'active' && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                Running
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Leads</p>
                                            <p className="text-2xl font-bold">{campaign.lead_count || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Response Rate</p>
                                            <p className="text-2xl font-bold">
                                                {campaign.response_rate || 0}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Progress</span>
                                            <span>{campaign.progress || 0}%</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${campaign.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Created Date */}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            Created {campaign.created_at
                                                ? new Date(campaign.created_at).toLocaleDateString()
                                                : 'Unknown'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <CreateCampaignModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={createCampaign}
                />
            )}

            <PageGuide pageKey="campaigns" />
        </div>
    );
}

// Create Campaign Modal Component – full campaign settings
const CAMPAIGN_TYPES = [
    { value: 'standard', label: 'Standard outreach' },
    { value: 'event', label: 'Event promotion' },
    { value: 'webinar', label: 'Webinar' },
    { value: 'nurture', label: 'Nurture' },
    { value: 're_engagement', label: 'Re-engagement' },
    { value: 'cold_outreach', label: 'Cold outreach' }
];
const CAMPAIGN_GOALS = [
    { value: 'connections', label: 'Connections' },
    { value: 'meetings', label: 'Meetings booked' },
    { value: 'pipeline', label: 'Pipeline / deals' },
    { value: 'brand_awareness', label: 'Brand awareness' },
    { value: 'event_promotion', label: 'Event promotion' },
    { value: 'content_engagement', label: 'Content engagement' }
];
const CAMPAIGN_PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
];

function CreateCampaignModal({ onClose, onCreate }) {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('standard');
    const [goal, setGoal] = useState('connections');
    const [targetAudience, setTargetAudience] = useState('');
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [dailyCap, setDailyCap] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [tagsStr, setTagsStr] = useState('');
    const [priority, setPriority] = useState('normal');
    const [notes, setNotes] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    useEffect(() => {
        axios.get('/api/campaigns/templates').then(res => {
            if (Array.isArray(res.data)) setTemplates(res.data);
        }).catch(() => {});
    }, []);

    const handleTemplateSelect = (t) => {
        setSelectedTemplate(t);
        if (t.name) setName(t.name);
        if (t.description) setDescription(t.description);
        if (t.goal) setGoal(t.goal);
        if (t.type) setType(t.type);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            addToast('Please enter a campaign name', 'warning');
            return;
        }
        
        // Validate and convert datetime fields - if provided, they must be complete
        // datetime-local format is YYYY-MM-DDTHH:mm
        let scheduleStartISO = undefined;
        let scheduleEndISO = undefined;
        
        if (scheduleStart && scheduleStart.trim()) {
            // Check if datetime is complete (must include 'T' separator)
            if (!scheduleStart.includes('T')) {
                addToast('Please enter a complete date and time for schedule start, or leave it empty', 'warning');
                return;
            }
            try {
                const date = new Date(scheduleStart);
                if (isNaN(date.getTime())) {
                    addToast('Please enter a valid date and time for schedule start', 'warning');
                    return;
                }
                scheduleStartISO = date.toISOString();
            } catch (err) {
                addToast('Please enter a valid date and time for schedule start', 'warning');
                return;
            }
        }
        
        if (scheduleEnd && scheduleEnd.trim()) {
            // Check if datetime is complete (must include 'T' separator)
            if (!scheduleEnd.includes('T')) {
                addToast('Please enter a complete date and time for schedule end, or leave it empty', 'warning');
                return;
            }
            try {
                const date = new Date(scheduleEnd);
                if (isNaN(date.getTime())) {
                    addToast('Please enter a valid date and time for schedule end', 'warning');
                    return;
                }
                scheduleEndISO = date.toISOString();
            } catch (err) {
                addToast('Please enter a valid date and time for schedule end', 'warning');
                return;
            }
        }
        
        // Validate that end date is after start date if both are provided
        if (scheduleStartISO && scheduleEndISO) {
            if (new Date(scheduleEndISO) <= new Date(scheduleStartISO)) {
                addToast('Schedule end must be after schedule start', 'warning');
                return;
            }
        }
        
        const tags = tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        onCreate({
            name: name.trim(),
            description: description.trim() || undefined,
            type,
            goal,
            target_audience: targetAudience.trim() || undefined,
            schedule_start: scheduleStartISO,
            schedule_end: scheduleEndISO,
            daily_cap: dailyCap ? parseInt(dailyCap, 10) : 0,
            timezone: timezone || 'UTC',
            tags: tags.length ? tags : undefined,
            priority,
            notes: notes.trim() || undefined
        });
        setName('');
        setDescription('');
        setType('standard');
        setGoal('connections');
        setTargetAudience('');
        setScheduleStart('');
        setScheduleEnd('');
        setDailyCap('');
        setTimezone('UTC');
        setTagsStr('');
        setPriority('normal');
        setNotes('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto py-8">
            <Card className="w-full max-w-2xl mx-4 my-auto">
                <CardHeader>
                    <CardTitle>Create New Campaign</CardTitle>
                    <CardDescription>
                        Configure your LinkedIn outreach campaign with goals, schedule, and limits
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {templates.length > 0 && (
                        <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
                            <p className="text-sm font-medium mb-2">Start from template</p>
                            <div className="flex flex-wrap gap-2">
                                {templates.map((t) => (
                                    <Button
                                        key={t.id || t.name}
                                        type="button"
                                        variant={selectedTemplate?.id === t.id || selectedTemplate?.name === t.name ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleTemplateSelect(t)}
                                    >
                                        {t.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Campaign Name *</label>
                                <Input
                                    placeholder="e.g., Q1 2025 Outreach"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <select
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    {CAMPAIGN_TYPES.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Goal</label>
                                <select
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                >
                                    {CAMPAIGN_GOALS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                                    placeholder="Describe your campaign goals..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Target audience</label>
                                <Input
                                    placeholder="e.g., VP Sales at SaaS companies"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schedule start (optional)</label>
                                <Input
                                    type="datetime-local"
                                    value={scheduleStart}
                                    onChange={(e) => setScheduleStart(e.target.value)}
                                    placeholder="Select date and time"
                                />
                                {scheduleStart && scheduleStart.length > 0 && !scheduleStart.includes('T') && (
                                    <p className="text-xs text-destructive">Please enter both date and time</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Schedule end (optional)</label>
                                <Input
                                    type="datetime-local"
                                    value={scheduleEnd}
                                    onChange={(e) => setScheduleEnd(e.target.value)}
                                    placeholder="Select date and time"
                                />
                                {scheduleEnd && scheduleEnd.length > 0 && !scheduleEnd.includes('T') && (
                                    <p className="text-xs text-destructive">Please enter both date and time</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Daily cap (0 = no limit)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={dailyCap}
                                    onChange={(e) => setDailyCap(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Timezone</label>
                                <Input
                                    placeholder="UTC"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <select
                                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    {CAMPAIGN_PRIORITIES.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tags (comma-separated)</label>
                                <Input
                                    placeholder="enterprise, q1, sales"
                                    value={tagsStr}
                                    onChange={(e) => setTagsStr(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium">Notes</label>
                                <textarea
                                    className="w-full min-h-[60px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                                    placeholder="Internal notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                Create Campaign
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
