import { useState, useEffect } from 'react';
import { Share2, RefreshCw, Download } from 'lucide-react';
import { useToast } from '../components/ui/toast';

export default function NetworkPage() {
    const { addToast } = useToast();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchNetwork();
    }, []);

    const fetchNetwork = async () => {
        try {
            const res = await fetch('/api/sow/connections');
            const data = await res.json();
            setLeads(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch network", err);
            setLeads([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await fetch('/api/sow/connections/sync', { method: 'POST' });
            await fetchNetwork();
            addToast('Sync completed! (Simulated)', 'success');
        } catch (err) {
            console.error("Sync failed", err);
            addToast(err?.message || 'Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">Network</h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        Sync Connections
                    </button>
                </div>
            </div>

            <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-dark-900/50 border-b border-dark-700">
                                <th className="p-4 font-semibold text-slate-400">Name</th>
                                <th className="p-4 font-semibold text-slate-400">Company</th>
                                <th className="p-4 font-semibold text-slate-400">Title</th>
                                <th className="p-4 font-semibold text-slate-400">Location</th>
                                <th className="p-4 font-semibold text-slate-400">Connected On</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading network...</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No connections synced yet.</td></tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-dark-700/50 transition-colors">
                                        <td className="p-4 font-medium text-white">{lead.full_name}</td>
                                        <td className="p-4 text-slate-300">{lead.company}</td>
                                        <td className="p-4 text-slate-400">{lead.title}</td>
                                        <td className="p-4 text-slate-400">{lead.location}</td>
                                        <td className="p-4 text-slate-500">{new Date(lead.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
