import { useState, useRef, useEffect, Component, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Linkedin, Loader2, CheckCircle2, AlertCircle, Share2, Sparkles, Upload, FileText, X, Info, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import {
    readLeadSearchPipelineStorage,
    writeLeadSearchPipelineStorage,
    LEAD_SEARCH_PIPELINE_SYNC_EVENT,
} from '../lib/leadSearchPipelineStorage.js';

const PIPELINE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours between full cycles (after both phantoms finish)
const LEAD_SEARCH_ENGINE_RUN_KEY = 'leadSearchEngineRun_v1';
const LEAD_SEARCH_PIPELINE_RUN_KEY = 'leadSearchPipelineRun_v1';
const PIPELINE_RESTORE_MAX_MS = 6 * 60 * 60 * 1000;
const ENGINE_POLL_MS = 5000;
const ENGINE_NO_RUNNING_GIVEUP_MS = 3 * 60 * 1000;

const InfoTooltip = ({ content }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <span className="inline-flex ml-2 cursor-help">
                <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
            </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground border border-border shadow-xl p-3">
            <div className="font-normal text-sm">{content}</div>
        </TooltipContent>
    </Tooltip>
);

const IMPORT_SOURCE_OPTIONS = [
    { value: 'connections_export', label: 'Import My Connections', envLabel: 'CONNECTIONS_EXPORT_SOURCE', description: 'Your 1st-degree LinkedIn connections', icon: Share2 },
    { value: 'search_export', label: "Explore Bhavya's Connections", envLabel: 'SEARCH_EXPORT_SOURCE', description: 'Find 1st degree connections', icon: Search },
];

class LeadSearchErrorBoundary extends Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('LeadSearchPage error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 max-w-md mx-auto text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                    <h2 className="text-xl font-semibold">Something went wrong</h2>
                    <p className="text-sm text-muted-foreground">{this.state.error?.message || 'An error occurred on this page.'}</p>
                    <Button onClick={() => window.location.reload()} variant="outline">Reload page</Button>
                </div>
            );
        }
        return this.props.children;
    }
}

const initialPipeline = readLeadSearchPipelineStorage();

