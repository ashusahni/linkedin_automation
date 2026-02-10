import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Newspaper, Rss, PenTool, Calendar, Send, Edit3, 
    MoreVertical, Share2, Trash2, ExternalLink, 
    Sparkles, Filter, Search, Plus, CheckCircle2,
    Clock, AlertCircle, RefreshCw, ChevronRight,
    ArrowUpRight, Bookmark, Settings, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { 
    DropdownMenu, 
    DropdownMenuTrigger, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

export default function ContentEnginePage() {
    const { addToast } = useToast();
    const [posts, setPosts] = useState([]);
    const [feeds, setFeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [activeTab, setActiveTab] = useState('drafts');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPosts();
        fetchFeeds();
    }, []);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/sow/content/posts');
            setPosts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
            addToast('Failed to load content posts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchFeeds = async () => {
        try {
            const res = await axios.get('/api/sow/content/feeds');
            setFeeds(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch feeds:', err);
        }
    };

    const handleFetchNews = async () => {
        try {
            setFetching(true);
            addToast('Fetching latest industry news and generating AI content...', 'info');
            const res = await axios.post('/api/sow/content/fetch');
            
            if (res.data && res.data.length > 0) {
                addToast(`Successfully generated ${res.data.length} new posts!`, 'success');
                setPosts(prev => [...res.data, ...prev]);
            } else {
                addToast('No new content found at this time.', 'info');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            addToast('Failed to fetch and generate content. Check your OpenAI API key.', 'error');
        } finally {
            setFetching(false);
        }
    };

    const handleUpdateStatus = async (postId, status) => {
        try {
            await axios.put(`/api/sow/content/posts/${postId}/status`, { status });
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p));
            addToast(`Post updated to ${status}`, 'success');
        } catch (err) {
            addToast('Failed to update post status', 'error');
        }
    };

    const filteredPosts = posts.filter(post => {
        const matchesStatus = activeTab === 'all' || post.status === activeTab;
        const matchesSearch = post.original_title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             post.ai_generated_content?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-1 sm:p-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Content Curation Engine
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        AI-powered industry monitoring and LinkedIn content generation.
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                        onClick={handleFetchNews} 
                        disabled={fetching || loading} 
                        className="flex-1 md:flex-none gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {fetching ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                        {fetching ? 'Generating...' : 'Curate & Generate'}
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-primary/10 overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Newspaper size={120} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-blue-500 font-medium">Total Posts</CardDescription>
                        <CardTitle className="text-3xl font-bold">{posts.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-primary/10 overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Clock size={120} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-amber-500 font-medium">Pending Drafts</CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {posts.filter(p => p.status === 'draft').length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-primary/10 overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <CheckCircle2 size={120} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-500 font-medium">Approved</CardDescription>
                        <CardTitle className="text-3xl font-bold">
                            {posts.filter(p => p.status === 'approved').length}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-primary/10 overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Rss size={120} />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-purple-500 font-medium">Active Feeds</CardDescription>
                        <CardTitle className="text-3xl font-bold">{feeds.filter(f => f.is_active).length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sidebar - Feeds Management */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="bg-card/50 backdrop-blur-sm border-primary/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Rss className="w-5 h-5 text-primary" />
                                Monitoring Feeds
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {feeds.map(feed => (
                                <div key={feed.id} className="group relative flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium truncate">{feed.name}</p>
                                            <Badge variant={feed.is_active ? "success" : "outline"} className="scale-75 origin-left">
                                                {feed.is_active ? 'Active' : 'Muted'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full border-dashed flex gap-2">
                                <Plus className="w-4 h-4" /> Add Source
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-primary" />
                                Content Strategy
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Our AI extracts key industry news every 6 hours and drafts thought-leadership posts tailored for your LinkedIn profile.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px]">#TechTrends</Badge>
                                <Badge variant="secondary" className="text-[10px]">#Innovation</Badge>
                                <Badge variant="secondary" className="text-[10px]">#SaaS</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Feed */}
                <div className="lg:col-span-9 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <Tabs defaultValue="drafts" value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                            <TabsList className="bg-muted/50">
                                <TabsTrigger value="drafts" className="flex gap-2">
                                    Drafts
                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none px-1.5 h-4 min-w-[18px]">
                                        {posts.filter(p => p.status === 'draft').length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="approved">Approved</TabsTrigger>
                                <TabsTrigger value="all">All Library</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search library..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-muted/30 border-none focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>

                    <AnimatePresence mode='wait'>
                        {loading && !fetching ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {[1, 2, 4].map(i => (
                                    <Card key={i} className="border-none shadow-none bg-muted/20">
                                        <CardHeader>
                                            <Skeleton className="h-6 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </CardHeader>
                                        <CardContent>
                                            <Skeleton className="h-24 w-full" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </motion.div>
                        ) : filteredPosts.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-20 bg-muted/20 border border-dashed rounded-3xl"
                            >
                                <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                                    <Bookmark className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-semibold">No content matches your filter</h3>
                                <p className="text-muted-foreground mt-2 max-w-xs text-center">
                                    Try adjusting your search or curate some fresh news from your feeds.
                                </p>
                                <Button onClick={handleFetchNews} variant="outline" className="mt-6">
                                    Generate New Ideas
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                {filteredPosts.map(post => (
                                    <motion.div key={post.id} variants={item}>
                                        <Card className="h-full flex flex-col group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-primary/5 bg-card/60 backdrop-blur-md">
                                            <CardHeader className="pb-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex gap-2">
                                                        <Badge variant={post.status === 'approved' ? 'success' : 'outline'} className="capitalize">
                                                            {post.status}
                                                        </Badge>
                                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none font-medium flex gap-1 items-center">
                                                            <Share2 size={10} /> LinkedIn
                                                        </Badge>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="flex gap-2">
                                                                <Edit3 size={14} /> Edit Draft
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="flex gap-2">
                                                                <Copy size={14} /> Copy to Clipboard
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="flex gap-2 text-destructive focus:text-destructive">
                                                                <Trash2 size={14} /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <CardTitle className="text-lg leading-snug line-clamp-2 mt-4 group-hover:text-primary transition-colors">
                                                    {post.original_title}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                        <Newspaper size={12} className="text-primary/70" />
                                                        Source: {new URL(post.source_url || 'https://techcrunch.com').hostname.replace('www.', '')}
                                                    </div>
                                                    <a 
                                                        href={post.source_url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="p-1 rounded-md hover:bg-muted text-primary/70"
                                                    >
                                                        <ArrowUpRight size={12} />
                                                    </a>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 pb-6">
                                                <div className="relative">
                                                    <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                                                    <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap pl-3">
                                                        {post.ai_generated_content}
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="pt-0 flex gap-3">
                                                {post.status === 'draft' ? (
                                                    <>
                                                        <Button 
                                                            variant="default" 
                                                            className="flex-1 gap-2 shadow-md shadow-primary/10"
                                                            onClick={() => handleUpdateStatus(post.id, 'approved')}
                                                        >
                                                            <CheckCircle2 size={16} />
                                                            Approve
                                                        </Button>
                                                        <Button variant="outline" className="flex-1 gap-2 border-primary/20">
                                                            <Calendar size={16} />
                                                            Schedule
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button variant="outline" className="flex-1 gap-2 text-primary border-primary/20">
                                                            <Send size={16} />
                                                            Post Now
                                                        </Button>
                                                        <Button variant="outline" className="flex-1 gap-2" onClick={() => handleUpdateStatus(post.id, 'draft')}>
                                                            <RefreshCw size={16} />
                                                            To Drafts
                                                        </Button>
                                                    </>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
