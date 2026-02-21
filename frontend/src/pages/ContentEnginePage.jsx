import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Sparkles, Plus, Filter, X, ChevronRight, Edit3, Calendar,
    Send, Trash2, RefreshCw, CheckCircle2, Clock, Zap, BarChart2,
    FileText, Tag, Target, Users, Globe, ArrowRight, AlertCircle,
    ExternalLink, Copy, MoreHorizontal, Newspaper, Rss, Settings,
    BookOpen, TrendingUp, CheckCheck, Eye, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

// ── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
    { key: 'IDEA', label: 'Ideas', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: Sparkles },
    { key: 'DRAFT', label: 'Draft', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: Edit3 },
    { key: 'REVIEW', label: 'Review', color: '#ec4899', bg: 'rgba(236,72,153,0.08)', icon: Eye },
    { key: 'APPROVED', label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle2 },
    { key: 'SCHEDULED', label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: Calendar },
    { key: 'POSTED', label: 'Posted', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: CheckCheck },
];

const VALID_NEXT = {
    IDEA: ['DRAFT'],
    DRAFT: ['REVIEW', 'IDEA'],
    REVIEW: ['APPROVED', 'DRAFT'],
    APPROVED: ['SCHEDULED', 'REVIEW'],
    SCHEDULED: ['POSTED', 'APPROVED'],
    POSTED: [],
};