export default function LeadSearchPage() {
    const { addToast } = useToast();
    /** 'cooldown' = waiting for next cycle; 'connections' | 'search' = running that phantom */
    const [pipelinePhase, setPipelinePhase] = useState('cooldown');
    const [nextPipelineRunAt, setNextPipelineRunAt] = useState(initialPipeline.nextRunAt);
    const [pipelineAutoSyncEnabled, setPipelineAutoSyncEnabled] = useState(initialPipeline.enabled);
    const [countdownText, setCountdownText] = useState('');
    const pipelineInFlightRef = useRef(false);
    const [pipelineUiHint, setPipelineUiHint] = useState('');

    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    // CSV Import State
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [importType, setImportType] = useState('csv');
    const fileInputRef = useRef(null);

    // 1st degree (Phantom) import stats for widget: { saved, totalLeads, timestamp }
    const [firstDegreeImportStats, setFirstDegreeImportStats] = useState(null);
    const [firstDegreeImportLoading, setFirstDegreeImportLoading] = useState(false);
    const [showImportBreakdown, setShowImportBreakdown] = useState(false);
    /** True when loading state was restored after leaving the page mid-pipeline */
    const [restoredPipelineRun, setRestoredPipelineRun] = useState(false);

    const formatRemaining = (ms) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const fetchFirstDegreeImportStats = useCallback(() => {
        setFirstDegreeImportLoading(true);
        axios.get('/api/leads/imports?limit=50')
            .then((res) => {
                const rows = res.data || [];
                const last = rows.find((r) => r.source === 'connections_export');
                if (last) {
                    const totalLeads = Number(last.total_leads ?? 0);
                    const saved = Number(last.saved ?? 0);
                    const duplicates = Number.isFinite(Number(last.duplicates))
                        ? Number(last.duplicates)
                        : Math.max(0, totalLeads - saved);
                    setFirstDegreeImportStats({
                        saved,
                        totalLeads,
                        duplicates,
                        timestamp: last.timestamp,
                    });
                } else {
                    setFirstDegreeImportStats(null);
                    setShowImportBreakdown(false);
                }
            })
            .catch(() => setFirstDegreeImportStats(null))
            .finally(() => setFirstDegreeImportLoading(false));
    }, []);

    useEffect(() => {
        fetchFirstDegreeImportStats();
    }, [fetchFirstDegreeImportStats]);

    useEffect(() => {
        const sync = () => {
            const cfg = readLeadSearchPipelineStorage();
            setNextPipelineRunAt(cfg.nextRunAt);
            setPipelineAutoSyncEnabled(cfg.enabled);
        };
        window.addEventListener(LEAD_SEARCH_PIPELINE_SYNC_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(LEAD_SEARCH_PIPELINE_SYNC_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    /** @returns {Promise<boolean>} true if HTTP success and no thrown error */
    const runImport = useCallback(async (source, options = {}) => {
        const { silent = false, quietToast = false } = options;
        if (!silent) {
            setError(null);
            setResults(null);
            try {
                sessionStorage.setItem(
                    LEAD_SEARCH_ENGINE_RUN_KEY,
                    JSON.stringify({ source, startedAt: Date.now() })
                );
            } catch (_) {
                /* ignore */
            }
        }

        try {
            const endpoint = source === 'connections_export'
                ? '/api/phantom/export-connections-complete'
                : '/api/phantom/search-leads-complete';

            const response = await axios.post(endpoint, {}, { timeout: 1800000 });

            if (!silent) setResults(response.data);

            if (source === 'connections_export') {
                fetchFirstDegreeImportStats();
            }

            if (!quietToast) {
                if (response.data.totalLeads > 0) {
                    addToast(`✅ Found ${response.data.totalLeads} leads and saved ${response.data.savedToDatabase} to database!`, 'success');
                } else {
                    addToast('⚠️ No new Leads found', 'warning');
                }
            }
            return true;
        } catch (err) {
            const backend = err.response?.data;
            const errorMsg = (backend && (backend.message || backend.error)) || err.message || 'Failed to search leads';
            const errorCode = backend?.code;
            const helpUrl = backend?.helpUrl || null;

            if (!silent) {
                setError({
                    message: errorMsg,
                    code: errorCode || null,
                    tips: backend?.tips || null,
                    helpUrl,
                });
            }
            addToast(errorCode ? `[${errorCode}] ${errorMsg}` : errorMsg, 'error', helpUrl ? { helpUrl } : {});
            return false;
        } finally {
            if (!silent) {
                try {
                    sessionStorage.removeItem(LEAD_SEARCH_ENGINE_RUN_KEY);
                } catch (_) {
                    /* ignore */
                }
            }
        }
    }, [addToast, fetchFirstDegreeImportStats]);

    const finishCooldown = useCallback(() => {
        const next = Date.now() + PIPELINE_INTERVAL_MS;
        setPipelinePhase('cooldown');
        setNextPipelineRunAt(next);
        setPipelineUiHint('');
        writeLeadSearchPipelineStorage({ nextRunAt: next });
        pipelineInFlightRef.current = false;
        try {
            sessionStorage.removeItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
        } catch (_) {
            /* ignore */
        }
        fetchFirstDegreeImportStats();
    }, [fetchFirstDegreeImportStats]);

    const runFullPipeline = useCallback(async () => {
        if (!pipelineAutoSyncEnabled) {
            pipelineInFlightRef.current = false;
            return;
        }
        if (pipelineInFlightRef.current) return;
        pipelineInFlightRef.current = true;
        setError(null);
        setResults(null);
        setPipelineUiHint('');

        const writeRun = (step) => {
            try {
                sessionStorage.setItem(
                    LEAD_SEARCH_PIPELINE_RUN_KEY,
                    JSON.stringify({ pipeline: true, step, startedAt: Date.now() })
                );
            } catch (_) {
                /* ignore */
            }
        };

        let okAll = true;
        try {
            setPipelinePhase('connections');
            setPipelineUiHint('Step 1 of 2: Import My Connections (1st degree)…');
            writeRun('connections');
            const ok1 = await runImport('connections_export', { silent: true, quietToast: true });
            if (!ok1) okAll = false;

            setPipelinePhase('search');
            setPipelineUiHint("Step 2 of 2: Explore Bhavya's Connections (1st degree)…");
            writeRun('search');
            const ok2 = await runImport('search_export', { silent: true, quietToast: true });
            if (!ok2) okAll = false;

            if (okAll) {
                addToast('Lead search pipeline completed (connections + search). Next cycle in 6 hours.', 'success');
            } else {
                addToast('Pipeline finished with errors on one or more steps. Next cycle in 6 hours.', 'warning');
            }
        } finally {
            finishCooldown();
        }
    }, [addToast, finishCooldown, runImport, pipelineAutoSyncEnabled]);

    useEffect(() => {
        if (pipelinePhase !== 'cooldown') {
            setCountdownText('');
            return undefined;
        }
        const tick = () => {
            const remaining = nextPipelineRunAt - Date.now();
            if (remaining <= 0) {
                setCountdownText('00:00:00');
                return;
            }
            setCountdownText(formatRemaining(remaining));
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [pipelinePhase, nextPipelineRunAt]);

    useEffect(() => {
        if (!pipelineAutoSyncEnabled) return;
        if (pipelinePhase !== 'cooldown') return;
        if (restoredPipelineRun) return;
        if (pipelineInFlightRef.current) return;
        if (!Number.isFinite(nextPipelineRunAt)) return;
        if (Date.now() < nextPipelineRunAt) return;
        void runFullPipeline();
    }, [pipelinePhase, nextPipelineRunAt, restoredPipelineRun, runFullPipeline, pipelineAutoSyncEnabled]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data?.pipeline || !data?.step || !data?.startedAt) {
                sessionStorage.removeItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
                return;
            }
            if (!readLeadSearchPipelineStorage().enabled) {
                try {
                    sessionStorage.removeItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
                } catch (_) {
                    /* ignore */
                }
                return;
            }
            const age = Date.now() - Number(data.startedAt);
            if (age > PIPELINE_RESTORE_MAX_MS) {
                sessionStorage.removeItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
                return;
            }
            pipelineInFlightRef.current = true;
            setRestoredPipelineRun(true);
            setPipelinePhase(data.step === 'search' ? 'search' : 'connections');
            setPipelineUiHint(
                data.step === 'search'
                    ? "Resuming: Explore Bhavya's Connections…"
                    : 'Resuming: Import My Connections…'
            );
        } catch (_) {
            try {
                sessionStorage.removeItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
            } catch (__) {
                /* ignore */
            }
        }
    }, []);

    useEffect(() => {
        if (!restoredPipelineRun) return undefined;

        let cancelled = false;
        const stepRef = { current: 'connections' };
        try {
            const raw = sessionStorage.getItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
            const data = raw ? JSON.parse(raw) : null;
            stepRef.current = data?.step === 'search' ? 'search' : 'connections';
        } catch (_) {
            stepRef.current = 'connections';
        }

        const sawConnRunning = { current: false };
        const sawSearchRunning = { current: false };
        const pollStartedAt = Date.now();

        const pollOnce = async () => {
            try {
                if (!readLeadSearchPipelineStorage().enabled) {
                    try {
                        sessionStorage.removeItem(LEAD_SEARCH_PIPELINE_RUN_KEY);
                    } catch (_) {
                        /* ignore */
                    }
                    pipelineInFlightRef.current = false;
                    setRestoredPipelineRun(false);
                    setPipelinePhase('cooldown');
                    return;
                }
                const res = await axios.get('/api/phantom/status-check');
                if (cancelled) return;
                const connRun = res.data?.statuses?.connections?.status === 'running';
                const searchRun = res.data?.statuses?.search?.status === 'running';

                if (connRun) sawConnRunning.current = true;
                if (searchRun) sawSearchRunning.current = true;

                const connDoneGuess =
                    stepRef.current === 'connections' &&
                    !connRun &&
                    (sawConnRunning.current ||
                        Date.now() - pollStartedAt > ENGINE_NO_RUNNING_GIVEUP_MS);

                if (stepRef.current === 'connections' && connDoneGuess) {
                    try {
                        sessionStorage.setItem(
                            LEAD_SEARCH_PIPELINE_RUN_KEY,
                            JSON.stringify({ pipeline: true, step: 'search', startedAt: Date.now() })
                        );
                    } catch (_) {
                        /* ignore */
                    }
                    setPipelinePhase('search');
                    setPipelineUiHint("Step 2 of 2: Explore Bhavya's Connections…");
                    await runImport('search_export', { silent: true, quietToast: true });
                    finishCooldown();
                    setRestoredPipelineRun(false);
                    addToast('Lead search pipeline resumed and finished.', 'success');
                    return;
                }

                const searchDoneGuess =
                    stepRef.current === 'search' &&
                    !searchRun &&
                    (sawSearchRunning.current ||
                        Date.now() - pollStartedAt > ENGINE_NO_RUNNING_GIVEUP_MS);

                if (searchDoneGuess) {
                    finishCooldown();
                    setRestoredPipelineRun(false);
                    addToast('Lead search pipeline finished while you were away.', 'success');
                }
            } catch (_) {
                /* keep polling */
            }
        };

        pollOnce();
        const id = window.setInterval(pollOnce, ENGINE_POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [restoredPipelineRun, addToast, finishCooldown, runImport]);

    const handleFileSelect = (type) => {
        setImportType(type);
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (importType === 'csv' && !file.name.endsWith('.csv')) {
            setUploadResult({ success: false, message: 'Please upload a CSV file' });
            return;
        }

        if (importType === 'excel' && !file.name.match(/\.(xlsx|xls)$/)) {
            setUploadResult({ success: false, message: 'Please upload an Excel file (.xlsx or .xls)' });
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
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const summary = res.data.summary || {};
            let message = 'Import completed successfully!';
            if (summary.errors > 0) {
                message = summary.saved > 0
                    ? `Import completed with ${summary.errors} row(s) skipped.`
                    : 'Import finished with errors — see reasons below.';
            }

            setUploadResult({
                success: summary.errors === 0,
                message,
                summary,
            });
        } catch (err) {
            console.error('Upload failed:', err);
            let errorMessage = `Failed to upload ${importType.toUpperCase()} file`;
            if (err.response?.data?.error) errorMessage = err.response.data.error;
            else if (err.message) errorMessage = err.message;

            setUploadResult({ success: false, message: errorMessage });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = (format) => {
        const f = format || 'csv';
        const url = `/api/leads/import-template?format=${f}`;
        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error(res.statusText);
                return res.blob();
            })
            .then((blob) => {
                const filename = f === 'xlsx' ? 'leads_import_template.xlsx' : 'leads_import_template.csv';
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                addToast(`Downloaded ${filename}`, 'success');
            })
            .catch((err) => {
                addToast(err.message || 'Failed to download template', 'error');
            });
    };

    return (
        <LeadSearchErrorBoundary>
        <TooltipProvider>
            <div className="space-y-6 page-enter">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            Lead Search
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
                            Import new leads based on your criteria
                        </p>
                    </div>
                </div>

                <Card className="glass-strong card-elevated overflow-hidden relative border-primary/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <CardHeader className="relative z-10 pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-[#0077b5]/10 rounded-xl mr-1">
                                <Linkedin className="h-5 w-5 text-[#0077b5]" />
                            </div>
                            Automated lead pipeline
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Every 6 hours (after the previous cycle fully finishes): Import My Connections runs first, then Explore Bhavya’s Connections. PhantomBuster uses your saved search and LinkedIn session. Turn automation on or off from{' '}
                            <Link to="/settings" className="text-primary font-medium underline underline-offset-2 hover:no-underline">
                                Settings
                            </Link>
                            .
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="space-y-6">
                            {!pipelineAutoSyncEnabled && (
                                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                                    <span className="font-medium">Automated sync is off.</span>{' '}
                                    Enable &quot;Automated lead synchronization&quot; at the top of{' '}
                                    <Link to="/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                                        Settings
                                    </Link>{' '}
                                    to resume scheduled imports.
                                </div>
                            )}
                            {restoredPipelineRun && (
                                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                                    A pipeline run was in progress when you left this page. Resuming after PhantomBuster status is confirmed.
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {IMPORT_SOURCE_OPTIONS.map((opt, idx) => {
                                    const stepOrder = idx + 1;
                                    const active =
                                        (opt.value === 'connections_export' && pipelinePhase === 'connections') ||
                                        (opt.value === 'search_export' && pipelinePhase === 'search');
                                    return (
                                        <motion.div
                                            key={opt.value}
                                            className={cn(
                                                'relative flex items-start gap-4 p-5 rounded-2xl border-2 text-left overflow-hidden',
                                                active
                                                    ? 'border-primary bg-primary/5 shadow-glow-sm shadow-primary/20'
                                                    : 'border-border/60 bg-card/40'
                                            )}
                                        >
                                            {active && (
                                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                                            )}
                                            <div
                                                className={cn(
                                                    'p-3 rounded-xl transition-all shrink-0',
                                                    active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground'
                                                )}
                                            >
                                                <opt.icon className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0 flex-1 relative z-10">
                                                <div className="flex items-center justify-between mb-1 gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                                        Step {stepOrder}
                                                    </Badge>
                                                    {active && <Loader2 className="h-5 w-5 text-primary shrink-0 animate-spin" />}
                                                </div>
                                                <span className="font-bold text-base text-foreground block">{opt.label}</span>
                                                <span className="inline-block text-[10px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full my-2">
                                                    {opt.envLabel}
                                                </span>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                                {firstDegreeImportLoading ? (
                                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading latest 1st-degree import…
                                    </span>
                                ) : firstDegreeImportStats ? (
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowImportBreakdown((prev) => !prev)}
                                            className="w-full flex items-center justify-between gap-3 text-left rounded-md hover:bg-primary/10 px-2 py-1.5 transition-colors"
                                        >
                                            <span className="font-medium tabular-nums">
                                                {firstDegreeImportStats.saved} / {firstDegreeImportStats.totalLeads} 1st degree connections imported
                                                {firstDegreeImportStats.timestamp
                                                    ? ` as of ${new Date(firstDegreeImportStats.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                                                    : ''}
                                            </span>
                                            {showImportBreakdown ? (
                                                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            )}
                                        </button>
                                        {showImportBreakdown && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                                    <div className="text-muted-foreground">New leads</div>
                                                    <div className="font-semibold tabular-nums">{firstDegreeImportStats.totalLeads}</div>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                                    <div className="text-muted-foreground">Saved leads</div>
                                                    <div className="font-semibold tabular-nums">{firstDegreeImportStats.saved}</div>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                                    <div className="text-muted-foreground">Duplicate leads</div>
                                                    <div className="font-semibold tabular-nums">{firstDegreeImportStats.duplicates}</div>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                                    <div className="text-muted-foreground">Imported last time</div>
                                                    <div className="font-semibold">
                                                        {firstDegreeImportStats.timestamp
                                                            ? new Date(firstDegreeImportStats.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                                                            : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">No 1st degree import recorded yet — stats will appear after the first connections step completes.</span>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-6 border-t border-border/50 gap-4">
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-1 min-w-0">
                                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>
                                        Leads use sources <strong className="text-foreground">connections_export</strong> then{' '}
                                        <strong className="text-foreground">search_export</strong>. Next 6-hour window starts only after both steps finish.
                                    </span>
                                </p>
                                <div className="flex flex-col items-stretch sm:items-end gap-1 shrink-0 w-full sm:w-auto min-w-[200px]">
                                    {(pipelinePhase !== 'cooldown' || restoredPipelineRun) && (
                                        <div className="flex items-center gap-2 justify-center sm:justify-end text-sm font-medium text-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-center sm:text-right">{pipelineUiHint || 'Running pipeline…'}</span>
                                        </div>
                                    )}
                                    {pipelinePhase === 'cooldown' && !restoredPipelineRun && pipelineAutoSyncEnabled && (
                                        <div className="rounded-lg border border-primary/30 bg-background/80 px-4 py-3 text-center sm:text-right">
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Next full cycle in</div>
                                            <div className="text-xl font-bold tabular-nums text-primary tracking-tight">
                                                {countdownText || formatRemaining(Math.max(0, nextPipelineRunAt - Date.now()))}
                                            </div>
                                        </div>
                                    )}
                                    {pipelinePhase === 'cooldown' && !restoredPipelineRun && !pipelineAutoSyncEnabled && (
                                        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center sm:text-right text-sm text-muted-foreground">
                                            Scheduled sync paused
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Import Contacts Section */}
                <Card className="glass-strong card-elevated overflow-hidden relative border-primary/20">
                    <CardHeader className="pb-3 border-b border-border/10">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-primary/10 rounded-xl mr-1">
                                <Upload className="h-5 w-5 text-primary" />
                            </div>
                            <span className="flex items-center">
                                Import Contacts
                                <InfoTooltip content="Import external leads (CSV/Excel) to track and analyze them in your dashboard." />
                            </span>
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Upload your existing contacts from CSV or Excel files directly into Kinnote.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground w-full sm:w-auto">
                                Support for standard CSV and Excel formats.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="default"
                                            className="gap-2 border-primary/20 hover:bg-primary/5 font-medium"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download template
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[200px]">
                                        <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')} className="gap-2 cursor-pointer">
                                            <FileText className="h-4 w-4" />
                                            <span>CSV template</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadTemplate('xlsx')} className="gap-2 cursor-pointer">
                                            <FileText className="h-4 w-4 text-green-600" />
                                            <span>Excel template</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={importType === "csv" ? ".csv" : ".xlsx,.xls"}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="default"
                                            disabled={uploading}
                                            className="gap-2 border-primary/20 hover:bg-primary/5 font-bold tracking-wide w-full sm:w-auto"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {uploading ? "IMPORTING..." : "IMPORT CONTACTS"}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[180px]">
                                        <DropdownMenuItem onClick={() => handleFileSelect("csv")} className="gap-2 cursor-pointer">
                                            <FileText className="h-4 w-4" />
                                            <span>From CSV File</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleFileSelect("excel")} className="gap-2 cursor-pointer">
                                            <FileText className="h-4 w-4 text-green-600" />
                                            <span>From Excel File</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Upload Result Alert - dynamic summary after CSV/Excel import */}
                        {uploadResult && (
                            <div
                                className={cn(
                                    "w-full animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl border-2 p-5 shadow-sm mt-4",
                                    uploadResult.success ? "bg-green-50/50 dark:bg-green-950/20 border-green-300 dark:border-green-700" : "bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-700"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {uploadResult.success ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn("font-semibold text-base", uploadResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200")}>
                                                {uploadResult.message}
                                            </p>
                                            <button onClick={() => setUploadResult(null)} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5" aria-label="Dismiss">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        {uploadResult.summary && (
                                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="rounded-lg bg-green-100/80 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3">
                                                    <div className="text-2xl font-bold text-green-800 dark:text-green-200 tabular-nums">{uploadResult.summary.saved}</div>
                                                    <div className="text-xs font-medium text-green-700 dark:text-green-300 mt-0.5">Imported</div>
                                                </div>
                                                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                                                    <div className="text-2xl font-bold text-amber-800 dark:text-amber-200 tabular-nums">{uploadResult.summary.duplicates}</div>
                                                    <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mt-0.5">Duplicates avoided</div>
                                                </div>
                                                <div className="rounded-lg bg-muted/60 border border-border p-3">
                                                    <div className="text-2xl font-bold tabular-nums">{uploadResult.summary.totalLeads}</div>
                                                    <div className="text-xs font-medium text-muted-foreground mt-0.5">In file</div>
                                                </div>
                                                {uploadResult.summary.errors > 0 && (
                                                    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                                                        <div className="text-2xl font-bold text-red-800 dark:text-red-200 tabular-nums">{uploadResult.summary.errors}</div>
                                                        <div className="text-xs font-medium text-red-700 dark:text-red-300 mt-0.5">Errors</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {uploadResult.summary?.errors > 0 && Array.isArray(uploadResult.summary.errorDetails) && uploadResult.summary.errorDetails.length > 0 && (
                                            <div className="mt-4 rounded-lg bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
                                                <p className="text-xs font-semibold text-red-800 dark:text-red-200 uppercase tracking-wider mb-2">Why some rows failed</p>
                                                <ul className="space-y-1.5 text-sm text-red-700 dark:text-red-300">
                                                    {uploadResult.summary.errorDetails.slice(0, 5).map((detail, idx) => (
                                                        <li key={idx} className="flex flex-col gap-0.5">
                                                            <span className="font-medium">{detail.reason}</span>
                                                            {detail.row && (detail.row.linkedin_url || detail.row.full_name || detail.row.first_name) && (
                                                                <span className="text-xs opacity-90 truncate">
                                                                    Row: {detail.row.full_name || detail.row.first_name || detail.row.linkedin_url || '—'}
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                                {uploadResult.summary.errorDetails.length > 5 && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">+ {uploadResult.summary.errorDetails.length - 5} more</p>
                                                )}
                                            </div>
                                        )}
                                        {uploadResult.success && uploadResult.summary?.saved > 0 && (
                                            <div className="mt-4 pt-4 border-t border-green-200/60 dark:border-green-800/60">
                                                <Link to="/imported-leads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline underline-offset-2">
                                                    View imported leads →
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {results && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="glass border-emerald-500/30 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-emerald-500">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Import Completed Successfully
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    Data Source:{' '}
                                    <Badge variant="outline" className="font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                        connections_export → search_export
                                    </Badge>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: 'Leads Found', val: results.totalLeads, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                        { label: 'New Saved', val: results.savedToDatabase, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                        { label: 'Duplicates', val: results.duplicates || 0, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
                                    ].map((s, i) => (
                                        <div key={i} className={`text-center p-5 rounded-2xl border ${s.border} ${s.bg} backdrop-blur-sm`}>
                                            <div className={`text-3xl font-black ${s.color} stat-value`}>{s.val}</div>
                                            <div className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <Button onClick={() => window.location.href = '/leads'} className="flex-1" variant="outline">View Leads</Button>
                                    <Button onClick={() => setResults(null)} variant="ghost" className="hover:bg-muted">Dismiss</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {error && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="glass border-destructive/40 relative overflow-hidden">
                            <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <AlertCircle className="h-5 w-5" />
                                    Search Failed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-destructive/10 p-5 rounded-xl border border-destructive/20 backdrop-blur-md">
                                    <p className="text-sm font-semibold text-destructive-foreground mb-3 flex items-start gap-2">
                                        <span className="leading-snug">{error.message || 'An unknown error occurred while searching leads.'}</span>
                                    </p>
                                    {error.tips && Array.isArray(error.tips) && (
                                        <div className="mt-4 pt-4 border-t border-destructive/20">
                                            <p className="text-xs font-semibold text-destructive/80 uppercase tracking-wider mb-2">What you can do</p>
                                            <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                                                {error.tips.map((tip, idx) => <li key={idx} className="leading-relaxed">{tip}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {error.helpUrl && (
                                        <div className="mt-4 pt-4 border-t border-destructive/20">
                                            <a
                                                href={error.helpUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                                            >
                                                Reconnect your account
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </TooltipProvider>
        </LeadSearchErrorBoundary>
    );
}
