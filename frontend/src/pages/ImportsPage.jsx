import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileText, Download, RefreshCw, Database, Upload, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";

export default function ImportsPage() {
    const [imports, setImports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [deleteResult, setDeleteResult] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchImports();
    }, []);

    const fetchImports = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/leads/imports');
            setImports(res.data || []);
        } catch (error) {
            console.error('Failed to fetch imports', error);
            // Mock data for demonstration if endpoint doesn't exist yet
            setImports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            setUploadResult({
                success: false,
                message: 'Please upload a CSV file'
            });
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', file);

        try {
            setUploading(true);
            setUploadResult(null);

            const res = await axios.post('/api/leads/import-csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setUploadResult({
                success: true,
                message: 'Import completed successfully!',
                summary: res.data.summary
            });

            // Refresh the imports list
            fetchImports();
        } catch (error) {
            console.error('Upload failed:', error);

            let errorMessage = 'Failed to upload CSV file';

            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                errorMessage = '❌ Backend server is not running! Please start it with: cd backend && npm run dev';
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setUploadResult({
                success: false,
                message: errorMessage
            });
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteCSVLeads = async () => {
        // Confirm before deletion
        if (!window.confirm('Are you sure you want to delete ALL leads imported from Data Import? This action cannot be undone.')) {
            return;
        }

        try {
            setDeleting(true);
            setDeleteResult(null);

            const res = await axios.delete('/api/leads/csv-imports/all');

            setDeleteResult({
                success: true,
                message: res.data.message,
                deleted: res.data.deleted
            });

            // Refresh the imports list
            fetchImports();
        } catch (error) {
            console.error('Delete failed:', error);

            let errorMessage = 'Failed to delete imported leads';

            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                errorMessage = '❌ Backend server is not running! Please start it with: cd backend && npm run dev';
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setDeleteResult({
                success: false,
                message: errorMessage
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Imports & Activity Log</h1>
                    <p className="text-muted-foreground mt-1">
                        Track data imports and system operations
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Button
                        onClick={handleFileSelect}
                        disabled={uploading}
                        variant="outline"
                        className="gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Data Import'}
                    </Button>
                    <Button
                        onClick={handleDeleteCSVLeads}
                        disabled={deleting}
                        variant="destructive"
                        className="gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? 'Deleting...' : 'Remove Imported Leads'}
                    </Button>
                    <Button onClick={fetchImports} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Upload Result Alert */}
            {uploadResult && (
                <Card className={uploadResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            {uploadResult.success ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={uploadResult.success ? 'text-green-800 dark:text-green-200 font-medium' : 'text-red-800 dark:text-red-200 font-medium'}>
                                    {uploadResult.message}
                                </p>
                                {uploadResult.summary && (
                                    <div className="mt-2 text-sm text-green-700 dark:text-green-300 space-y-1">
                                        <p>Total leads: {uploadResult.summary.totalLeads}</p>
                                        <p>✓ Saved: {uploadResult.summary.saved}</p>
                                        <p>⊘ Duplicates: {uploadResult.summary.duplicates}</p>
                                        {uploadResult.summary.errors > 0 && (
                                            <p>⚠ Errors: {uploadResult.summary.errors}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUploadResult(null)}
                                className="h-6 w-6 p-0"
                            >
                                ×
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Result Alert */}
            {deleteResult && (
                <Card className={deleteResult.success ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-red-500 bg-red-50 dark:bg-red-950'}>
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            {deleteResult.success ? (
                                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={deleteResult.success ? 'text-blue-800 dark:text-blue-200 font-medium' : 'text-red-800 dark:text-red-200 font-medium'}>
                                    {deleteResult.message}
                                </p>
                                {deleteResult.deleted !== undefined && deleteResult.deleted > 0 && (
                                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                        <p>🗑️ Deleted: {deleteResult.deleted} leads</p>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteResult(null)}
                                className="h-6 w-6 p-0"
                            >
                                ×
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Data Imports</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{imports.length}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads Imported</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {imports.reduce((sum, imp) => sum + (imp.total_leads || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all imports</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Duplicates Detected</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {imports.reduce((sum, imp) => sum + (imp.duplicates || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Filtered out</p>
                    </CardContent>
                </Card>
            </div>

            {/* Imports Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Import History</CardTitle>
                    <CardDescription>Complete log of all data imports</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Import ID</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Sync Session ID</TableHead>
                                    <TableHead className="text-right">Total Leads</TableHead>
                                    <TableHead className="text-right">Saved</TableHead>
                                    <TableHead className="text-right">Duplicates</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead className="text-right">Source File</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            Loading imports...
                                        </TableCell>
                                    </TableRow>
                                ) : imports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center py-8">
                                                <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                                <p className="text-sm text-muted-foreground">No imports yet</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Import data from External Sources to see activity here
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    imports.map((imp) => (
                                        <TableRow key={imp.id}>
                                            <TableCell className="font-mono text-xs">
                                                {imp.id || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {imp.source?.replace(/_/g, ' ') || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {imp.container_id?.substring(0, 12) || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {imp.total_leads || 0}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600 dark:text-green-400">
                                                {imp.saved || 0}
                                            </TableCell>
                                            <TableCell className="text-right text-orange-600 dark:text-orange-400">
                                                {imp.duplicates || 0}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {imp.timestamp ? new Date(imp.timestamp).toLocaleString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {imp.csv_file && (
                                                    <Button variant="ghost" size="sm" className="gap-2">
                                                        <Download className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