const OBJECTIVES = [
    { value: 'thought_leadership', label: 'Thought Leadership' },
    { value: 'product_launch', label: 'Product Launch' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'educational', label: 'Educational' },
    { value: 'networking', label: 'Networking' },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function stageFor(key) {
    return PIPELINE_STAGES.find(s => s.key === key) || PIPELINE_STAGES[0];
}

function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ── Generate Idea Modal ──────────────────────────────────────────────────────

function GenerateModal({ sources, ctaTemplates, onClose, onCreated }) {
    const { addToast } = useToast();
    const [form, setForm] = useState({
        source_id: '',
        persona: '',
        industry: '',
        objective: 'thought_leadership',
        cta_type_id: '',
        topic: '',
    });
    const [loading, setLoading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        if (!form.persona.trim() || !form.industry.trim()) {
            addToast('Persona and Industry are required', 'error'); return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/sow/engine/items/generate', {
                ...form,
                cta_type_id: form.cta_type_id || null,
                source_id: form.source_id || null,
            });
            addToast('✅ Idea generated successfully!', 'success');
            onCreated(res.data);
            onClose();
        } catch (e) {
            addToast(e.response?.data?.error || 'Generation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell title="✨ AI Generate Idea" onClose={onClose}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Persona *">
                        <Input placeholder="e.g. SaaS Founder, HR Manager" value={form.persona} onChange={e => set('persona', e.target.value)} className="border-border/60" />
                    </Field>
                    <Field label="Industry *">
                        <Input placeholder="e.g. Technology, Healthcare" value={form.industry} onChange={e => set('industry', e.target.value)} className="border-border/60" />
                    </Field>
                </div>
                <Field label="Topic / Seed Idea">
                    <Input placeholder="e.g. Remote work productivity trends" value={form.topic} onChange={e => set('topic', e.target.value)} className="border-border/60" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Objective">
                        <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground border-border/60" value={form.objective} onChange={e => set('objective', e.target.value)}>
                            {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    <Field label="CTA Template">
                        <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground border-border/60" value={form.cta_type_id} onChange={e => set('cta_type_id', e.target.value)}>
                            <option value="">None</option>
                            {ctaTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label="Content Source (optional)">
                    <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground border-border/60" value={form.source_id} onChange={e => set('source_id', e.target.value)}>
                        <option value="">None</option>
                        {sources.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </Field>
                <Button className="w-full gap-2 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md" onClick={submit} disabled={loading}>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Generating with AI...' : 'Generate Idea'}
                </Button>
            </div>
        </ModalShell>
    );
}

// ── Add Source Modal ─────────────────────────────────────────────────────────

function AddSourceModal({ onClose, onCreated }) {
    const { addToast } = useToast();
    const [form, setForm] = useState({ name: '', type: 'manual', url: '', industry_tag: '', persona_tag: '' });
    const [loading, setLoading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        if (!form.name.trim()) { addToast('Name is required', 'error'); return; }
        setLoading(true);
        try {
            const res = await axios.post('/api/sow/engine/sources', form);
            addToast('Source added!', 'success');
            onCreated(res.data);
            onClose();
        } catch (e) {
            addToast(e.response?.data?.error || 'Failed', 'error');
        } finally { setLoading(false); }
    };

    return (
        <ModalShell title="Add Content Source" onClose={onClose}>
            <div className="space-y-4">
                <Field label="Name *">
                    <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. TechCrunch Feed" className="border-border/60" />
                </Field>
                <Field label="Type">
                    <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground border-border/60" value={form.type} onChange={e => set('type', e.target.value)}>
                        <option value="manual">Manual</option>
                        <option value="rss">RSS Feed</option>
                        <option value="keyword">Keyword Monitor</option>
                    </select>
                </Field>
                {form.type === 'rss' && (
                    <Field label="RSS URL">
                        <Input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." className="border-border/60" />
                    </Field>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Industry Tag">
                        <Input value={form.industry_tag} onChange={e => set('industry_tag', e.target.value)} placeholder="Technology" className="border-border/60" />
                    </Field>
                    <Field label="Persona Tag">
                        <Input value={form.persona_tag} onChange={e => set('persona_tag', e.target.value)} placeholder="SaaS Founder" className="border-border/60" />
                    </Field>
                </div>
                <Button className="w-full h-10" onClick={submit} disabled={loading}>
                    {loading ? 'Saving...' : 'Add Source'}
                </Button>
            </div>
        </ModalShell>
    );
}

// ── Edit / Detail Modal ───────────────────────────────────────────────────────

function ItemDetailModal({ item, ctaTemplates, onClose, onUpdated, onDeleted }) {
    const { addToast } = useToast();
    const [content, setContent] = useState(item.edited_content || item.generated_content || '');
    const [saving, setSaving] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [sending, setSending] = useState(false);

    const stage = stageFor(item.status);
    const nextStates = VALID_NEXT[item.status] || [];

    const saveContent = async () => {
        setSaving(true);
        try {
            const res = await axios.put(`/api/sow/engine/items/${item.id}/content`, { edited_content: content });
            addToast('Content saved', 'success');
            onUpdated(res.data);
        } catch (e) {
            addToast('Save failed', 'error');
        } finally { setSaving(false); }
    };

    const transition = async (toStatus) => {
        if (toStatus === 'SCHEDULED') { setShowScheduleForm(true); return; }
        setTransitioning(true);
        try {
            const res = await axios.put(`/api/sow/engine/items/${item.id}/transition`, { to_status: toStatus });
            addToast(`Moved to ${toStatus}`, 'success');
            onUpdated(res.data);
            onClose();
        } catch (e) {
            addToast(e.response?.data?.error || 'Transition failed', 'error');
        } finally { setTransitioning(false); }
    };

    const scheduleNow = async () => {
        if (!scheduledAt) { addToast('Pick a date/time', 'error'); return; }
        setTransitioning(true);
        try {
            const res = await axios.put(`/api/sow/engine/items/${item.id}/transition`, { to_status: 'SCHEDULED', scheduled_at: scheduledAt });
            addToast('Scheduled!', 'success');
            onUpdated(res.data);
            onClose();
        } catch (e) {
            addToast(e.response?.data?.error || 'Schedule failed', 'error');
        } finally { setTransitioning(false); }
    };

    const sendToPhantom = async () => {
        setSending(true);
        try {
            await axios.post(`/api/sow/engine/items/${item.id}/send`);
            addToast('✅ Sent to LinkedIn via Phantom!', 'success');
            onUpdated({ ...item, status: 'POSTED' });
            onClose();
        } catch (e) {
            addToast(e.response?.data?.error || 'Send failed', 'error');
        } finally { setSending(false); }
    };

    const deleteItem = async () => {
        if (!window.confirm('Delete this content item?')) return;
        try {
            await axios.delete(`/api/sow/engine/items/${item.id}`);
            addToast('Deleted', 'success');
            onDeleted(item.id);
            onClose();
        } catch { addToast('Delete failed', 'error'); }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        addToast('Copied to clipboard!', 'success');
    };

    return (
        <ModalShell title={item.title || 'Content Item'} onClose={onClose} wide>
            <div className="space-y-4">
                {/* Meta row */}
                <div className="flex flex-wrap gap-2 items-center">
                    <Badge style={{ backgroundColor: stage.color + '22', color: stage.color, border: `1px solid ${stage.color}44` }}>
                        {item.status}
                    </Badge>
                    {item.persona && <Badge variant="outline" className="text-xs gap-1"><Users className="w-3 h-3" />{item.persona}</Badge>}
                    {item.industry && <Badge variant="outline" className="text-xs gap-1"><Globe className="w-3 h-3" />{item.industry}</Badge>}
                    {item.objective && <Badge variant="secondary" className="text-xs">{item.objective}</Badge>}
                    {item.cta_name && <Badge variant="secondary" className="text-xs gap-1"><Tag className="w-3 h-3" />{item.cta_name}</Badge>}
                </div>

                {/* Content editor */}
                <div className="relative">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">LinkedIn Post Content</label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={12}
                        disabled={item.status === 'POSTED'}
                        className="w-full rounded-lg border border-input bg-muted/30 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono leading-relaxed disabled:opacity-60"
                    />
                    <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={saveContent} disabled={saving || item.status === 'POSTED'} className="gap-1.5">
                            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                            {saving ? 'Saving...' : 'Save Edits'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-1.5">
                            <Copy className="w-3 h-3" /> Copy
                        </Button>
                    </div>
                </div>

                {/* Schedule form */}
                {showScheduleForm && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2">
                        <p className="text-sm font-medium text-blue-400">📅 Schedule post for:</p>
                        <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-background" />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={scheduleNow} disabled={transitioning} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                                <Calendar className="w-3 h-3" /> Confirm Schedule
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowScheduleForm(false)}>Cancel</Button>
                        </div>
                    </motion.div>
                )}

                {/* Scheduled at info */}
                {item.scheduled_at && (
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                        <Calendar className="w-4 h-4" />
                        Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                    </div>
                )}

                {/* Post URL if posted */}
                {item.post_url && (
                    <a href={item.post_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-emerald-400 hover:underline">
                        <ExternalLink className="w-4 h-4" /> View LinkedIn Post
                    </a>
                )}

                {/* Error message */}
                {item.error_message && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{item.error_message}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {/* Next state transitions */}
                    {nextStates.map(s => {
                        const ns = stageFor(s);
                        const Icon = ns.icon;
                        const isPhantom = s === 'POSTED';
                        return (
                            <Button
                                key={s}
                                size="sm"
                                onClick={() => isPhantom ? sendToPhantom() : transition(s)}
                                disabled={transitioning || sending}
                                className="gap-1.5"
                                style={{ backgroundColor: ns.color, color: '#fff' }}
                            >
                                <Icon className="w-3 h-3" />
                                {isPhantom ? 'Send to Phantom' : `Move to ${s}`}
                            </Button>
                        );
                    })}

                    {/* Send to Phantom if APPROVED or SCHEDULED */}
                    {['APPROVED', 'SCHEDULED'].includes(item.status) && (
                        <Button size="sm" variant="outline" onClick={sendToPhantom} disabled={sending} className="gap-1.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10">
                            {sending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            {sending ? 'Sending...' : 'Send to Phantom Now'}
                        </Button>
                    )}

                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={deleteItem} className="gap-1.5 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                </div>
            </div>
        </ModalShell>
    );
}

// ── Kanban Card ───────────────────────────────────────────────────────────────

function KanbanCard({ item, onClick }) {
    const stage = stageFor(item.status);
    const preview = (item.edited_content || item.generated_content || '').slice(0, 160);
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={onClick}
            className="group cursor-pointer rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-3.5 overflow-hidden hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 relative"
            style={{ borderLeftWidth: '3px', borderLeftColor: stage.color }}
        >
            {/* Title */}
            <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2 pr-1">
                {item.title || 'Untitled'}
            </p>

            {/* Content preview */}
            {preview && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                    {preview}{preview.length === 160 ? '…' : ''}
                </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                {item.persona && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        <Users className="w-2.5 h-2.5 shrink-0" />{item.persona}
                    </span>
                )}
                {item.industry && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <Globe className="w-2.5 h-2.5 shrink-0" />{item.industry}
                    </span>
                )}
                {item.cta_name && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Tag className="w-2.5 h-2.5 shrink-0" />{item.cta_name}
                    </span>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                <span>{timeAgo(item.created_at)}</span>
                <div className="flex items-center gap-1.5">
                    {item.scheduled_at && (
                        <span className="flex items-center gap-1 text-blue-500">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(item.scheduled_at).toLocaleDateString()}
                        </span>
                    )}
                    {item.error_message && <AlertCircle className="w-3 h-3 text-red-500" />}
                    {item.post_url && <ExternalLink className="w-3 h-3 text-emerald-500" />}
                </div>
            </div>
        </motion.div>
    );
}

// ── Reusable UI helpers ───────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, wide = false }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`relative bg-card border border-border rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </motion.div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContentEnginePage() {
    const { addToast } = useToast();

    // Data
    const [items, setItems] = useState([]);
    const [sources, setSources] = useState([]);
    const [ctaTemplates, setCtaTemplates] = useState([]);
    const [analytics, setAnalytics] = useState(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('board'); // board | analytics
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showAddSourceModal, setShowAddSourceModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Filters (right panel)
    const [filterPersona, setFilterPersona] = useState('');
    const [filterIndustry, setFilterIndustry] = useState('');
    const [filterObjective, setFilterObjective] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); // empty = all

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, sourcesRes, ctaRes, analyticsRes] = await Promise.all([
                axios.get('/api/sow/engine/items'),
                axios.get('/api/sow/engine/sources'),
                axios.get('/api/sow/engine/cta-templates'),
                axios.get('/api/sow/engine/analytics').catch(() => ({ data: null })),
            ]);
            setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
            setSources(Array.isArray(sourcesRes.data) ? sourcesRes.data : []);
            setCtaTemplates(Array.isArray(ctaRes.data) ? ctaRes.data : []);
            setAnalytics(analyticsRes.data);
        } catch (e) {
            addToast('Failed to load content engine data', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Derived: filtered items
    const filteredItems = items.filter(item => {
        if (filterStatus && item.status !== filterStatus) return false;
        if (filterPersona && !item.persona?.toLowerCase().includes(filterPersona.toLowerCase())) return false;
        if (filterIndustry && !item.industry?.toLowerCase().includes(filterIndustry.toLowerCase())) return false;
        if (filterObjective && item.objective !== filterObjective) return false;
        if (filterSource && String(item.source_id) !== String(filterSource)) return false;
        return true;
    });

    const itemsByStage = (stageKey) => filteredItems.filter(i => i.status === stageKey);

    const handleItemUpdated = (updated) => {
        setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
    };
    const handleItemCreated = (newItem) => {
        setItems(prev => [newItem, ...prev]);
    };
    const handleItemDeleted = (id) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };
    const handleSourceCreated = (s) => setSources(prev => [s, ...prev]);

    const toggleSourceActive = async (source) => {
        try {
            const res = await axios.put(`/api/sow/engine/sources/${source.id}`, { active: !source.active });
            setSources(prev => prev.map(s => s.id === source.id ? res.data : s));
        } catch { addToast('Failed to update source', 'error'); }
    };

    const hasFilters = filterPersona || filterIndustry || filterObjective || filterSource || filterStatus;

    return (
        <div className="flex flex-col h-full space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-border/60">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                Content Engine
                            </h1>
                            <p className="text-muted-foreground text-sm mt-0.5">AI-powered pipeline: Ideas → Draft → Review → Approved → Scheduled → Posted</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-border/60 hover:border-primary/30 hover:bg-primary/5"
                        onClick={() => setActiveTab(t => t === 'board' ? 'analytics' : 'board')}
                    >
                        {activeTab === 'board' ? <><BarChart2 className="w-4 h-4" /> Analytics</> : <><Rss className="w-4 h-4" /> Board</>}
                    </Button>
                    <Button
                        size="sm"
                        className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/30 transition-shadow"
                        onClick={() => setShowGenerateModal(true)}
                    >
                        <Sparkles className="w-4 h-4" /> Generate Idea
                    </Button>
                </div>
            </div>

            {/* ── Stage pills (quick filter) ── */}
            <div className="flex gap-2 mb-5 flex-wrap">
                <button
                    onClick={() => setFilterStatus('')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${!filterStatus ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                    All ({items.length})
                </button>
                {PIPELINE_STAGES.map(s => {
                    const count = items.filter(i => i.status === s.key).length;
                    const isActive = filterStatus === s.key;
                    return (
                        <button
                            key={s.key}
                            onClick={() => setFilterStatus(isActive ? '' : s.key)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${isActive ? 'text-white shadow-md ring-1 ring-black/10' : 'bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted hover:border-border'}`}
                            style={isActive ? { backgroundColor: s.color, borderColor: s.color } : {}}
                        >
                            {s.label} {count > 0 && <span className="opacity-90">({count})</span>}
                        </button>
                    );
                })}
            </div>

            {/* ── Main layout: Left+Board+Right ── */}
            <div className="flex gap-5 min-h-0 flex-1">

                {/* ── Left panel: Sources ── */}
                <div className="w-56 shrink-0">
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full overflow-hidden">
                        <CardHeader className="py-4 px-4 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Rss className="w-4 h-4 text-orange-500" />
                                    Content Sources
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                                    onClick={() => setShowAddSourceModal(true)}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-340px)]">
                            {sources.length === 0 ? (
                                <div className="text-center py-8 px-3 rounded-xl border border-dashed border-border/60 bg-muted/20">
                                    <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-xs text-muted-foreground mb-2">No sources yet</p>
                                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAddSourceModal(true)}>
                                        Add Source
                                    </Button>
                                </div>
                            ) : (
                                sources.map(s => (
                                    <div
                                        key={s.id}
                                        onClick={() => setFilterSource(filterSource === String(s.id) ? '' : String(s.id))}
                                        className={`group cursor-pointer rounded-lg p-3 border transition-all duration-200 ${filterSource === String(s.id) ? 'border-indigo-500/50 bg-indigo-500/10 shadow-sm shadow-indigo-500/5' : 'border-border/40 hover:border-border bg-muted/10 hover:bg-muted/30'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${s.type === 'rss' ? 'bg-orange-500/15 text-orange-500' : s.type === 'keyword' ? 'bg-blue-500/15 text-blue-500' : 'bg-purple-500/15 text-purple-500'}`}>
                                                    {s.type === 'rss' ? <Rss className="w-3.5 h-3.5" /> : s.type === 'keyword' ? <Target className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                                </div>
                                                <span className="text-xs font-medium truncate">{s.name}</span>
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); toggleSourceActive(s); }}
                                                className={`w-9 h-5 rounded-full transition-all shrink-0 flex items-center ${s.active ? 'bg-emerald-500 justify-end' : 'bg-muted justify-start'}`}
                                            >
                                                <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm m-0.5 transition-transform" />
                                            </button>
                                        </div>
                                        {(s.industry_tag || s.persona_tag) && (
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {s.industry_tag && <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20">{s.industry_tag}</span>}
                                                {s.persona_tag && <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded-md border border-indigo-500/20">{s.persona_tag}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Main: Board or Analytics ── */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm h-full min-h-[280px] overflow-hidden">
                        <CardContent className="p-4 h-full overflow-x-auto">
                    {loading ? (
                        <div className="flex gap-4 pr-2">
                            {PIPELINE_STAGES.map(s => (
                                <div key={s.key} className="w-[232px] shrink-0 space-y-3">
                                    <div className="h-10 w-20 bg-muted/50 rounded-lg animate-pulse" />
                                    <div className="space-y-2.5 min-h-[220px]">
                                        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'analytics' ? (
                        <AnalyticsView analytics={analytics} items={items} />
                    ) : (
                        /* Kanban Board */
                        <div className="flex gap-4 pb-6 pr-2" style={{ minWidth: `${PIPELINE_STAGES.length * 240}px` }}>
                            {PIPELINE_STAGES.map(stage => {
                                const stageItems = itemsByStage(stage.key);
                                const Icon = stage.icon;
                                return (
                                    <div key={stage.key} className="w-[232px] shrink-0 flex flex-col">
                                        {/* Column header */}
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: stage.bg }}>
                                                <Icon className="w-4 h-4" style={{ color: stage.color }} />
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold uppercase tracking-wide block" style={{ color: stage.color }}>{stage.label}</span>
                                                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{stageItems.length}</span>
                                            </div>
                                        </div>

                                        {/* Column content */}
                                        <div className="flex-1 rounded-xl p-3 space-y-2.5 min-h-[220px] border border-border/40 bg-muted/5" style={{ borderTop: `3px solid ${stage.color}40` }}>
                                            <AnimatePresence mode="popLayout">
                                                {stageItems.map(item => (
                                                    <KanbanCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                                                ))}
                                            </AnimatePresence>
                                            {stageItems.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border-2 border-dashed border-border/40">
                                                    <Icon className="w-7 h-7 mb-2 opacity-40" style={{ color: stage.color }} />
                                                    <p className="text-[11px] text-muted-foreground font-medium">No items</p>
                                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Drag or add here</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right panel: Filters ── */}
                <div className="w-48 shrink-0">
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full overflow-hidden">
                        <CardHeader className="py-4 px-4 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-violet-500" />
                                    Filters
                                </CardTitle>
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] text-primary hover:bg-primary/10"
                                        onClick={() => { setFilterPersona(''); setFilterIndustry(''); setFilterObjective(''); setFilterSource(''); setFilterStatus(''); }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-340px)]">
                            <div className="space-y-3">
                                <Field label="Persona">
                                    <Input placeholder="Any persona" value={filterPersona} onChange={e => setFilterPersona(e.target.value)} className="h-8 text-xs border-border/60" />
                                </Field>
                                <Field label="Industry">
                                    <Input placeholder="Any industry" value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="h-8 text-xs border-border/60" />
                                </Field>
                                <Field label="Objective">
                                    <select className="w-full h-8 px-3 rounded-md border border-input bg-background text-xs text-foreground border-border/60" value={filterObjective} onChange={e => setFilterObjective(e.target.value)}>
                                        <option value="">All</option>
                                        {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* Pipeline stats */}
                            <div className="pt-3 border-t border-border/50 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pipeline</p>
                                <div className="space-y-1.5">
                                    {PIPELINE_STAGES.map(s => {
                                        const count = items.filter(i => i.status === s.key).length;
                                        return (
                                            <div key={s.key} className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-muted/30 transition-colors">
                                                <span className="flex items-center gap-1.5" style={{ color: s.color }}>
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                                    {s.label}
                                                </span>
                                                <span className="font-semibold tabular-nums text-foreground">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showGenerateModal && (
                    <GenerateModal sources={sources} ctaTemplates={ctaTemplates} onClose={() => setShowGenerateModal(false)} onCreated={handleItemCreated} />
                )}
                {showAddSourceModal && (
                    <AddSourceModal onClose={() => setShowAddSourceModal(false)} onCreated={handleSourceCreated} />
                )}
                {selectedItem && (
                    <ItemDetailModal
                        item={selectedItem}
                        ctaTemplates={ctaTemplates}
                        onClose={() => setSelectedItem(null)}
                        onUpdated={updated => { handleItemUpdated(updated); setSelectedItem(prev => ({ ...prev, ...updated })); }}
                        onDeleted={handleItemDeleted}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Analytics View ────────────────────────────────────────────────────────────

function AnalyticsView({ analytics, items }) {
    if (!analytics) return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                <div className="text-center">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No analytics data yet.</p>
                    <p className="text-xs mt-1">Generate and post content to see stats.</p>
                </div>
            </CardContent>
        </Card>
    );

    const statCards = [
        { label: 'Total Ideas', value: analytics.total_ideas, color: '#6366f1', icon: Sparkles },
        { label: 'Approved', value: analytics.total_approved, color: '#10b981', icon: CheckCircle2 },
        { label: 'Scheduled', value: analytics.total_scheduled, color: '#3b82f6', icon: Calendar },
        { label: 'Posted', value: analytics.total_posted, color: '#8b5cf6', icon: CheckCheck },
        { label: 'In Review', value: analytics.total_in_review, color: '#ec4899', icon: Eye },
        { label: 'Drafts', value: analytics.total_drafts, color: '#f59e0b', icon: Edit3 },
    ];

    return (
        <div className="space-y-6 pr-2">
            {/* Stat grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {statCards.map(s => (
                    <Card key={s.label} className="border-border/50 overflow-hidden" style={{ borderLeftWidth: '4px', borderLeftColor: s.color }}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
                                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                            </div>
                            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>{s.value ?? 0}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Posts by persona */}
            {analytics.posts_by_persona?.length > 0 && (
                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" />
                            Posts by Persona
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        {analytics.posts_by_persona.map(p => (
                            <div key={p.persona} className="flex items-center gap-3">
                                <span className="text-sm w-36 truncate font-medium">{p.persona || 'Unknown'}</span>
                                <div className="flex-1 h-2.5 rounded-full bg-muted/50 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (p.count / (analytics.total_posted || 1)) * 100)}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    />
                                </div>
                                <span className="text-xs font-bold w-8 text-right tabular-nums">{p.count}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* CTA usage */}
            {analytics.cta_usage?.length > 0 && (
                <Card className="border-border/50 bg-card/50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Tag className="w-4 h-4 text-amber-500" />
                            CTA Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                            {analytics.cta_usage.map(c => (
                                <div key={c.cta_name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium">
                                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{c.cta_name}</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">{c.usage_count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
