import { useState, useEffect } from 'react';
import { Users, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

export default function LeadImportPage() {
    const [isImportingConnections, setIsImportingConnections] = useState(false);
    const [isImportingSearch, setIsImportingSearch] = useState(false);
    const [connectionsStatus, setConnectionsStatus] = useState('idle');
    const [searchStatus, setSearchStatus] = useState('idle');
    const [connectionsResult, setConnectionsResult] = useState(null);
    const [searchResult, setSearchResult] = useState(null);
    const [error, setError] = useState(null);

    // Check phantom status on mount
    useEffect(() => {
        checkPhantomStatus();
    }, []);

    const checkPhantomStatus = async () => {
        try {
            const response = await axios.get('/api/phantom/status-check');
            if (response.data.success) {
                if (response.data.statuses.connections.status === 'running') {
                    setConnectionsStatus('running');
                }
                if (response.data.statuses.search.status === 'running') {
                    setSearchStatus('running');
                }
            }
        } catch (err) {
            console.error('Failed to check phantom status:', err);
        }
    };

    const handleImportConnections = async () => {
        setIsImportingConnections(true);
        setConnectionsStatus('running');
        setError(null);
        setConnectionsResult(null);

        try {
            const response = await axios.post('/api/phantom/export-connections-complete');
            
            if (response.data.success) {
                setConnectionsResult(response.data);
                setConnectionsStatus('completed');
            } else {
                throw new Error(response.data.message || 'Import failed');
            }
        } catch (err) {
            console.error('Error importing connections:', err);
            setError(err.response?.data?.message || err.message || 'Failed to import connections');
            setConnectionsStatus('error');
        } finally {
            setIsImportingConnections(false);
        }
    };

    const handleImportSearchLeads = async () => {
        setIsImportingSearch(true);
        setSearchStatus('running');
        setError(null);
        setSearchResult(null);

        try {
            // This will use the phantom's saved search configuration
            const response = await axios.post('/api/phantom/search-leads-complete', {});
            
            if (response.data.success) {
                setSearchResult(response.data);
                setSearchStatus('completed');
            } else {
                throw new Error(response.data.message || 'Import failed');
            }
        } catch (err) {
            console.error('Error importing search leads:', err);
            setError(err.response?.data?.message || err.message || 'Failed to import search leads');
            setSearchStatus('error');
        } finally {
            setIsImportingSearch(false);
        }
    };

    const StatusBadge = ({ status }) => {
        if (status === 'running') {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running
                </div>
            );
        }
        if (status === 'completed') {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                </div>
            );
        }
        if (status === 'error') {
            return (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Error
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Lead Search & Import</h1>
                <p className="text-muted-foreground">
                    Manually import leads from your LinkedIn connections or search results using PhantomBuster
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-900 mb-1">Import Error</h3>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Import Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* First Connections Card */}
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-foreground mb-1">
                                First Connections
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Import all your 1st degree LinkedIn connections
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <h3 className="font-medium text-sm text-foreground">What this does:</h3>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Exports all your LinkedIn connections</li>
                                <li>Saves profiles to your database</li>
                                <li>Creates a CSV file for backup</li>
                                <li>Takes approximately 2-5 minutes</li>
                            </ul>
                        </div>

                        {connectionsStatus !== 'idle' && (
                            <div className="pt-2">
                                <StatusBadge status={connectionsStatus} />
                            </div>
                        )}

                        {connectionsResult && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-900 mb-2">Import Successful!</h3>
                                <div className="text-sm text-green-800 space-y-1">
                                    <p>Total leads: {connectionsResult.totalLeads}</p>
                                    <p>New leads saved: {connectionsResult.savedToDatabase}</p>
                                    <p>Duplicates skipped: {connectionsResult.duplicates}</p>
                                    {connectionsResult.csvFile && (
                                        <p className="font-mono text-xs mt-2">CSV: {connectionsResult.csvFile}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleImportConnections}
                            disabled={isImportingConnections || connectionsStatus === 'running'}
                            className="w-full"
                            size="lg"
                        >
                            {isImportingConnections || connectionsStatus === 'running' ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Import First Connections
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Second Connections / Search Card */}
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-foreground mb-1">
                                Search Leads
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Import leads from your LinkedIn search results
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <h3 className="font-medium text-sm text-foreground">What this does:</h3>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Runs your saved LinkedIn search</li>
                                <li>Imports 2nd+ degree connections</li>
                                <li>Saves profiles to your database</li>
                                <li>Takes approximately 2-5 minutes</li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> Configure your search URL and limit in PhantomBuster dashboard before running.
                            </p>
                        </div>

                        {searchStatus !== 'idle' && (
                            <div className="pt-2">
                                <StatusBadge status={searchStatus} />
                            </div>
                        )}

                        {searchResult && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-900 mb-2">Import Successful!</h3>
                                <div className="text-sm text-green-800 space-y-1">
                                    <p>Total leads: {searchResult.totalLeads}</p>
                                    <p>New leads saved: {searchResult.savedToDatabase}</p>
                                    <p>Duplicates skipped: {searchResult.duplicates}</p>
                                    {searchResult.pushedToCrm > 0 && (
                                        <p>Pushed to CRM: {searchResult.pushedToCrm}</p>
                                    )}
                                    {searchResult.csvFile && (
                                        <p className="font-mono text-xs mt-2">CSV: {searchResult.csvFile}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleImportSearchLeads}
                            disabled={isImportingSearch || searchStatus === 'running'}
                            className="w-full"
                            size="lg"
                            variant="outline"
                        >
                            {isImportingSearch || searchStatus === 'running' ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4 mr-2" />
                                    Import Search Leads
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-muted/30 border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    Important Notes
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>Make sure your PhantomBuster account is properly configured with your LinkedIn session</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>Phantom IDs must be set in your backend .env file (CONNECTIONS_EXPORT_PHANTOM_ID and SEARCH_EXPORT_PHANTOM_ID)</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>For Search Leads, configure your search URL in PhantomBuster dashboard before running</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>Do not run multiple imports simultaneously to avoid hitting rate limits</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>Imported leads will appear in the Contacts section automatically</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
