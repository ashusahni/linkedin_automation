import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Users,
    Phone,
    Mail,
    Target,
    BarChart3,
    ArrowRight,
    FileText,
    MessageSquare,
    Zap,
    Calendar,
    Link2,
    UserCheck,
    UserPlus,
    Rocket,
    TrendingUp,
    Search,
    Filter,
    X,
    Info,
    Sparkles,
    MoveRight,
    Upload,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
    FunnelChart,
    Funnel,
    LabelList,
    Sector
} from 'recharts';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import PageGuide from '../components/PageGuide';

const PERIODS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

const CHART_COLORS = ['hsl(var(--primary))', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

// Industry-specific color palette - distinct colors for each industry
const INDUSTRY_COLORS = {
    "Accommodation Services": "#3b82f6", // Blue
    "Administrative and Support Services": "#8b5cf6", // Purple
    "Construction": "#f59e0b", // Amber
    "Consumer Services": "#ec4899", // Pink
    "Education": "#10b981", // Emerald
    "Entertainment Providers": "#f97316", // Orange
    "Farming, Ranching, Forestry": "#84cc16", // Lime
    "Financial Services": "#22c55e", // Green
    "Government Administration": "#6366f1", // Indigo
    "Holding Companies": "#14b8a6", // Teal
    "Hospitals and Health Care": "#fb923c", // Coral/Orange
    "Manufacturing": "#06b6d4", // Cyan
    "Oil, Gas, and Mining": "#64748b", // Slate
    "Professional Services": "#a855f7", // Violet
    "Real Estate and Equipment Rental Services": "#f43f5e", // Rose
    "Retail": "#eab308", // Yellow
    "Technology, Information and Media": "#059669", // Darker Emerald (distinct from Education)
    "Transportation, Logistics, Supply Chain and Storage": "#0ea5e9", // Sky Blue
    "Utilities": "#0891b2", // Darker Cyan (distinct from Manufacturing)
    "Wholesale": "#9333ea", // Deep Purple (distinct from Administrative)
    "Other": "#9ca3af", // Neutral Gray for unclassified leads
    "Marketing & Advertising": "#9333ea", // Purple
    "Food & Beverage Services": "#a16207",
    "Automotive": "#b91c1c",
    "Non-profit & Organization": "#0f766e",
    "Design & Arts": "#6d28d9",
};

// Get color for industry, with fallback
const getIndustryColor = (industryName) => {
    return INDUSTRY_COLORS[industryName] || CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)];
};

// Custom Tooltip Component for better visibility
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                <p className="font-semibold text-foreground text-sm mb-1">
                    {data.name}
                </p>
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: data.fill }}
                    />
                    <p className="text-foreground text-sm">
                        <span className="font-medium">{data.value}</span> leads
                    </p>
                </div>
                <p className="text-muted-foreground text-xs mt-1">
                    {data.percentage}% of total
                </p>
            </div>
        );
    }
    return null;
};

const InfoTooltip = ({ content }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <span className="inline-flex ml-2 cursor-help">
                <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
            </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
            <p className="font-normal text-sm">{content}</p>
        </TooltipContent>
    </Tooltip>
);

