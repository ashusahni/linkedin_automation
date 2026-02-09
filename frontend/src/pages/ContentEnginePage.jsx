import React, { useState, useEffect } from 'react';
import { Newspaper, Rss, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContentEnginePage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/sow/content/posts');
            const data = await res.json();
            setPosts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFetchNews = async () => {
        setLoading(true);
        try {
            await fetch('/api/sow/content/fetch', { method: 'POST' });
            await fetchPosts();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Content Engine</h1>
                <Button onClick={handleFetchNews} disabled={loading} className="flex gap-2">
                    <Rss className="w-4 h-4" />
                    Fetch & Generate
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.length === 0 && !loading && (
                    <div className="col-span-2 text-center p-12 text-muted-foreground border border-dashed rounded-lg">
                        No content generated yet. Click "Fetch & Generate" to start.
                    </div>
                )}

                {posts.map(post => (
                    <div key={post.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{post.status}</span>
                                <h3 className="font-semibold text-lg line-clamp-2 mt-2">{post.original_title}</h3>
                                <a href={post.source_url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
                                    <Newspaper className="w-3 h-3" /> Source
                                </a>
                            </div>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                            {post.ai_generated_content}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" className="w-full">Edit</Button>
                            <Button size="sm" className="w-full">Schedule</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
