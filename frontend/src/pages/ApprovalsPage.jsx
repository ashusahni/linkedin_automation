import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Edit2, Save, CheckCheck, Send, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import axios from 'axios';

const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'warm', label: 'Warm' },
];

const LENGTH_OPTIONS = [
    { value: 'short', label: 'Short (2–3 sentences)' },
    { value: 'medium', label: 'Medium (3–5 sentences)' },
    { value: 'long', label: 'Long (4–6 sentences)' },
];

const FOCUS_OPTIONS = [
    { value: 'general', label: 'General (balanced)' },
    { value: 'recent_post', label: 'Recent post / activity' },
    { value: 'company', label: 'Company & role' },
    { value: 'role', label: 'Job title & expertise' },
    { value: 'mutual_connection', label: 'Mutual connection' },
];

export default function ApprovalsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [bulkPersonalizing, setBulkPersonalizing] = useState(false);
    const [showBulkPersonalizeModal, setShowBulkPersonalizeModal] = useState(false);
    const [bulkPersonalizeOptions, setBulkPersonalizeOptions] = useState({
        tone: 'professional',
        length: 'medium',
        focus: 'general'
    });
    const [optionsByItem, setOptionsByItem] = useState({});
    const { addToast } = useToast();

    const getOptionsForItem = (itemId) => ({
        tone: 'professional',
        length: 'medium',
        focus: 'general',
        ...optionsByItem[itemId],
    });

    const setOptionsForItem = (itemId, next) => {
        setOptionsByItem((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...next } }));
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await axios.get('/api/sow/approvals');
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
            setItems([]);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to load approvals';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            await axios.post(`/api/sow/approvals/${id}/review`, { action });
            addToast(`Message ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
            fetchQueue();
        } catch (err) {
            console.error('Action failed:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Action failed';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleEdit = async (id, newContent) => {
        try {
            await axios.put(`/api/sow/approvals/${id}/edit`, { content: newContent });
            addToast('Message updated', 'success');
            setEditingItem(null);
            fetchQueue();
        } catch (err) {
            console.error('Failed to update approval:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to update message';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const handleBulkApprove = async () => {
        if (selectedItems.length === 0) return;
        try {
            await axios.post('/api/sow/approvals/bulk-approve', { ids: selectedItems });
            addToast(`Approved ${selectedItems.length} messages`, 'success');
            setSelectedItems([]);
            fetchQueue();
        } catch (err) {
            console.error('Bulk approve failed:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Bulk approve failed';
            addToast(`Error: ${errorMsg}`, 'error');
        }
    };

    const toggleSelect = (id) => {
        setSelectedItems(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleRegenerate = async (id) => {
        const opts = getOptionsForItem(id);
        try {
            setRegeneratingId(id);
            const res = await axios.post(`/api/sow/approvals/${id}/regenerate`, {
                tone: opts.tone,
                length: opts.length,
                focus: opts.focus,
            });
            setItems((prev) =>
                prev.map((item) =>
                    item.id === id ? { ...item, generated_content: res.data.content } : item
                )
            );
            if (res.data.aiUnavailable) {
                addToast('AI unavailable (API/key or quota). Message is a template — edit and send.', 'warning');
            } else {
                addToast('Message regenerated. Edit if needed, then Approve & Send.', 'success');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Regenerate failed';
            addToast(`Error: ${msg}`, 'error');
        } finally {
            setRegeneratingId(null);
        }
    };

    const handleBulkPersonalize = async () => {
        if (selectedItems.length === 0) return;

        try {
            setBulkPersonalizing(true);
            console.log(`🎨 Bulk personalizing ${selectedItems.length} messages...`);

            const res = await axios.post('/api/sow/approvals/bulk-personalize', {
                ids: selectedItems,
                tone: bulkPersonalizeOptions.tone,
                length: bulkPersonalizeOptions.length,
                focus: bulkPersonalizeOptions.focus
            });

            // Update items with new content
            const regeneratedMap = new Map(res.data.items.map(item => [item.id, item.content]));
            setItems(prev => 
                prev.map(item => 
                    regeneratedMap.has(item.id) 
                        ? { ...item, generated_content: regeneratedMap.get(item.id) }
                        : item
                )
            );

            const successCount = res.data.regenerated || 0;
            const failCount = res.data.failed || 0;

            if (res.data.aiUnavailable) {
                addToast(`⚠️ AI unavailable. ${successCount} messages generated with templates.`, 'warning');
            } else {
                addToast(`✅ Bulk personalization complete! ${successCount} messages regenerated.`, 'success');
            }

            if (failCount > 0) {
                addToast(`⚠️ ${failCount} messages failed to regenerate`, 'warning');
            }

            setShowBulkPersonalizeModal(false);

        } catch (err) {
            console.error('Bulk personalize failed:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Bulk personalize failed';
            addToast(`Error: ${errorMsg}`, 'error');
        } finally {
            setBulkPersonalizing(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === items.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map(item => item.id));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
                    <p className="text-muted-foreground mt-1">
                        Choose tone, length & focus → Regenerate → edit for a human touch → Approve & Send
                    </p>
                </div>
                <div className="flex gap-2">
                    {items.length > 0 && (
                        <Button 
                            onClick={toggleSelectAll}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <CheckCheck className="w-4 h-4" />
                            {selectedItems.length === items.length ? 'Deselect All' : `Select All (${items.length})`}
                        </Button>
                    )}
                    {selectedItems.length > 0 && (
                        <>
                            <Button 
                                onClick={() => setShowBulkPersonalizeModal(true)}
                                variant="outline"
                                className="gap-2 border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Bulk Personalize ({selectedItems.length})
                            </Button>
                            <Button 
                                onClick={handleBulkApprove}
                                className="gap-2 bg-green-600 hover:bg-green-500"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Approve & Send ({selectedItems.length})
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {items.length === 0 && !loading && (
                    <div className="text-center p-12 text-muted-foreground border border-dashed rounded-lg">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                        <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                        <p>No pending approvals at the moment.</p>
                    </div>
                )}

                {items.map(item => (
                    <Card key={item.id} className={cn(
                        "bg-card/40 border transition-all",
                        selectedItems.includes(item.id) ? "border-primary/50 bg-primary/5" : "border-white/5"
                    )}>
                        <CardContent className="p-6">
                            <div className="flex gap-4">
                                <div className="pt-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item.id)}
                                        onChange={() => toggleSelect(item.id)}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-primary cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold">{item.first_name} {item.last_name}</h3>
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] font-bold uppercase",
                                                item.step_type === 'connection_request' ? "border-blue-500/50 text-blue-500" : "border-green-500/50 text-green-500"
                                            )}>
                                                {item.step_type === 'connection_request' ? 'Connection' : 'Message'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{item.title} at {item.company}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Campaign: {item.campaign_name}</p>
                                    </div>

                                    {/* Personalization: tone, length, focus — then Regenerate */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="font-medium text-muted-foreground">Personalize:</span>
                                        <select
                                            className="border border-input bg-background rounded px-2 py-1.5 text-xs"
                                            value={getOptionsForItem(item.id).tone}
                                            onChange={(e) => setOptionsForItem(item.id, { tone: e.target.value })}
                                        >
                                            {TONE_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="border border-input bg-background rounded px-2 py-1.5 text-xs"
                                            value={getOptionsForItem(item.id).length}
                                            onChange={(e) => setOptionsForItem(item.id, { length: e.target.value })}
                                        >
                                            {LENGTH_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="border border-input bg-background rounded px-2 py-1.5 text-xs"
                                            value={getOptionsForItem(item.id).focus}
                                            onChange={(e) => setOptionsForItem(item.id, { focus: e.target.value })}
                                        >
                                            {FOCUS_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                            onClick={() => handleRegenerate(item.id)}
                                            disabled={regeneratingId === item.id}
                                        >
                                            {regeneratingId === item.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            )}
                                            Regenerate
                                        </Button>
                                    </div>

                                    {editingItem === item.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                defaultValue={item.generated_content}
                                                id={`edit-${item.id}`}
                                                className="w-full min-h-[120px] bg-white/5 border border-primary/30 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            />
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm"
                                                    onClick={() => {
                                                        const content = document.getElementById(`edit-${item.id}`).value;
                                                        handleEdit(item.id, content);
                                                    }}
                                                >
                                                    <Save className="w-4 h-4 mr-2" /> Save
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            className="p-4 bg-white/5 rounded-lg border border-white/10 group cursor-pointer hover:border-primary/30 relative"
                                            onClick={() => setEditingItem(item.id)}
                                        >
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.generated_content}</p>
                                            <p className="text-[10px] text-muted-foreground mt-2">Edit to add your human touch, then Approve & Send.</p>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                                                    <Edit2 className="w-3 h-3" /> Edit
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAction(item.id, 'reject')}
                                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAction(item.id, 'approve')}
                                            className="bg-green-600 hover:bg-green-500"
                                        >
                                            <Send className="w-4 h-4 mr-2" /> Approve & Send
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bulk Personalize Modal */}
            {showBulkPersonalizeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl bg-card/95 border-white/10 shadow-2xl">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">🎨 Bulk Personalize Messages</h2>
                                <p className="text-sm text-muted-foreground">
                                    Apply personalization settings to all {selectedItems.length} selected messages at once.
                                    Each message will be regenerated with AI using these parameters.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tone</label>
                                    <select
                                        className="w-full border border-input bg-background rounded-lg px-4 py-2.5"
                                        value={bulkPersonalizeOptions.tone}
                                        onChange={(e) => setBulkPersonalizeOptions(prev => ({ ...prev, tone: e.target.value }))}
                                    >
                                        {TONE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Length</label>
                                    <select
                                        className="w-full border border-input bg-background rounded-lg px-4 py-2.5"
                                        value={bulkPersonalizeOptions.length}
                                        onChange={(e) => setBulkPersonalizeOptions(prev => ({ ...prev, length: e.target.value }))}
                                    >
                                        {LENGTH_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Focus</label>
                                    <select
                                        className="w-full border border-input bg-background rounded-lg px-4 py-2.5"
                                        value={bulkPersonalizeOptions.focus}
                                        onChange={(e) => setBulkPersonalizeOptions(prev => ({ ...prev, focus: e.target.value }))}
                                    >
                                        {FOCUS_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-medium mb-1">What happens next:</p>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>All {selectedItems.length} selected messages will be regenerated</li>
                                            <li>Each will use the same tone, length, and focus settings</li>
                                            <li>Content remains personalized per lead using their profile data</li>
                                            <li>You can still edit individual messages after regeneration</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowBulkPersonalizeModal(false)}
                                    disabled={bulkPersonalizing}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleBulkPersonalize}
                                    disabled={bulkPersonalizing}
                                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                >
                                    {bulkPersonalizing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Personalizing {selectedItems.length} messages...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Personalize {selectedItems.length} Messages
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
