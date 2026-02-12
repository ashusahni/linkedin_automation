import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Info, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const guides = {
  dashboard: {
    title: "Dashboard Overview",
    description: "Monitor your lead generation progress, campaign performance, and network distribution in one place. Apply preferences to prioritize the best matches.",
    nextPage: {
      name: "Lead Search",
      path: "/search",
      info: "Start finding new prospects across LinkedIn using keyword-based search and automated import tools."
    }
  },
  search: {
    title: "Lead Search Guide",
    description: "Search for new leads using LinkedIn keywords. Use the External Data Source to pull profiles directly into your database for review.",
    nextPage: {
      name: "Leads Management",
      path: "/leads",
      info: "Organize, filter, and review the leads you've imported to select the best candidates for your campaigns."
    }
  },
  leads: {
    title: "Leads Management Guide",
    description: "Manage and review all your imported leads. Bulk approve or reject, filter by industry or quality, and prepare them for outreach campaigns.",
    nextPage: {
      name: "Campaigns",
      path: "/campaigns",
      info: "Design outreach sequences, send personalized messages, and track engagement with your selected leads."
    }
  },
  campaigns: {
    title: "Campaigns Guide",
    description: "Create and manage your outreach campaigns. Track sent messages, replies, and overall engagement to optimize your LinkedIn automation strategy.",
    nextPage: {
      name: "Settings",
      path: "/settings",
      info: "Configure your profile, API keys, and system preferences to ensure smooth operation of your automation."
    }
  },
  settings: {
    title: "Settings Guide",
    description: "Configure your LinkedIn account details, preferences, and system integrations. Customize themes and branding to match your company style.",
    nextPage: {
      name: "Dashboard",
      path: "/",
      info: "Return to your main command center to see the impact of your configurations on your overall growth."
    }
  }
};

export default function PageGuide({ pageKey }) {
  const guide = guides[pageKey];
  const navigate = useNavigate();

  if (!guide) return null;

  return (
    <div className="mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Card className="bg-primary/5 border-primary/20 overflow-hidden relative group transition-all hover:border-primary/40">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <HelpCircle className="h-24 w-24 text-primary rotate-12" />
        </div>

        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-semibold">
                <Info className="h-5 w-5" />
                <span>{guide.title}</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                {guide.description}
              </p>
            </div>

            <div className="w-px h-12 bg-primary/10 hidden md:block" />

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">Coming Up Next</p>
                <h4 className="font-semibold text-foreground text-sm">{guide.nextPage.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {guide.nextPage.info}
                </p>
              </div>

              <Button
                onClick={() => navigate(guide.nextPage.path)}
                variant="default"
                size="sm"
                className="gap-2 group/btn"
              >
                Go to {guide.nextPage.name}
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-50">
        <span className="h-px w-12 bg-border" />
        End of {pageKey} section
        <span className="h-px w-12 bg-border" />
      </div>
    </div>
  );
}