export default function DashboardPage() {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('monthly');
    const [analytics, setAnalytics] = useState(null);
    const [imports, setImports] = useState([]);
    const [branding, setBranding] = useState({ userName: '', companyName: '' });
    const [loading, setLoading] = useState(true);
    const [industrySearchTerm, setIndustrySearchTerm] = useState('');
    const [selectedIndustries, setSelectedIndustries] = useState(new Set());
    const [hoveredIndustry, setHoveredIndustry] = useState(null);
    const [activeCampaignIndex, setActiveCampaignIndex] = useState(null);

    // Preferences & Chart Interaction
    const [settings, setSettings] = useState(null);
    const [preferencesApplied, setPreferencesApplied] = useState(() => {
        return localStorage.getItem('usePreferences') === 'true';
    });
    const [preferencesLoading, setPreferencesLoading] = useState(false);
    const [showPreferenceSuccess, setShowPreferenceSuccess] = useState(false);

    // CSV Import State
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [importType, setImportType] = useState('csv'); // 'csv' or 'excel'
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    useEffect(() => {
        axios.get('/api/leads/imports?limit=5').then((r) => setImports(r.data || [])).catch(() => { });
    }, []);

    useEffect(() => {
        axios.get('/api/settings/branding').then((r) => setBranding(r.data || {})).catch(() => { });
    }, []);

    useEffect(() => {
        axios.get('/api/settings').then((r) => {
            setSettings(r.data || {});
        }).catch(() => { });
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [preferencesApplied]);

    const handleTogglePreferences = () => {
        setPreferencesLoading(true);
        setPreferencesApplied(prev => {
            const newState = !prev;
            localStorage.setItem('usePreferences', newState);
            return newState;
        });

        // Allow state upgrade then stop loading
        setTimeout(() => {
            setPreferencesLoading(false);
            setShowPreferenceSuccess(true);
            setTimeout(() => setShowPreferenceSuccess(false), 3000);
        }, 800);
    };

    const hasProfileUrl = !!settings?.preferences?.linkedinProfileUrl;

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/analytics/dashboard?period=${period}&preferences=${preferencesApplied}`);
            setAnalytics(res.data);
        } catch (err) {
            console.error('Failed to fetch dashboard analytics', err);
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (type) => {
        setImportType(type);
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (importType === 'csv' && !file.name.endsWith('.csv')) {
            setUploadResult({
                success: false,
                message: 'Please upload a CSV file'
            });
            return;
        }

        if (importType === 'excel' && !file.name.match(/\.(xlsx|xls)$/)) {
            setUploadResult({
                success: false,
                message: 'Please upload an Excel file (.xlsx or .xls)'
            });
            return;
        }

        const formData = new FormData();
        if (importType === 'csv') {
            formData.append('csvFile', file);
        } else {
            formData.append('excelFile', file);
        }

        try {
            setUploading(true);
            setUploadResult(null);

            const endpoint = importType === 'csv' ? '/api/leads/import-csv' : '/api/leads/import-excel';
            const res = await axios.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploadResult({
                success: true,
                message: 'Import completed successfully!',
                summary: res.data.summary
            });

            // Refresh data
            fetchAnalytics();
        } catch (error) {
            console.error('Upload failed:', error);
            let errorMessage = `Failed to upload ${importType.toUpperCase()} file`;
            if (error.response?.data?.error) errorMessage = error.response.data.error;
            else if (error.message) errorMessage = error.message;

            setUploadResult({
                success: false,
                message: errorMessage
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const ls = analytics?.leadScraping ?? {};
    const ca = analytics?.campaignAnalytics ?? {};
    const conn = ls.connectionBreakdown ?? {};
    const displayName = branding.userName || branding.companyName || 'there';

    // Lead Quality Data
    const lq = ls.leadQuality ?? { primary: 0, secondary: 0, tertiary: 0, totalScored: 0 };
    const totalQualityLeads = lq.primary + lq.secondary + lq.tertiary;
    const leadQualityData = [
        {
            id: 'primary',
            name: 'Primary',
            value: lq.primary,
            fill: '#10b981',
            desc: 'Highest relevance matches',
            percentage: totalQualityLeads > 0 ? (lq.primary / totalQualityLeads) * 100 : 0,
            tag: 'Core',
            tagVariant: 'default'
        },
        {
            id: 'secondary',
            name: 'Secondary',
            value: lq.secondary,
            fill: '#3b82f6',
            desc: 'Medium relevance matches',
            percentage: totalQualityLeads > 0 ? (lq.secondary / totalQualityLeads) * 100 : 0,
            tag: 'Adjacent',
            tagVariant: 'secondary'
        },
        {
            id: 'tertiary',
            name: 'Tertiary',
            value: lq.tertiary,
            fill: '#94a3b8',
            desc: 'Lower relevance matches',
            percentage: totalQualityLeads > 0 ? (lq.tertiary / totalQualityLeads) * 100 : 0,
            tag: 'Exploratory',
            tagVariant: 'outline'
        },
    ].filter(d => d.value > 0);

    // Industry + sub-industry data
    const rawIndustryDistribution = ls.industryDistribution || [];
    const totalLeadsCount = rawIndustryDistribution.reduce(
        (sum, d) => sum + (d.count || 0),
        0
    );

    // Top-level industries (default view)
    const industryPieData = rawIndustryDistribution
        .map((d) => ({
            name: d.industry,
            value: d.count || 0,
            fill: getIndustryColor(d.industry),
            percentage:
                totalLeadsCount > 0
                    ? (((d.count || 0) / totalLeadsCount) * 100).toFixed(2)
                    : '0.00',
            contextLabel: 'total leads',
            subCategories: Array.isArray(d.subCategories) ? d.subCategories : [],
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => {
            const isOtherA = a.name === 'Other' || a.name === 'Others';
            const isOtherB = b.name === 'Other' || b.name === 'Others';
            if (isOtherA && !isOtherB) return 1;
            if (!isOtherA && isOtherB) return -1;
            return b.value - a.value;
        });

    // Build sub-industry breakdown map: { [industryName]: SubSlice[] }
    const subIndustryMap = {};
    industryPieData.forEach((parent) => {
        const subs = parent.subCategories || [];
        if (!subs.length) return;

        const totalForParent = subs.reduce(
            (sum, s) => sum + (s.count || 0),
            0
        ) || parent.value;

        const slices = subs
            .map((sub, idx) => ({
                name: sub.name,
                value: sub.count || 0,
                fill: CHART_COLORS[idx % CHART_COLORS.length],
                percentage:
                    totalForParent > 0
                        ? (((sub.count || 0) / totalForParent) * 100).toFixed(2)
                        : '0.00',
                contextLabel: parent.name,
            }))
            .filter((s) => s.value > 0)
            .sort((a, b) => {
                const isOtherA = a.name === 'Other' || a.name === 'Others';
                const isOtherB = b.name === 'Other' || b.name === 'Others';
                if (isOtherA && !isOtherB) return 1;
                if (!isOtherA && isOtherB) return -1;
                return b.value - a.value;
            });

        if (slices.length > 0) {
            subIndustryMap[parent.name] = slices;
        }
    });

    // Filter industries based on search term (top-level only)
    const filteredIndustryData = industryPieData.filter((item) =>
        item.name.toLowerCase().includes(industrySearchTerm.toLowerCase())
    );

    // Toggle industry selection
    const toggleIndustrySelection = (industryName) => {
        const newSelected = new Set(selectedIndustries);
        if (newSelected.has(industryName)) {
            newSelected.delete(industryName);
        } else {
            newSelected.add(industryName);
        }
        setSelectedIndustries(newSelected);
    };

    // Clear all selections
    const clearSelections = () => {
        setSelectedIndustries(new Set());
        setIndustrySearchTerm('');
    };

    // If exactly one industry is selected AND we have sub-categories for it,
    // drill down the chart into that industry's sub-categories.
    const singleSelectedIndustry =
        selectedIndustries.size === 1
            ? Array.from(selectedIndustries)[0]
            : null;
    const activeSubIndustryData = singleSelectedIndustry
        ? subIndustryMap[singleSelectedIndustry] || null
        : null;
    const chartData = activeSubIndustryData && activeSubIndustryData.length > 0
        ? activeSubIndustryData
        : industryPieData;

    // Connection type data (no chart, just counts)
    const connectionData = {
        firstDegree: conn.firstDegree ?? 0,
        secondDegree: conn.secondDegree ?? 0,
        thirdDegree: conn.thirdDegree ?? 0,
    };

    // Calculate total and percentages
    const totalConnections = connectionData.firstDegree + connectionData.secondDegree + connectionData.thirdDegree;
    const connectionPercentages = {
        firstDegree: totalConnections > 0 ? ((connectionData.firstDegree / totalConnections) * 100).toFixed(1) : '0.0',
        secondDegree: totalConnections > 0 ? ((connectionData.secondDegree / totalConnections) * 100).toFixed(1) : '0.0',
        thirdDegree: totalConnections > 0 ? ((connectionData.thirdDegree / totalConnections) * 100).toFixed(1) : '0.0',
    };

    // Campaign type breakdown with green-gray range colors
    const campaignTypeColors = {
        standard: '#10b981',      // Emerald green
        webinar: '#059669',       // Darker green
        event: '#34d399',         // Light green
        nurture: '#6ee7b7',       // Pale green
        re_engagement: '#64748b', // Slate gray
        cold_outreach: '#475569', // Darker gray
        messages_sent: '#94a3b8', // Light gray
    };

    // Format type name for display
    const formatTypeName = (type) => {
        if (type === 'messages_sent') return 'Messages Sent';
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    // Build campaign type pie data from backend
    const campaignPieData = (ca.typeBreakdown ? Object.entries(ca.typeBreakdown) : [])
        .map(([type, count]) => ({
            name: formatTypeName(type),
            value: count || 0,
            fill: campaignTypeColors[type] || CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)],
            originalType: type,
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);

    return (
        <TooltipProvider>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
                {/* Preference Success Overlay/Toast */}
                {showPreferenceSuccess && (
                    <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                            <Sparkles className="h-5 w-5 animate-pulse" />
                            <span className="font-medium">
                                {preferencesApplied ? "Prioritizing your network & company matches!" : "Specific preferences cleared."}
                            </span>
                        </div>
                    </div>
                )}
                {/* Welcome + Period filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Welcome, {displayName}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-muted-foreground">
                                Search, lead generation & campaign analytics
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex rounded-lg border bg-muted/40 p-1">
                            {PERIODS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className={cn(
                                        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                                        period === p.value
                                            ? 'bg-background text-foreground shadow'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Preferences Button Row */}
                <div className="flex flex-col items-end gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={importType === 'csv' ? ".csv" : ".xlsx,.xls"}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Button
                            variant={preferencesApplied ? "default" : "outline"}
                            size="sm"
                            onClick={handleTogglePreferences}
                            disabled={preferencesLoading || !hasProfileUrl}
                            className={cn(
                                "gap-2 transition-all duration-500 w-full",
                                preferencesApplied ? "ring-2 ring-primary/20 shadow-lg scale-105" : "hover:bg-primary/5",
                                !hasProfileUrl && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {preferencesLoading ? (
                                <Sparkles className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className={cn("h-4 w-4", preferencesApplied ? "fill-current" : "text-muted-foreground")} />
                            )}
                            {preferencesLoading ? "Applying..." : preferencesApplied ? "Preferences Active" : "Apply Preferences"}
                            {!hasProfileUrl && <span className="text-xs ml-1 opacity-70">(Set profile URL first)</span>}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={uploading}
                                    className="gap-2 border-primary/20 hover:bg-primary/5 font-bold tracking-widest w-full"
                                >
                                    <Upload className="h-4 w-4" />
                                    {uploading ? "IMPORTING..." : "IMPORTS"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px]">
                                <DropdownMenuItem onClick={() => handleFileSelect('csv')} className="gap-2 cursor-pointer">
                                    <FileText className="h-4 w-4" />
                                    <span>Import CSV</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFileSelect('excel')} className="gap-2 cursor-pointer">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    <span>Import Excel</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Upload Result Alert */}
                    {uploadResult && (
                        <div className={cn(
                            "w-full max-w-md animate-in slide-in-from-top-2 fade-in duration-300 rounded-lg border p-4 shadow-sm",
                            uploadResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        )}>
                            <div className="flex items-start gap-3">
                                {uploadResult.success ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className={cn("font-medium text-sm", uploadResult.success ? "text-green-800" : "text-red-800")}>
                                            {uploadResult.message}
                                        </p>
                                        <button onClick={() => setUploadResult(null)} className="text-muted-foreground hover:text-foreground">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {uploadResult.summary && (
                                        <div className="mt-2 text-xs text-green-700 grid grid-cols-2 gap-x-4 gap-y-1">
                                            <p>Leads: {uploadResult.summary.totalLeads}</p>
                                            <p>Saved: {uploadResult.summary.saved}</p>
                                            <p>Duplicates: {uploadResult.summary.duplicates}</p>
                                            {uploadResult.summary.errors > 0 && <p>Errors: {uploadResult.summary.errors}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* —— Search & Lead Scraping —— */}
                <Card className={cn("transition-all duration-700", preferencesApplied && "border-primary/50 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.15)] ring-1 ring-primary/20")}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-primary" />
                            Lead Discovery & Insights
                        </CardTitle>
                        <CardDescription>
                            Extraction and lead quality metrics
                            {preferencesApplied && <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">Prioritized View</span>}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Lead Quality Distribution - Redesigned */}
                        <div className="rounded-lg border bg-muted/20 p-4 transition-all hover:bg-muted/30">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                                    Lead Quality Score
                                    <InfoTooltip content="Leads classified by relevance score based on your profile preferences." />
                                </p>
                            </div>

                            {loading ? (
                                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Calculating scores...</div>
                            ) : leadQualityData.length > 0 ? (
                                <div className="w-full">
                                    {/* KPI Cards (Full Width) */}
                                    <div className="flex-1 w-full grid grid-cols-1 gap-4">
                                        {leadQualityData.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="cursor-pointer flex flex-col p-4 rounded-md bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-all group relative overflow-hidden space-y-2"
                                                onClick={() => navigate(`/leads?quality=${item.id}`)}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity"
                                                    style={{ backgroundColor: item.fill }}
                                                />

                                                {/* Label & Value Row */}
                                                <div className="flex items-center justify-between pl-3 pr-2">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                                                {item.name}
                                                                {idx === 0 && <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-500/20" />}
                                                            </p>
                                                            <Badge variant={item.tagVariant} className="h-5 px-2 text-[10px] font-medium cursor-pointer hover:bg-opacity-80">
                                                                {item.tag}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-3xl font-bold tabular-nums tracking-tight leading-none">
                                                            {item.value}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            leads
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Unified UI Friendly Bar */}
                                                <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden ml-2 pr-2 mt-1">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                                        style={{
                                                            width: `${item.percentage}%`,
                                                            backgroundColor: item.fill,
                                                            opacity: 0.9
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                                    <Sparkles className="h-8 w-8 opacity-20" />
                                    <p>No scored leads yet</p>
                                    <p className="text-xs opacity-70">Add profile preferences to enable scoring</p>
                                </div>
                            )}
                        </div>

                        {/* Connection Type - Moved Up */}
                        <div className="rounded-lg border bg-muted/20 p-4 transition-all hover:bg-muted/30">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                                    Connection Type
                                    <InfoTooltip content="Distribution of 1st, 2nd, and 3rd degree connections." />
                                </p>
                            </div>
                            {loading ? (
                                <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div
                                        className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group"
                                        onClick={() => navigate('/leads?connection_degree=1st')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <UserCheck className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-foreground">1st degree</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold block leading-none">{connectionData.firstDegree}</span>
                                            <span className="text-xs text-muted-foreground">{connectionPercentages.firstDegree}%</span>
                                        </div>
                                    </div>
                                    <div
                                        className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group"
                                        onClick={() => navigate('/leads?connection_degree=2nd')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <UserPlus className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-foreground">2nd degree</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold block leading-none">{connectionData.secondDegree}</span>
                                            <span className="text-xs text-muted-foreground">{connectionPercentages.secondDegree}%</span>
                                        </div>
                                    </div>
                                    <div
                                        className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group"
                                        onClick={() => navigate('/leads?connection_degree=3rd')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Users className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-foreground">3rd degree</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold block leading-none">{connectionData.thirdDegree}</span>
                                            <span className="text-xs text-muted-foreground">{connectionPercentages.thirdDegree}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lead Metrics - Enhanced Visualization */}
                        <div className="rounded-lg border bg-muted/20 p-4 transition-all hover:bg-muted/30">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                    Lead Metrics
                                    <InfoTooltip content="Overview of total leads quality distribution and contact information availability." />
                                </p>
                            </div>

                            {
                                loading ? (
                                    <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading metrics...</div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Leads Quality Distribution Bar */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-foreground">Lead Quality Breakdown</span>
                                                <span className="font-bold text-foreground">{ls.totalLeads || 0} total</span>
                                            </div>
                                            <div className="w-full h-8 bg-muted/50 rounded-full overflow-hidden relative flex shadow-inner">
                                                {/* Primary segment - Green */}
                                                {lq.primary > 0 && (
                                                    <div
                                                        className="h-full bg-[#10b981] transition-all duration-1000 ease-out flex items-center justify-center relative group"
                                                        style={{ width: `${ls.totalLeads > 0 ? (lq.primary / ls.totalLeads) * 100 : 0}%` }}
                                                    >
                                                        <span className="text-[10px] sm:text-xs font-bold text-white px-1 truncate">
                                                            {lq.primary}
                                                        </span>
                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                            Primary: {lq.primary}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Secondary segment - Blue */}
                                                {lq.secondary > 0 && (
                                                    <div
                                                        className="h-full bg-[#3b82f6] transition-all duration-1000 ease-out flex items-center justify-center relative group"
                                                        style={{ width: `${ls.totalLeads > 0 ? (lq.secondary / ls.totalLeads) * 100 : 0}%` }}
                                                    >
                                                        <span className="text-[10px] sm:text-xs font-bold text-white px-1 truncate">
                                                            {lq.secondary}
                                                        </span>
                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                            Secondary: {lq.secondary}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Tertiary segment - Slate (Matching Quality Score) */}
                                                {lq.tertiary > 0 && (
                                                    <div
                                                        className="h-full bg-[#94a3b8] transition-all duration-1000 ease-out flex items-center justify-center relative group"
                                                        style={{ width: `${ls.totalLeads > 0 ? (lq.tertiary / ls.totalLeads) * 100 : 0}%` }}
                                                    >
                                                        <span className="text-[10px] sm:text-xs font-bold text-white px-1 truncate">
                                                            {lq.tertiary}
                                                        </span>
                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                            Tertiary: {lq.tertiary}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Primary</div>
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> Secondary</div>
                                                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" /> Tertiary</div>
                                            </div>
                                        </div>

                                        {/* Contact Availability Grid (Hidden for now) */}
                                        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <Mail className="h-3.5 w-3.5 text-blue-500" /> 
                                                        Leads with Email
                                                    </span>
                                                    <span className="font-bold text-foreground">{ls.leadsWithEmail || 0}</span>
                                                </div>
                                                <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                                                        style={{ width: `${ls.totalLeads > 0 ? (ls.leadsWithEmail / ls.totalLeads) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-right text-muted-foreground">
                                                    {ls.totalLeads > 0 ? Math.round((ls.leadsWithEmail / ls.totalLeads) * 100) : 0}% coverage
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5 text-emerald-500" /> 
                                                        Leads with Phone
                                                    </span>
                                                    <span className="font-bold text-foreground">{ls.leadsWithPhone || 0}</span>
                                                </div>
                                                <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                                                        style={{ width: `${ls.totalLeads > 0 ? (ls.leadsWithPhone / ls.totalLeads) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-right text-muted-foreground">
                                                    {ls.totalLeads > 0 ? Math.round((ls.leadsWithPhone / ls.totalLeads) * 100) : 0}% coverage
                                                </p>
                                            </div>
                                        </div> */}
                                    </div>
                                )
                            }
                        </div>

                        {/* Industry distribution - Full width, larger chart */}
                        <div className="rounded-lg border bg-muted/30 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4" />
                                    Industry Distribution
                                    <InfoTooltip content="Breakdown of leads by their identified industry." />
                                </p>
                                {industryPieData.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Total: {totalLeadsCount} leads</span>
                                        {selectedIndustries.size > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearSelections}
                                                className="h-6 px-2 text-xs"
                                            >
                                                <X className="h-3 w-3 mr-1" />
                                                Clear ({selectedIndustries.size})
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {
                                loading ? (
                                    <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                                ) : industryPieData.length > 0 ? (
                                    <>
                                        {/* Selected Industries Display */}
                                        {selectedIndustries.size > 0 && (
                                            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-primary" />
                                                        Selected Industries ({selectedIndustries.size})
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {Array.from(selectedIndustries).map((industryName) => {
                                                        const industry = industryPieData.find((d) => d.name === industryName);
                                                        if (!industry) return null;
                                                        return (
                                                            <div
                                                                key={industryName}
                                                                className="flex items-center gap-3 p-3 bg-background border border-primary/30 rounded-md hover:border-primary/50 transition-colors"
                                                            >
                                                                <div
                                                                    className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-background shadow-sm"
                                                                    style={{ backgroundColor: industry.fill }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                                        {industry.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-xs font-medium text-primary">
                                                                            {industry.value} {industry.value === 1 ? 'lead' : 'leads'}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">·</span>
                                                                        <span className="text-xs font-semibold text-foreground">
                                                                            {industry.percentage}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => toggleIndustrySelection(industryName)}
                                                                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {selectedIndustries.size > 0 && (
                                                    <div className="col-span-full mt-3 flex justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2 bg-background/50 hover:bg-background"
                                                            onClick={() => navigate(`/leads?industry=${encodeURIComponent(Array.from(selectedIndustries)[0])}`)}
                                                        >
                                                            <MoveRight className="h-4 w-4" />
                                                            View in Leads List
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid lg:grid-cols-2 gap-6">
                                            {/* Chart - Clean without labels */}
                                            <div className="flex flex-col items-center justify-center">
                                                {/* Show selected industry details above chart */}
                                                {selectedIndustries.size === 1 && (() => {
                                                    const selectedIndustry = industryPieData.find((d) =>
                                                        selectedIndustries.has(d.name)
                                                    );
                                                    if (!selectedIndustry) return null;

                                                    const subSlices =
                                                        subIndustryMap[selectedIndustry.name] || [];

                                                    return (
                                                        <div className="mb-4 w-full p-4 bg-primary/10 border border-primary/30 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-6 h-6 rounded-full flex-shrink-0 border-2 border-background shadow-md"
                                                                    style={{ backgroundColor: selectedIndustry.fill }}
                                                                />
                                                                <div className="flex-1">
                                                                    <p className="text-base font-bold text-foreground">
                                                                        {selectedIndustry.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <span className="text-sm font-semibold text-primary">
                                                                            {selectedIndustry.value}{' '}
                                                                            {selectedIndustry.value === 1 ? 'lead' : 'leads'}
                                                                        </span>
                                                                        <span className="text-sm text-muted-foreground">·</span>
                                                                        <span className="text-sm font-semibold text-foreground">
                                                                            {selectedIndustry.percentage}% of total leads
                                                                        </span>
                                                                    </div>
                                                                    {subSlices.length > 0 && (
                                                                        <div className="mt-3">
                                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                                                Sub-categories ({subSlices.length})
                                                                            </p>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {subSlices.slice(0, 6).map((sub) => (
                                                                                    <div
                                                                                        key={sub.name}
                                                                                        className="flex items-center justify-between rounded-md bg-background/80 border border-border/60 px-2.5 py-1.5"
                                                                                    >
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            <span
                                                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                                                style={{ backgroundColor: sub.fill }}
                                                                                            />
                                                                                            <span className="text-xs font-medium text-foreground truncate">
                                                                                                {sub.name}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                                                            <span>
                                                                                                {sub.value}{' '}
                                                                                                {sub.value === 1 ? 'lead' : 'leads'}
                                                                                            </span>
                                                                                            <span>·</span>
                                                                                            <span className="font-semibold text-foreground">
                                                                                                {sub.percentage}%
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <ResponsiveContainer width="100%" height={400}>
                                                    <PieChart>
                                                        <Pie
                                                            data={chartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={80}
                                                            outerRadius={140}
                                                            paddingAngle={3}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            label={false}
                                                        >
                                                            {chartData.map((entry, i) => {
                                                                const isSelected = selectedIndustries.has(entry.name);
                                                                const isHovered = hoveredIndustry === entry.name;
                                                                return (
                                                                    <Cell
                                                                        key={`cell-${i}`}
                                                                        fill={entry.fill}
                                                                        stroke={entry.fill}
                                                                        strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
                                                                        opacity={
                                                                            selectedIndustries.size > 0 && !isSelected
                                                                                ? 0.3
                                                                                : isHovered
                                                                                    ? 0.9
                                                                                    : 1
                                                                        }
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => toggleIndustrySelection(entry.name)}
                                                                    />
                                                                );
                                                            })}
                                                        </Pie>
                                                        <RechartsTooltip content={<CustomTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Filter Panel with Search and Industry List */}
                                            <div className="flex flex-col">
                                                {/* Search Bar */}
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search industries..."
                                                        value={industrySearchTerm}
                                                        onChange={(e) => setIndustrySearchTerm(e.target.value)}
                                                        className="pl-9 h-9"
                                                    />
                                                </div>

                                                {/* Industry List with Details */}
                                                <div className="border rounded-lg bg-background/50 p-3 max-h-[340px] overflow-y-auto relative">
                                                    <div className="space-y-2">
                                                        {filteredIndustryData.length > 0 ? (
                                                            filteredIndustryData.map((entry, i) => {
                                                                const isSelected = selectedIndustries.has(entry.name);
                                                                const isHovered = hoveredIndustry === entry.name;
                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        onClick={() => toggleIndustrySelection(entry.name)}
                                                                        onMouseEnter={() => setHoveredIndustry(entry.name)}
                                                                        onMouseLeave={() => setHoveredIndustry(null)}
                                                                        className={cn(
                                                                            "flex items-center gap-3 p-3 rounded-md transition-all cursor-pointer border relative group",
                                                                            isSelected
                                                                                ? "bg-primary/10 border-primary/50 shadow-sm"
                                                                                : "hover:bg-muted/50 border-transparent hover:border-border"
                                                                        )}
                                                                    >
                                                                        <div
                                                                            className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-background shadow-sm"
                                                                            style={{ backgroundColor: entry.fill }}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={cn(
                                                                                "text-sm font-medium text-foreground",
                                                                                isSelected && "text-primary"
                                                                            )}>
                                                                                {entry.name}
                                                                            </p>
                                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {entry.value} {entry.value === 1 ? 'lead' : 'leads'}
                                                                                </p>
                                                                                <span className="text-xs text-muted-foreground">·</span>
                                                                                <p className="text-xs font-semibold text-foreground">
                                                                                    {entry.percentage}%
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={cn(
                                                                                "h-8 w-8 ml-1 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all",
                                                                                !isHovered && !isSelected && "opacity-0 group-hover:opacity-100"
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/leads?industry=${encodeURIComponent(entry.name)}`);
                                                                            }}
                                                                            title="View leads"
                                                                        >
                                                                            <ArrowRight className="h-4 w-4" />
                                                                        </Button>

                                                                        {isSelected && (
                                                                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-1" />
                                                                        )}

                                                                        {/* Hover Tooltip - Similar to Chart Tooltip */}
                                                                        {isHovered && (
                                                                            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                                                                                <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                                                                                    <p className="font-semibold text-foreground text-sm mb-1">
                                                                                        {entry.name}
                                                                                    </p>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div
                                                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                                                            style={{ backgroundColor: entry.fill }}
                                                                                        />
                                                                                        <p className="text-foreground text-sm">
                                                                                            <span className="font-medium">{entry.value}</span> leads
                                                                                        </p>
                                                                                    </div>
                                                                                    <p className="text-muted-foreground text-xs mt-1">
                                                                                        {entry.percentage}% of total
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-center py-8 text-sm text-muted-foreground">
                                                                No industries found matching "{industrySearchTerm}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Summary Stats */}
                                                {filteredIndustryData.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground">
                                                            Showing {filteredIndustryData.length} of {industryPieData.length} industries
                                                        </span>
                                                        {filteredIndustryData.length < industryPieData.length && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setIndustrySearchTerm('')}
                                                                className="h-6 px-2 text-xs"
                                                            >
                                                                Clear search
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-96 flex items-center justify-center text-muted-foreground text-sm">No industry data available</div>
                                )
                            }
                        </div >

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="rounded-lg border bg-muted/30 p-4 flex flex-col justify-center">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Rocket className="h-3.5 w-3.5" />
                                    Extracted this period
                                    <InfoTooltip content={`Total number of profiles extracted during the ${period} period.`} />
                                </p>
                                <p className="text-3xl font-bold">
                                    {loading ? '—' : (ls.extractionByPeriod?.count ?? 0)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 capitalize">{period}</p>
                            </div>
                        </div>

                        {
                            ls.sourceCount && Object.keys(ls.sourceCount).length > 0 && (
                                <div className="pt-2 border-t">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center">
                                        By source (filter extracted data)
                                        <InfoTooltip content="Breakdown of extracted leads by their origin source." />
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(ls.sourceCount).map(([source, count]) => (
                                            <span
                                                key={source}
                                                className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-medium"
                                            >
                                                {source.replace(/_/g, ' ')}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </CardContent >
                </Card >

                {/* —— Campaign Analytics —— */}
                < Card >
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Campaign Analytics
                        </CardTitle>
                        <CardDescription>Status, messaging & engagement</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Campaign types pie + messaging stats */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="rounded-lg border bg-muted/30 p-6">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    Campaign Types
                                    <InfoTooltip content="Diversity of your outreach strategy by campaign type." />
                                </p>
                                {loading ? (
                                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                                ) : campaignPieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={campaignPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={75}
                                                paddingAngle={3}
                                                dataKey="value"
                                                nameKey="name"
                                                label={false}
                                                activeIndex={activeCampaignIndex}
                                                activeShape={(props) => {
                                                    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                                                    return (
                                                        <Sector
                                                            cx={cx}
                                                            cy={cy}
                                                            innerRadius={innerRadius}
                                                            outerRadius={outerRadius + 10}
                                                            startAngle={startAngle}
                                                            endAngle={endAngle}
                                                            fill={fill}
                                                            stroke="#ffffff"
                                                            strokeWidth={4}
                                                            opacity={1}
                                                        />
                                                    );
                                                }}
                                                onMouseEnter={(_, index) => setActiveCampaignIndex(index)}
                                                onMouseLeave={() => setActiveCampaignIndex(null)}
                                            >
                                                {campaignPieData.map((entry, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={entry.fill}
                                                        stroke="#1e293b"
                                                        strokeWidth={2}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value, name, props) => [
                                                    `${value} campaigns`,
                                                    props.payload.name
                                                ]}
                                                contentStyle={{
                                                    backgroundColor: '#1e293b',
                                                    border: '2px solid #10b981',
                                                    borderRadius: '8px',
                                                    padding: '12px 16px',
                                                    color: '#ffffff',
                                                    fontSize: '13px',
                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                                                    fontWeight: 500
                                                }}
                                                labelStyle={{
                                                    color: '#10b981',
                                                    fontWeight: 700,
                                                    marginBottom: '8px',
                                                    fontSize: '15px',
                                                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                                                }}
                                                itemStyle={{
                                                    color: '#f1f5f9',
                                                    fontWeight: 600,
                                                    fontSize: '13px'
                                                }}
                                            />
                                            <Legend
                                                wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }}
                                                iconType="circle"
                                                formatter={(value) => value}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                                        No campaign types available
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-lg border bg-muted/30 p-4 text-center hover:bg-muted/40 transition-colors flex flex-col items-center">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                        Messages sent
                                        <InfoTooltip content="Total messages sent across all campaigns." />
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">{loading ? '—' : (ca.messaging?.messagesSent ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-4 text-center hover:bg-muted/40 transition-colors flex flex-col items-center">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                        Replies
                                        <InfoTooltip content="Total replies received from leads." />
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">{loading ? '—' : (ca.messaging?.repliesReceived ?? 0)}</p>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-4 text-center hover:bg-muted/40 transition-colors flex flex-col items-center">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                        Engagement
                                        <InfoTooltip content="Percentage of leads who replied to messages." />
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">{loading ? '—' : (ca.messaging?.engagementPercent ?? 0)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border bg-primary/5 border-primary/20 p-5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                This period ({period})
                                <InfoTooltip content={`Aggregated metrics for the selected ${period} timeframe.`} />
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="text-center p-3 rounded-md bg-background/50 hover:bg-background/70 transition-colors">
                                    <p className="text-2xl font-bold text-foreground">{loading ? '—' : (ca.totalsByPeriod?.campaigns ?? 0)}</p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center">
                                        Campaigns <InfoTooltip content={`Active campaigns running during the ${period} period.`} />
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-md bg-background/50 hover:bg-background/70 transition-colors">
                                    <p className="text-2xl font-bold text-foreground">{loading ? '—' : (ca.totalsByPeriod?.leadsAdded ?? 0)}</p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center">
                                        Leads added <InfoTooltip content={`New leads added to campaigns during the ${period} period.`} />
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-md bg-background/50 hover:bg-background/70 transition-colors">
                                    <p className="text-2xl font-bold text-foreground">{loading ? '—' : (ca.totalsByPeriod?.messagesSent ?? 0)}</p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center">
                                        Messages sent <InfoTooltip content={`Messages sent specifically during the ${period} period.`} />
                                    </p>
                                </div>
                                <div className="text-center p-3 rounded-md bg-background/50 hover:bg-background/70 transition-colors">
                                    <p className="text-2xl font-bold text-foreground">{loading ? '—' : (ca.totalsByPeriod?.engagement ?? 0)}%</p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center">
                                        Engagement <InfoTooltip content={`Engagement rate calculated for the ${period} period.`} />
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card >

                {/* Recent imports + CTA */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center">
                                Recent imports
                                <InfoTooltip content="Your latest lead imports from PhantomBuster." />
                            </CardTitle>
                            <CardDescription>Last PhantomBuster imports</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {imports.length > 0 ? (
                                <ul className="space-y-2">
                                    {imports.slice(0, 5).map((imp, i) => (
                                        <li key={i} className="flex justify-between text-sm border-b border-border pb-2 last:border-0">
                                            <span className="font-medium capitalize">{imp.source?.replace(/_/g, ' ') ?? 'Import'}</span>
                                            <span className="text-muted-foreground">
                                                {imp.total_leads ?? imp.totalLeads ?? 0} leads · {imp.saved ?? 0} saved
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">No recent imports</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <h3 className="font-semibold text-lg">Manage leads & campaigns</h3>
                            <p className="text-sm text-muted-foreground mt-1 mb-4">
                                View, filter, and run outreach from Leads and Campaigns.
                            </p>
                            <div className="flex gap-2">
                                <Button onClick={() => navigate('/leads')} variant="default" className="gap-2">
                                    Leads <ArrowRight className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => navigate('/campaigns')} variant="outline" className="gap-2">
                                    Campaigns <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Page Guide Footer */}
                <PageGuide pageKey="dashboard" />
            </div>
        </TooltipProvider>
    );
}


function MiniStat({ label, value, icon: Icon }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div>
                <p className="text-lg font-semibold">{value ?? 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}
