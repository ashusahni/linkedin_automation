import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Users, Megaphone, Settings, Menu, FileText, Newspaper, Search, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { ScottishChemicalIcon } from '../ui/ScottishChemicalLogo';
import NotificationDropdown from '../NotificationDropdown';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { TimeFilterProvider } from '../../context/TimeFilterContext';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    // Temporarily hidden: Contact Search tab (not deleted, just hidden)
    // { id: 'search', label: 'Contact Search', icon: Search, path: '/search' },
    {
        id: 'leads',
        label: 'Contacts',
        icon: Users,
        path: '/leads',
        children: [
            { id: 'my-contacts', label: 'My Contacts', path: '/leads?connection_degree=1st' },
            { id: 'prospects', label: 'Prospects', path: '/leads?connection_degree=2nd' },
        ]
    },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone, path: '/campaigns' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function DashboardLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedItems, setExpandedItems] = useState({});
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
        <TimeFilterProvider>
            <div className="min-h-screen bg-background flex font-sans text-foreground">
                {/* Sidebar */}
                <aside
                    className={cn(
                        "bg-card border-r border-border transition-all duration-300 flex flex-col fixed h-full z-20",
                        sidebarOpen ? "w-64" : "w-20"
                    )}
                >
                    {/* Logo */}
                    <div className="h-20 flex items-center px-6 border-b border-border overflow-hidden">
                        {branding.logoUrl ? (
                            <div className="flex items-center w-full">
                                <img
                                    src={branding.logoUrl}
                                    alt="Scottish Chemical Industries"
                                    className={cn(
                                        "h-14 w-auto object-contain transition-all duration-300",
                                        sidebarOpen ? "max-w-[200px]" : "max-w-[40px]"
                                    )}
                                />
                            </div>
                        ) : (
                            <>
                                <ScottishChemicalIcon className="w-10 h-10 mr-4 shadow-xl" />
                                {sidebarOpen && (
                                    <div className="flex flex-col justify-center">
                                        <span className="font-extrabold text-sm uppercase tracking-wider text-foreground leading-none">
                                            Scottish Chemical
                                        </span>
                                        <span className="font-bold text-lg text-primary tracking-tight leading-none mt-1">
                                            Industries
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => {
                            // Check if it has children (Nested Sidebar Item)
                            if (item.children) {
                                const isParentActive = location.pathname.startsWith(item.path);
                                // Auto-expand if on a child route, BUT allow manual toggle override
                                // If user has explicitly toggled (true/false), use that state.
                                // If undefined (initial load), default to isParentActive.
                                const isExpanded = expandedItems[item.id] !== undefined ? expandedItems[item.id] : isParentActive;

                                return (
                                    <div key={item.id} className="w-full flex flex-col gap-1">
                                        <NavLink
                                            to={item.path}
                                            onClick={(e) => {
                                                // Determine current effective state (same logic as above)
                                                // We need to calculate this at the moment of click to toggle correctly
                                                const currentlyExpanded = expandedItems[item.id] !== undefined ? expandedItems[item.id] : isParentActive;

                                                // Toggle the state
                                                setExpandedItems(prev => ({ ...prev, [item.id]: !currentlyExpanded }));
                                            }}
                                            className={({ isActive }) =>
                                                cn(
                                                    "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                                                )
                                            }
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-5 h-5 min-w-[20px]" />
                                                {sidebarOpen && <span className="font-medium">{item.label}</span>}
                                            </div>
                                            {sidebarOpen && (
                                                <ChevronDown
                                                    className={cn(
                                                        "w-4 h-4 opacity-70 transition-transform duration-200",
                                                        isExpanded ? "transform rotate-180" : ""
                                                    )}
                                                />
                                            )}

                                            {!sidebarOpen && (
                                                <div className="absolute left-full ml-2 w-max px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    {item.label}
                                                </div>
                                            )}
                                        </NavLink>

                                        {/* Nested Children (only visible when sidebar is open AND expanded) */}
                                        {sidebarOpen && isExpanded && (
                                            <div className="flex flex-col gap-0.5 ml-4 border-l-2 border-border/40 pl-2 mt-1 transition-all animate-in fade-in slide-in-from-top-1">
                                                {item.children.map((child) => {
                                                    const searchParams = new URLSearchParams(location.search);
                                                    // Check active state by matching exact path + query
                                                    // We can simply compare full path, but location.search order might vary?
                                                    // For robustness, check pathname and specific param.

                                                    let isActive = false;
                                                    const childPath = child.path.split('?')[0];
                                                    const childQuery = new URLSearchParams(child.path.split('?')[1]);

                                                    if (location.pathname === childPath) {
                                                        const currentDegree = searchParams.get('connection_degree');
                                                        const targetDegree = childQuery.get('connection_degree');
                                                        isActive = currentDegree === targetDegree;
                                                    }

                                                    return (
                                                        <NavLink
                                                            key={child.id}
                                                            to={child.path}
                                                            className={cn(
                                                                "w-full flex items-center px-4 py-2 text-sm rounded-md transition-colors duration-200",
                                                                isActive
                                                                    ? "text-primary font-medium bg-primary/10"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                                            )}
                                                        >
                                                            {child.label}
                                                        </NavLink>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Standard Item
                            return (
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
                            );
                        })}
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
                                    <p className="text-xs text-muted-foreground truncate">{branding.companyName || 'Scottish Chemical Industries'}</p>
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
                    <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                            {!sidebarOpen && branding.logoUrl && (
                                <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain md:hidden" />
                            )}
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
                                            "Search, lead generation & campaign analytics"
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <NotificationDropdown />
                        </div>
                    </header>

                    {/* Content Area */}
                    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </TimeFilterProvider>
    );
}
