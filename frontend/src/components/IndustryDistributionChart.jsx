import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Star, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const INDUSTRY_COLORS = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981',
    '#ef4444', '#06b6d4', '#f97316', '#84cc16', '#a855f7',
    '#14b8a6', '#f43f5e', '#6366f1', '#eab308', '#22c55e'
];

export default function IndustryDistributionChart({ leadCounts = {} }) {
    const [hierarchyData, setHierarchyData] = useState(null);
    const [selectedIndustry, setSelectedIndustry] = useState(null);
    const [subtags, setSubtags] = useState(null);
    const [selectedSubtag, setSelectedSubtag] = useState(null);
    const [preferenceMode, setPreferenceMode] = useState(false);
    const [profile, setProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortedIndustries, setSortedIndustries] = useState([]);
    const [expandedSections, setExpandedSections] = useState({
        subIndustries: true,
        jobRoles: false,
        metadata: false
    });

    // Load hierarchy data on mount
    useEffect(() => {
        loadHierarchyData();
        loadProfileSettings();
    }, []);

    // Sort industries when leadCounts, profile, or preference mode changes
    useEffect(() => {
        if (Object.keys(leadCounts).length > 0) {
            sortIndustries();
        }
    }, [leadCounts, profile, preferenceMode]);

    const loadHierarchyData = async () => {
        try {
            const res = await axios.get('/api/industry/hierarchy');
            setHierarchyData(res.data.data);
        } catch (error) {
            console.error('Failed to load industry hierarchy:', error);
        }
    };

    const loadProfileSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            if (res.data?.preferences) {
                const profileData = {
                    industry: res.data.preferences.industry || '',
                    title: res.data.preferences.title || '',
                    company: res.data.preferences.company || '',
                    metadata: res.data.preferences.metadata || []
                };
                setProfile(profileData);

                console.log('📊 Loaded profile for prioritization:', profileData);

                // Auto-enable preference mode if we have profile data
                if (profileData.industry || profileData.company || profileData.title) {
                    console.log('✅ Auto-enabling preference mode (profile data found)');
                    setPreferenceMode(true);
                } else {
                    console.warn('⚠️ No profile data found. Please add your LinkedIn profile to the database.');
                }
            }
        } catch (error) {
            console.error('Failed to load profile settings:', error);
        }
    };

    const sortIndustries = async () => {
        try {
            console.log('🔄 Sorting industries...', {
                preferenceMode,
                hasProfile: !!profile,
                profileData: profile
            });

            const res = await axios.post('/api/industry/prioritize', {
                industryCounts: leadCounts,
                profile: preferenceMode ? profile : null,
                preferenceMode
            });

            console.log('✅ Industries sorted:', res.data.data.slice(0, 5));
            setSortedIndustries(res.data.data);
        } catch (error) {
            console.error('Failed to sort industries:', error);
            // Fallback to simple count-based sorting
            const sorted = Object.entries(leadCounts)
                .map(([name, count]) => ({ name, count, score: count }))
                .sort((a, b) => b.count - a.count);
            setSortedIndustries(sorted);
        }
    };

    const loadSubtags = async (industryName) => {
        try {
            const res = await axios.get(`/api/industry/subtags?industry=${encodeURIComponent(industryName)}`);
            setSubtags(res.data.data);
        } catch (error) {
            console.error('Failed to load subtags:', error);
            setSubtags(null);
        }
    };

    const handleIndustryClick = (industryName) => {
        if (selectedIndustry === industryName) {
            // Deselect
            setSelectedIndustry(null);
            setSubtags(null);
            setSelectedSubtag(null);
        } else {
            // Select new industry
            setSelectedIndustry(industryName);
            setSelectedSubtag(null);
            loadSubtags(industryName);
        }
    };

    const handleSubtagClick = (subtag) => {
        setSelectedSubtag(subtag);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const getIndustryColor = (index) => {
        return INDUSTRY_COLORS[index % INDUSTRY_COLORS.length];
    };

    // Filter industries by search term
    const filteredIndustries = sortedIndustries.filter(industry =>
        industry.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Prepare chart data
    const chartData = filteredIndustries.slice(0, 10).map((industry, index) => ({
        name: industry.name,
        value: industry.count,
        color: getIndustryColor(index)
    }));

    // Calculate if industry is profile-matched (for highlighting)
    const isProfileMatched = (industryName) => {
        if (!profile || !preferenceMode) return false;
        const lowerName = industryName.toLowerCase();
        const lowerIndustry = (profile.industry || '').toLowerCase();
        return lowerName.includes(lowerIndustry) || lowerIndustry.includes(lowerName);
    };

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle>Industry Distribution</CardTitle>
                        {selectedIndustry && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ChevronRight className="h-4 w-4" />
                                <span className="font-medium">{selectedIndustry}</span>
                                {selectedSubtag && (
                                    <>
                                        <ChevronRight className="h-4 w-4" />
                                        <span>{selectedSubtag.name || selectedSubtag}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <Button
                        variant={preferenceMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreferenceMode(!preferenceMode)}
                        className="gap-2"
                    >
                        <Star className={cn("h-4 w-4", preferenceMode && "fill-current")} />
                        Preferences
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel: Subtags (when industry selected) */}
                    {selectedIndustry && subtags && (
                        <div className="col-span-3 space-y-4 border-r pr-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">Subtags</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedIndustry(null);
                                        setSubtags(null);
                                        setSelectedSubtag(null);
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Sub-Industries */}
                            {subtags.subIndustries && subtags.subIndustries.length > 0 && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => toggleSection('subIndustries')}
                                        className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary"
                                    >
                                        {expandedSections.subIndustries ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                        Sub-Industries ({subtags.subIndustries.length})
                                    </button>
                                    {expandedSections.subIndustries && (
                                        <div className="space-y-1 pl-6">
                                            {subtags.subIndustries.slice(0, 10).map((sub, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSubtagClick(sub)}
                                                    className={cn(
                                                        "text-xs text-left w-full p-2 rounded hover:bg-accent transition-colors",
                                                        selectedSubtag?.name === sub.name && "bg-accent"
                                                    )}
                                                >
                                                    {sub.name}
                                                </button>
                                            ))}
                                            {subtags.subIndustries.length > 10 && (
                                                <p className="text-xs text-muted-foreground pl-2">
                                                    +{subtags.subIndustries.length - 10} more
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Job Roles */}
                            {subtags.jobRoles && subtags.jobRoles.length > 0 && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => toggleSection('jobRoles')}
                                        className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary"
                                    >
                                        {expandedSections.jobRoles ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                        Job Roles ({subtags.jobRoles.length})
                                    </button>
                                    {expandedSections.jobRoles && (
                                        <div className="flex flex-wrap gap-1 pl-6">
                                            {subtags.jobRoles.slice(0, 15).map((role, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant="secondary"
                                                    className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                    onClick={() => handleSubtagClick(role)}
                                                >
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Metadata Tags */}
                            {subtags.metadataTags && subtags.metadataTags.length > 0 && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => toggleSection('metadata')}
                                        className="flex items-center gap-2 text-sm font-medium w-full hover:text-primary"
                                    >
                                        {expandedSections.metadata ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                        Categories ({subtags.metadataTags.length})
                                    </button>
                                    {expandedSections.metadata && (
                                        <div className="flex flex-wrap gap-1 pl-6">
                                            {subtags.metadataTags.map((tag, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant="outline"
                                                    className="text-xs cursor-pointer hover:bg-accent"
                                                    onClick={() => handleSubtagClick(tag)}
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Center: Donut Chart */}
                    <div className={cn(
                        "flex items-center justify-center",
                        selectedIndustry ? "col-span-6" : "col-span-7"
                    )}>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={140}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => handleIndustryClick(entry.name)}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-background border rounded-lg shadow-lg p-3">
                                                        <p className="font-semibold">{payload[0].name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {payload[0].value} leads
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-muted-foreground py-20">
                                <p>No industry data available</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Industry List */}
                    <div className={cn(
                        "space-y-3",
                        selectedIndustry ? "col-span-3" : "col-span-5"
                    )}>
                        <Input
                            placeholder="Search industries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-4"
                        />
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {filteredIndustries.map((industry, index) => {
                                const isMatched = isProfileMatched(industry.name);
                                const isSelected = selectedIndustry === industry.name;

                                return (
                                    <button
                                        key={industry.name}
                                        onClick={() => handleIndustryClick(industry.name)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                                            isSelected && "bg-accent border-primary",
                                            !isSelected && "hover:bg-accent/50",
                                            isMatched && preferenceMode && "border-primary/50 bg-primary/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: getIndustryColor(index) }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {industry.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {industry.count} leads
                                                </p>
                                            </div>
                                            {isMatched && preferenceMode && (
                                                <Star className="h-4 w-4 text-primary fill-current flex-shrink-0" />
                                            )}
                                        </div>
                                        {isSelected && (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
