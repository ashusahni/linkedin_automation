import { useState } from 'react';
import axios from 'axios';
import { Search, Linkedin, Loader2, CheckCircle2, AlertCircle, Share2, Database, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';

/** PhantomBuster import source: CONNECTIONS_EXPORT_PHANTOM vs SEARCH_EXPORT_PHANTOM */
const IMPORT_SOURCE_OPTIONS = [
    { value: 'connections_export', label: 'Import My Connections', envLabel: 'CONNECTIONS_EXPORT_PHANTOM', description: 'Your 1st-degree LinkedIn connections', icon: Share2 },
    { value: 'search_export', label: 'Explore Beyond My Network', envLabel: 'SEARCH_EXPORT_PHANTOM', description: 'Find 2nd & 3rd-degree LinkedIn leads', icon: Search },
];

export default function LeadSearchPage() {
    const { addToast } = useToast();
    const [importSource, setImportSource] = useState('connections_export');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            let response;

            if (importSource === 'connections_export') {
                response = await axios.post('/api/phantom/export-connections-complete', {}, { timeout: 180000 });
            } else {
                response = await axios.post('/api/phantom/search-leads-complete', {}, { timeout: 180000 });
            }

            setResults(response.data);

            if (response.data.totalLeads > 0) {
                addToast(`✅ Found ${response.data.totalLeads} leads and saved ${response.data.savedToDatabase} to database!`, 'success');
            } else {
                addToast('⚠️ No leads returned from PhantomBuster.', 'warning');
            }
        } catch (err) {
            const backend = err.response?.data;
            const errorMsg = (backend && (backend.message || backend.error)) || err.message || 'Failed to search leads';
            const errorCode = backend?.code;
            setError({
                message: errorMsg,
                code: errorCode || null,
                tips: backend?.tips || null,
                raw: backend || null,
                isGeneric: errorMsg === 'Request failed with status code 500' || errorMsg === err.message,
            });
            addToast(errorCode ? `[${errorCode}] ${errorMsg}` : errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Lead Search</h1>
                    <p className="text-muted-foreground mt-1">
                        Run PhantomBuster agents to import leads directly into the system.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Linkedin className="h-5 w-5 text-[#0077b5]" />
                        Select Import Source
                    </CardTitle>
                    <CardDescription>
                        Choose which PhantomBuster phantom to run. Configuration (Search URL, limits, etc.) is managed in your PhantomBuster dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {IMPORT_SOURCE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setImportSource(opt.value)}
                                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${importSource === opt.value
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                        : 'border-muted hover:border-primary/50 hover:bg-muted/30'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${importSource === opt.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        <opt.icon className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="font-semibold block text-lg">{opt.label}</span>
                                        <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{opt.envLabel}</span>
                                        <p className="text-sm text-muted-foreground mt-2 leading-snug">{opt.description}</p>
                                    </div>
                                    {importSource === opt.value && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 h-12" disabled={loading} onClick={handleSearch}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Running Phantom...
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-5 w-5 fill-current" />
                                        Run {importSource === 'search_export' ? 'Explore Beyond My Network' : 'Import My Connections'}
                                    </>
                                )}
                            </Button>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            Leads are saved with source <strong>{importSource}</strong>.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {results && (
                <Card className="border-green-500/20 bg-green-500/5 animate-in zoom-in-95 duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            Import Completed Successfully
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            Source: <Badge variant="outline" className="font-mono bg-green-500/10 text-green-700 border-green-500/30">{importSource}</Badge>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-4 bg-background/50 rounded-xl border border-green-200 dark:border-green-900">
                                <div className="text-3xl font-bold text-green-600">{results.totalLeads}</div>
                                <div className="text-sm font-medium text-muted-foreground mt-1">Leads Found</div>
                            </div>
                            <div className="text-center p-4 bg-background/50 rounded-xl border border-blue-200 dark:border-blue-900">
                                <div className="text-3xl font-bold text-blue-600">{results.savedToDatabase}</div>
                                <div className="text-sm font-medium text-muted-foreground mt-1">New Leads Saved</div>
                            </div>
                            <div className="text-center p-4 bg-background/50 rounded-xl border border-orange-200 dark:border-orange-900">
                                <div className="text-3xl font-bold text-orange-600">{results.duplicates || 0}</div>
                                <div className="text-sm font-medium text-muted-foreground mt-1">Duplicates</div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={() => window.location.href = '/leads'} className="flex-1" variant="outline">View Leads</Button>
                            <Button onClick={() => setResults(null)}>Dismiss</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && (
                <Card className="border-red-500/20 bg-red-500/5 animate-in shake">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Search Failed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-background/50 p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                {error.code && <span className="font-mono text-xs bg-red-500/10 px-2 py-1 rounded mr-2 border border-red-200">{error.code}</span>}
                                {error.message || 'An unknown error occurred while searching leads.'}
                            </p>

                            {error.tips && Array.isArray(error.tips) && (
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-4 ml-1">
                                    {error.tips.map((tip, idx) => <li key={idx}>{tip}</li>)}
                                </ul>
                            )}

                            {!error.tips && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Please check your backend logs for more details.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
