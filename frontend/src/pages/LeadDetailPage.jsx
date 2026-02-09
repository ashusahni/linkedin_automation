import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Linkedin, Save, Check, X, Edit2, ExternalLink, Zap, Sparkles, MessageCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';

export default function LeadDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});

    // Enrichment State
    const [enrichment, setEnrichment] = useState(null);
    const [enriching, setEnriching] = useState(false);

    // Send Message State (LinkedIn Message Sender phantom)
    const [showSendMessage, setShowSendMessage] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [generatingMessage, setGeneratingMessage] = useState(false);

    useEffect(() => {
        fetchLead();
        fetchEnrichment();
    }, [id]);

    const fetchLead = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/leads/${id}`);
            setLead(res.data);
            setFormData(res.data);
        } catch (error) {
            console.error('Failed to fetch lead', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrichment = async () => {
        try {
            const res = await axios.get(`/api/leads/${id}/enrichment`);
            setEnrichment(res.data);
        } catch (error) {
            console.error('Failed to fetch enrichment', error);
        }
    };

    const handleSave = async () => {
        try {
            await axios.put(`/api/leads/${id}`, formData);
            setLead(formData);
            setEditing(false);
            addToast('Lead updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update lead', error);
            addToast(error.response?.data?.error || 'Failed to update lead', 'error');
        }
    };

    const handleApprove = async () => {
        try {
            await axios.put(`/api/leads/${id}`, { status: 'approved' });
            setLead({ ...lead, status: 'approved' });
            addToast('Lead approved', 'success');
        } catch (error) {
            console.error('Failed to approve lead', error);
            addToast(error.response?.data?.error || 'Failed to approve lead', 'error');
        }
    };

    const handleReject = async () => {
        try {
            await axios.put(`/api/leads/${id}`, { status: 'rejected' });
            setLead({ ...lead, status: 'rejected' });
            addToast('Lead rejected', 'success');
        } catch (error) {
            console.error('Failed to reject lead', error);
            addToast(error.response?.data?.error || 'Failed to reject lead', 'error');
        }
    };

    const handleEnrich = async () => {
        try {
            setEnriching(true);
            await axios.post(`/api/leads/${id}/enrich`);
            addToast('Enrichment complete. Profile was scraped from this lead\'s LinkedIn URL.', 'success');
            // Refetch immediately — backend waits for PhantomBuster, so data is ready when POST returns
            await fetchEnrichment();
        } catch (error) {
            console.error('Enrichment failed', error);
            addToast(error.response?.data?.error || 'Enrichment failed', 'error');
        } finally {
            setEnriching(false);
        }
    };

    const handleGeneratePersonalizedMessage = async () => {
        try {
            setGeneratingMessage(true);
            const res = await axios.post(`/api/leads/${id}/generate-message`, {
                type: 'connection_request',
                tone: 'professional',
                length: 'medium',
                focus: 'general'
            });
            if (res.data?.message) {
                setMessageContent(res.data.message);
                addToast(res.data.hasEnrichment ? 'Personalized message generated using profile data' : 'Message generated (enrich profile for better personalization)', 'success');
            }
        } catch (error) {
            addToast(error.response?.data?.error || 'Failed to generate message', 'error');
        } finally {
            setGeneratingMessage(false);
        }
    };

    const handleSendMessage = async () => {
        if (!messageContent?.trim() || !lead?.linkedin_url) {
            addToast('Please enter a message', 'warning');
            return;
        }
        try {
            setSendingMessage(true);
            await axios.post('/api/phantom/send-message-complete', {
                leadId: Number(id),
                linkedinUrl: lead.linkedin_url,
                message: messageContent.trim()
            }, { timeout: 120000 });
            addToast('LinkedIn message sent successfully!', 'success');
            setShowSendMessage(false);
            setMessageContent('');
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.error || error.message;
            addToast(msg || 'Failed to send message', 'error');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const getStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'new': return 'default';
            case 'approved': return 'secondary';
            case 'rejected': return 'destructive';
            default: return 'outline';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Loading lead details...</p>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground mb-4">Lead not found</p>
                <Button onClick={() => navigate('/leads')}>Back to Leads</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{lead.full_name}</h1>
                        <p className="text-muted-foreground mt-1">{lead.title} at {lead.company}</p>
                    </div>
                </div>
                <Badge variant={getStatusVariant(lead.status)} className="capitalize">
                    {lead.status}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Profile Info */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Lead details and contact information</CardDescription>
                        </div>
                        {!editing ? (
                            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
                                <Edit2 className="h-4 w-4" /> Edit
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setFormData(lead); }}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSave} className="gap-2">
                                    <Save className="h-4 w-4" /> Save
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                {editing ? (
                                    <Input
                                        value={formData.full_name || ''}
                                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 font-medium">{lead.full_name || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">First Name</label>
                                {editing ? (
                                    <Input
                                        value={formData.first_name || ''}
                                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 font-medium">{lead.first_name || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                                {editing ? (
                                    <Input
                                        value={formData.last_name || ''}
                                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 font-medium">{lead.last_name || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Title</label>
                                {editing ? (
                                    <Input
                                        value={formData.title || ''}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 font-medium">{lead.title || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Company</label>
                                {editing ? (
                                    <Input
                                        value={formData.company || ''}
                                        onChange={(e) => handleInputChange('company', e.target.value)}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 font-medium">{lead.company || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">LinkedIn URL</label>
                                {lead.linkedin_url ? (
                                    <a
                                        href={lead.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <Linkedin className="h-4 w-4" />
                                        View Profile <ExternalLink className="h-3 w-3" />
                                    </a>
                                ) : (
                                    <p className="mt-1 text-muted-foreground">-</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Metadata & Actions */}
                <div className="space-y-6">
                    {/* Metadata Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Source</label>
                                <p className="mt-1 font-medium capitalize">{lead.source?.replace(/_/g, ' ') || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Imported At</label>
                                <p className="mt-1 text-sm">{lead.created_at ? new Date(lead.created_at).toLocaleString() : '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                                <p className="mt-1 text-sm">{lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '-'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                className="w-full gap-2"
                                variant={lead.status === 'approved' ? 'secondary' : 'default'}
                                onClick={handleApprove}
                                disabled={lead.status === 'approved'}
                            >
                                <Check className="h-4 w-4" />
                                {lead.status === 'approved' ? 'Approved' : 'Approve Lead'}
                            </Button>

                            {lead.linkedin_url && (
                                <>
                                    <Button
                                        className="w-full gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white"
                                        onClick={() => setShowSendMessage(!showSendMessage)}
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Send LinkedIn Message
                                    </Button>
                                    {showSendMessage && (
                                        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                                            <label className="text-sm font-medium text-muted-foreground">Message</label>
                                            <textarea
                                                value={messageContent}
                                                onChange={(e) => setMessageContent(e.target.value)}
                                                placeholder="Hi {firstName}, I'd like to connect..."
                                                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background resize-y"
                                                disabled={sendingMessage}
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="secondary" onClick={handleGeneratePersonalizedMessage} disabled={generatingMessage || sendingMessage} className="gap-2">
                                                    {generatingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                    {generatingMessage ? 'Generating...' : 'Generate personalized'}
                                                </Button>
                                                <Button size="sm" onClick={handleSendMessage} disabled={sendingMessage} className="gap-2">
                                                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                                                    {sendingMessage ? 'Sending...' : 'Send'}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setShowSendMessage(false); setMessageContent(''); }} disabled={sendingMessage}>
                                                    Cancel
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Profile data is captured when sending messages. Generate personalized uses available data for personalization.</p>
                                        </div>
                                    )}
                                </>
                            )}

                            <Button
                                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={handleEnrich}
                                disabled={enriching}
                            >
                                <Zap className={cn("h-4 w-4", enriching && "animate-pulse")} />
                                {enriching ? 'Enriching...' : 'Deep Enrich (AI)'}
                            </Button>

                            <Button
                                className="w-full gap-2"
                                variant={lead.status === 'rejected' ? 'secondary' : 'destructive'}
                                onClick={handleReject}
                                disabled={lead.status === 'rejected'}
                            >
                                <X className="h-4 w-4" />
                                {lead.status === 'rejected' ? 'Rejected' : 'Reject Lead'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Enrichment Data */}
                {enrichment && (
                    <Card className="md:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-500" />
                                AI-Enriched Profile Data
                            </CardTitle>
                            <CardDescription className="space-y-1">
                                <span className="block">Extra context gathered to help AI personalize messages.</span>
                                {lead.linkedin_url && (
                                    <span className="block text-xs mt-1.5 text-muted-foreground">
                                        Scraped from this lead&apos;s LinkedIn profile — the link was sent automatically to the Profile Scraper.{' '}
                                        <a
                                            href={lead.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline inline-flex items-center gap-1"
                                        >
                                            View profile
                                            <ExternalLink className="h-3 w-3 inline" />
                                        </a>
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Professional Bio</label>
                                <p className="text-sm border p-3 rounded-lg bg-muted/30 italic">"{enrichment.bio}"</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Scraped Interests</label>
                                <div className="flex flex-wrap gap-2">
                                    {enrichment.interests?.map((interest, i) => (
                                        <Badge key={i} variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-200">
                                            {interest}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
