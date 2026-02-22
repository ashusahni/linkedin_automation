import { useState, useRef } from 'react';
import axios from 'axios';
import { Search, Linkedin, Loader2, CheckCircle2, AlertCircle, Share2, Play, Sparkles, Upload, FileText, X, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import PageGuide from '../components/PageGuide';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

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
    { value: 'search_export', label: 'Explore Beyond My Network', envLabel: 'SEARCH_EXPORT_SOURCE', description: 'Find 2nd & 3rd-degree LinkedIn leads', icon: Search },
];

export default function LeadSearchPage() {
    const { addToast } = useToast();
    const [importSource, setImportSource] = useState('search_export');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    // CSV Import State
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [importType, setImportType] = useState('csv');
    const fileInputRef = useRef(null);

    const handleSearch = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const endpoint = importSource === 'connections_export'
                ? '/api/phantom/export-connections-complete'
                : '/api/phantom/search-leads-complete';

            const response = await axios.post(endpoint, {}, { timeout: 180000 });
            setResults(response.data);

            if (response.data.totalLeads > 0) {
                addToast(`✅ Found ${response.data.totalLeads} leads and saved ${response.data.savedToDatabase} to database!`, 'success');
            } else {
                addToast('⚠️ No new Leads found', 'warning');
            }
        } catch (err) {
            const backend = err.response?.data;
            const errorMsg = (backend && (backend.message || backend.error)) || err.message || 'Failed to search leads';
            const errorCode = backend?.code;
            setError({
                message: errorMsg,
                code: errorCode || null,
                tips: backend?.tips || null,
            });
            addToast(errorCode ? `[${errorCode}] ${errorMsg}` : errorMsg, 'error');
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

            setUploadResult({
                success: true,
                message: 'Import completed successfully!',
                summary: res.data.summary,
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

    return (
        <TooltipProvider>
            <div className="space-y-6 page-enter">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            Lead Search
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
                            Run advanced data strategies to import leads directly into the system. Power your campaigns with AI-driven signals.
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
                            Select Data Source
                        </CardTitle>
                        <CardDescription className="text-sm">
                            Choose which data strategy to run. Configuration is managed in your external provider settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {IMPORT_SOURCE_OPTIONS.map((opt) => (
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setImportSource(opt.value)}
                                        className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all overflow-hidden ${importSource === opt.value
                                            ? 'border-primary bg-primary/5 shadow-glow-sm shadow-primary/20'
                                            : 'border-border/60 hover:border-primary/40 hover:bg-muted/30 bg-card/40'
                                            }`}
                                    >
                                        {importSource === opt.value && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                                        )}
                                        <div className={`p-3 rounded-xl transition-all ${importSource === opt.value ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground'}`}>
                                            <opt.icon className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1 relative z-10">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-base text-foreground block">{opt.label}</span>
                                                {importSource === opt.value && <CheckCircle2 className="h-5 w-5 text-primary shrink-0 animate-scale-in" />}
                                            </div>
                                            <span className="inline-block text-[10px] font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mb-2">
                                                {opt.envLabel}
                                            </span>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border/50 gap-4">
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    Leads are saved with source <strong>{importSource}</strong>.
                                </p>
                                <Button size="lg" className="w-full sm:w-auto gap-2 font-semibold shadow-lg shadow-primary/20 btn-shimmer group" disabled={loading} onClick={handleSearch}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Syncing Data...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 fill-current group-hover:scale-110 transition-transform" />
                                            Run Engine
                                        </>
                                    )}
                                </Button>
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
                            Upload your existing contacts from CSV or Excel files directly into LeadForge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground w-full sm:w-auto">
                                Support for standard CSV and Excel formats.
                            </p>
                            <div className="flex items-center w-full sm:w-auto justify-end">
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

                        {/* Upload Result Alert */}
                        {uploadResult && (
                            <div
                                className={cn(
                                    "w-full animate-in slide-in-from-top-2 fade-in duration-300 rounded-lg border p-4 shadow-sm mt-4",
                                    uploadResult.success ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"
                                )}
                            >
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
                                            <div className="mt-2 text-xs text-green-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <p><strong>Leads:</strong> {uploadResult.summary.totalLeads}</p>
                                                <p><strong>Saved:</strong> {uploadResult.summary.saved}</p>
                                                <p><strong>Duplicates:</strong> {uploadResult.summary.duplicates}</p>
                                                {uploadResult.summary.errors > 0 && (
                                                    <p><strong>Errors:</strong> {uploadResult.summary.errors}</p>
                                                )}
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
                                    Data Source: <Badge variant="outline" className="font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">{importSource}</Badge>
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
                                        {error.code && <span className="font-mono text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full mt-0.5">{error.code}</span>}
                                        <span className="leading-snug">{error.message || 'An unknown error occurred while searching leads.'}</span>
                                    </p>
                                    {error.tips && Array.isArray(error.tips) && (
                                        <div className="mt-4 pt-4 border-t border-destructive/20">
                                            <p className="text-xs font-semibold text-destructive/80 uppercase tracking-wider mb-2">Troubleshooting Tips</p>
                                            <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                                                {error.tips.map((tip, idx) => <li key={idx} className="leading-relaxed">{tip}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                <PageGuide pageKey="search" />
            </div>
        </TooltipProvider>
    );
}
