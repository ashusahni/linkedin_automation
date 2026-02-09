import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Settings,
    Key,
    Linkedin,
    Webhook,
    ShieldCheck,
    Save,
    Copy,
    Check,
    AlertCircle,
    Server,
    Zap,
    Palette,
    User,
    Building2,
    Image,
    Loader2,
    Mail,
    Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '../components/ui/toast';

const SettingsPage = () => {
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [branding, setBranding] = useState({
        userName: '',
        companyName: '',
        logoUrl: '',
        profileImageUrl: '',
        theme: 'default'
    });
    const [brandingSaving, setBrandingSaving] = useState(false);

    const [settings, setSettings] = useState({
        pbApiKey: '',
        liCookie: '',
        maxDailyInvites: 20,
        webhookUrl: `${window.location.origin.replace('5173', '5000')}/api/webhooks/phantombuster`,
        linkedinProfileUrl: '',
        preferredCompanyKeywords: ''
    });

    // 🆕 Contact scraping progress state
    const [scrapingProgress, setScrapingProgress] = useState(null);
    const [isScrapingActive, setIsScrapingActive] = useState(false);

    useEffect(() => {
        axios.get('/api/settings/branding')
            .then((r) => setBranding(r.data || {}))
            .catch(() => { });
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                const data = res.data || {};
                setSettings((prev) => ({
                    ...prev,
                    pbApiKey: data.phantombuster?.apiKey || '',
                    liCookie: data.phantombuster?.linkedinSessionCookie || '',
                    maxDailyInvites: data.safety?.maxDailyInvites ?? prev.maxDailyInvites,
                    linkedinProfileUrl: data.preferences?.linkedinProfileUrl || '',
                    preferredCompanyKeywords: data.preferences?.preferredCompanyKeywords || ''
                }));
            } catch (error) {
                console.error('Failed to load settings', error);
                addToast('Failed to load settings', 'error');
            }
        };

        fetchSettings();
    }, [addToast]);

    // 🆕 Poll scraping progress every 5 seconds
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await axios.get('/api/scraper/global-progress');
                if (res.data.success) {
                    setScrapingProgress(res.data.progress);
                    setIsScrapingActive(res.data.progress.isActive);
                }
            } catch (error) {
                // Silently fail - don't spam errors
                setIsScrapingActive(false);
            }
        };

        // Fetch immediately
        fetchProgress();

        // Then poll every 5 seconds
        const interval = setInterval(fetchProgress, 5000);

        return () => clearInterval(interval);
    }, []);

    const saveBranding = () => {
        setBrandingSaving(true);
        axios.put('/api/settings/branding', branding)
            .then(() => {
                addToast('Branding saved. Refresh to see welcome and theme.', 'success');
            })
            .catch(() => addToast('Failed to save branding', 'error'))
            .finally(() => setBrandingSaving(false));
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(settings.webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const payload = {
                phantombuster: {
                    apiKey: settings.pbApiKey,
                    linkedinSessionCookie: settings.liCookie
                },
                safety: {
                    maxDailyInvites: settings.maxDailyInvites
                },
                preferences: {
                    linkedinProfileUrl: settings.linkedinProfileUrl,
                    preferredCompanyKeywords: settings.preferredCompanyKeywords
                }
            };

            await axios.put('/api/settings', payload);
            addToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings', error);
            const message = error.response?.data?.error || error.message || 'Failed to save settings';
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Configure your API integrations, security limits, and automation parameters.
                </p>
            </div>

            {/* 🆕 Contact Scraping Progress Bar */}
            {isScrapingActive && scrapingProgress && (
                <Card className="border-blue-500/50 bg-blue-500/5 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                <span className="text-sm font-medium">Scraping Contacts in Background</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>{scrapingProgress.processedProfiles} / {scrapingProgress.totalProfiles}</span>
                                </div>
                                <span className="font-semibold text-blue-600">{scrapingProgress.progressPercentage}%</span>
                            </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-blue-500 h-full transition-all duration-500 ease-out"
                                style={{ width: `${scrapingProgress.progressPercentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {scrapingProgress.activeJobsCount} active job{scrapingProgress.activeJobsCount !== 1 ? 's' : ''} running
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Branding / Welcome & Theme */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5 text-primary" />
                            Branding & Welcome
                        </CardTitle>
                        <CardDescription>
                            Personalize the dashboard welcome message, logo, profile image, and theme colors.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="user-name" className="flex items-center gap-2">
                                    <User className="w-4 h-4" /> Display name (e.g. Rishab)
                                </Label>
                                <Input
                                    id="user-name"
                                    placeholder="Rishab"
                                    value={branding.userName}
                                    onChange={(e) => setBranding({ ...branding, userName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company-name" className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Company name (e.g. Scottish Chemicals)
                                </Label>
                                <Input
                                    id="company-name"
                                    placeholder="Scottish Chemicals"
                                    value={branding.companyName}
                                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="logo-url" className="flex items-center gap-2">
                                    <Image className="w-4 h-4" /> Logo URL
                                </Label>
                                <Input
                                    id="logo-url"
                                    type="url"
                                    placeholder="https://..."
                                    value={branding.logoUrl}
                                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profile-url" className="flex items-center gap-2">
                                    <Image className="w-4 h-4" /> Profile image URL
                                </Label>
                                <Input
                                    id="profile-url"
                                    type="url"
                                    placeholder="https://..."
                                    value={branding.profileImageUrl}
                                    onChange={(e) => setBranding({ ...branding, profileImageUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Theme color</Label>
                            <div className="flex flex-wrap gap-2">
                                {['default', 'blue', 'green', 'violet'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setBranding({ ...branding, theme: t })}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${branding.theme === t
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={saveBranding} disabled={brandingSaving} className="gap-2">
                            <Save className="w-4 h-4" /> Save branding
                        </Button>
                    </CardFooter>
                </Card>

                {/* Integration Credentials */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            Integration Keys
                        </CardTitle>
                        <CardDescription>
                            Your credentials for PhantomBuster and LinkedIn.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pb-key">PhantomBuster API Key</Label>
                            <div className="relative">
                                <Input
                                    id="pb-key"
                                    type="password"
                                    value={settings.pbApiKey}
                                    onChange={(e) => setSettings({ ...settings, pbApiKey: e.target.value })}
                                    className="pr-10"
                                />
                                <Key className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="li-cookie">LinkedIn Session Cookie (li_at)</Label>
                            <div className="relative">
                                <Input
                                    id="li-cookie"
                                    type="password"
                                    value={settings.liCookie}
                                    onChange={(e) => setSettings({ ...settings, liCookie: e.target.value })}
                                    className="pr-10"
                                />
                                <Linkedin className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Never share your session cookie. It expires every few months.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* LinkedIn Preferences */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Linkedin className="w-5 h-5 text-primary" />
                            LinkedIn Preferences
                        </CardTitle>
                        <CardDescription>
                            Store your profile URL and preferred companies so lead views can prioritize relevant contacts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="li-profile" className="flex items-center gap-2">
                                <Linkedin className="w-4 h-4" /> LinkedIn profile URL
                            </Label>
                            <Input
                                id="li-profile"
                                type="url"
                                placeholder="https://www.linkedin.com/in/your-profile/"
                                value={settings.linkedinProfileUrl}
                                onChange={(e) => setSettings({ ...settings, linkedinProfileUrl: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="preferred-companies" className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Preferred companies (comma separated)
                            </Label>
                            <Input
                                id="preferred-companies"
                                placeholder="e.g. Your Company, Partner Co, Target Accounts"
                                value={settings.preferredCompanyKeywords}
                                onChange={(e) => setSettings({ ...settings, preferredCompanyKeywords: e.target.value })}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                These names help the Leads page surface contacts related to you and your company at the top.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Webhook Configuration */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Webhook className="w-5 h-5 text-blue-500" />
                            Webhook Listener
                        </CardTitle>
                        <CardDescription>
                            Paste this URL into your PhantomBuster dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Your Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input readOnly value={settings.webhookUrl} className="bg-muted/50 font-mono text-xs" />
                                <Button variant="outline" size="icon" onClick={handleCopy}>
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                                <p className="font-semibold mb-1">How to use:</p>
                                <p>Go to your Phantom settings &gt; Webhooks &gt; Paste this URL. This allows the CRM to update lead status in real-time.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Safety Limits */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            Account Safety
                        </CardTitle>
                        <CardDescription>
                            Respect LinkedIn limits to prevent account flags.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Max Connection Requests / Day</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="number"
                                    value={settings.maxDailyInvites}
                                    className="w-24"
                                    onChange={(e) => setSettings({ ...settings, maxDailyInvites: parseInt(e.target.value) })}
                                />
                                <span className="text-sm text-muted-foreground">Recommended: 20-30</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Warm-up Mode</Label>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Zap className="w-3 h-3" />
                                Gradually increase activity for new accounts (Coming Soon)
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Status */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="w-5 h-5 text-orange-500" />
                            System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-sm font-medium">Backend Service</span>
                            <span className="flex items-center gap-1.5 text-xs text-green-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Online
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-sm font-medium">PostgreSQL Database</span>
                            <span className="flex items-center gap-1.5 text-xs text-green-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                Connected
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium">PhantomBuster API</span>
                            <span className="flex items-center gap-1.5 text-xs text-green-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                Verified
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full gap-2"
                            onClick={handleSave}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Configuration</>}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default SettingsPage;
