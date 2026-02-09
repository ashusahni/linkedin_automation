import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Users, Megaphone, Settings, Menu, Bell, FileText, Newspaper, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScottishChemicalIcon } from '../ui/ScottishChemicalLogo';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'search', label: 'Lead Search', icon: Search, path: '/search' },
    { id: 'leads', label: 'Leads', icon: Users, path: '/leads' },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone, path: '/campaigns' },
    { id: 'content', label: 'Content Engine', icon: Newspaper, path: '/content' },
    { id: 'imports', label: 'Imports', icon: FileText, path: '/imports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [branding, setBranding] = useState({ userName: '', companyName: '', logoUrl: '', profileImageUrl: '', theme: 'default', linkedinAccountName: '' });

    useEffect(() => {
        axios.get('/api/settings/branding').then((r) => setBranding(r.data || {})).catch(() => { });
    }, []);

    useEffect(() => {
        const theme = branding.theme && branding.theme !== 'default' ? branding.theme : '';
        document.documentElement.setAttribute('data-theme', theme);
        return () => document.documentElement.removeAttribute('data-theme');
    }, [branding.theme]);

    const displayName = branding.userName || branding.companyName || 'there';

    // Generate initials: first letter of first name + first letter of last name
    // e.g., "Ashu Sahni" -> "AS", "Shane" -> "S"
    const getInitials = (name) => {
        if (!name || name === 'there') return 'JD';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            // Single name: just first letter (e.g., "Shane" -> "S")
            return parts[0][0].toUpperCase();
        }
        // Multiple names: first letter of first + first letter of last (e.g., "Ashu Sahni" -> "AS")
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const initials = getInitials(branding.userName || branding.companyName);

    return (
        <div className="min-h-screen bg-background flex font-sans text-foreground">
            {/* Sidebar */}
            <aside
                className={cn(
                    "bg-card border-r border-border transition-all duration-300 flex flex-col fixed h-full z-20",
                    sidebarOpen ? "w-64" : "w-20"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-border">
                    {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto max-w-[140px] object-contain mr-3" />
                    ) : (
                        <ScottishChemicalIcon className="w-8 h-8 mr-3 shadow-lg" />
                    )}
                    {sidebarOpen && !branding.logoUrl && (
                        <span className="font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-emerald-600 dark:from-slate-200 dark:to-emerald-400">
                            Scottish Chemical
                        </span>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                )
                            }
                        >
                            <item.icon className="w-5 h-5 min-w-[20px]" />
                            {sidebarOpen && <span className="font-medium">{item.label}</span>}
                            {!sidebarOpen && (
                                <div className="absolute left-full ml-2 w-max px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Info / Footer */}
                <div className="p-4 border-t border-border">
                    <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
                        {branding.profileImageUrl ? (
                            <img src={branding.profileImageUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                                {initials}
                            </div>
                        )}
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{displayName}</p>
                                <p className="text-xs text-muted-foreground truncate">{branding.companyName || 'Scottish Chemical'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300 flex flex-col",
                    sidebarOpen ? "ml-64" : "ml-20"
                )}
            >
                {/* Header: welcome + menu */}
                <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                        <div className="hidden sm:flex items-center gap-3">
                            {branding.profileImageUrl ? (
                                <img src={branding.profileImageUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-border" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                                    {initials}
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Welcome, {displayName}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {branding.linkedinAccountName ? (
                                        <span className="flex items-center gap-1">
                                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                            LinkedIn: {branding.linkedinAccountName}
                                        </span>
                                    ) : (
                                        "Here's your overview"
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
                        </Button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
