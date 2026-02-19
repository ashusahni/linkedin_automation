import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Settings,
  Key,
  Linkedin,
  Webhook,
  ShieldCheck,
  Save,
  Copy,
  Check,
  AlertCircle,
  Server,
  Zap,
  Palette,
  User,
  Building2,
  Image,
  Loader2,
  Mail,
  Phone,
  Database,
  Trash2,
  Play,
  Pause,
  Share2,
  Search,
  Clock,
  Lock,
} from "lucide-react";
import PageGuide from "../components/PageGuide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "../components/ui/toast";

const SettingsPage = () => {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState({
    userName: "",
    companyName: "",
    logoUrl: "",
    profileImageUrl: "",
    theme: "default",
  });
  const [brandingSaving, setBrandingSaving] = useState(false);

  const [settings, setSettings] = useState({
    pbApiKey: "",
    liCookie: "",
    maxDailyInvites: 20,
    webhookUrl: `${window.location.origin.replace("5173", "5000")}/api/webhooks/phantombuster`,
    linkedinProfileUrl: "",
    preferredCompanyKeywords: "",
  });

  // 🆕 Contact scraping progress state
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [isScrapingActive, setIsScrapingActive] = useState(false);

  // 🆕 Phantom sync status state
  const [phantomStatuses, setPhantomStatuses] = useState({
    connections: { status: "idle", loading: false },
    search: { status: "idle", loading: false },
  });
  const [anyPhantomRunning, setAnyPhantomRunning] = useState(false);

  // 🆕 Unified Automated Sync state (persists in localStorage)
  const AUTO_SYNC_STORAGE_KEY = "autoContactSyncState_v1";
  const [autoSyncState, setAutoSyncState] = useState(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY)
          : null;
      if (!raw) {
        return {
          status: "idle", // idle | running | paused | cooldown
          phase: "idle", // idle | primary | explore | complete
          completedPhases: { primary: false, explore: false },
          lastRunCompletedAt: null,
          nextAvailableAt: null,
          pauseAfterCurrentPhase: false,
          autoRunEnabled: true,
        };
      }
      const parsed = JSON.parse(raw);
      return {
        status: parsed.status || "idle",
        phase: parsed.phase || "idle",
        completedPhases:
          parsed.completedPhases || {
            primary: false,
            explore: false,
          },
        lastRunCompletedAt: parsed.lastRunCompletedAt || null,
        nextAvailableAt: parsed.nextAvailableAt || null,
        pauseAfterCurrentPhase: !!parsed.pauseAfterCurrentPhase,
        autoRunEnabled:
          typeof parsed.autoRunEnabled === "boolean"
            ? parsed.autoRunEnabled
            : true,
      };
    } catch {
      return {
        status: "idle",
        phase: "idle",
        completedPhases: { primary: false, explore: false },
        lastRunCompletedAt: null,
        nextAvailableAt: null,
        pauseAfterCurrentPhase: false,
        autoRunEnabled: true,
      };
    }
  });
  const [countdownLabel, setCountdownLabel] = useState("");

  useEffect(() => {
    axios
      .get("/api/settings/branding")
      .then((r) => setBranding(r.data || {}))
      .catch(() => { });
  }, []);

  // Persist unified auto sync state
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          AUTO_SYNC_STORAGE_KEY,
          JSON.stringify(autoSyncState),
        );
      }
    } catch {
      // ignore persistence errors
    }
  }, [autoSyncState]);



  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get("/api/settings");
        const data = res.data || {};
        setSettings((prev) => ({
          ...prev,
          pbApiKey: data.phantombuster?.apiKey || "",
          liCookie: data.phantombuster?.linkedinSessionCookie || "",
          maxDailyInvites: data.safety?.maxDailyInvites ?? prev.maxDailyInvites,
          linkedinProfileUrl: data.preferences?.linkedinProfileUrl || "",
          preferredCompanyKeywords:
            data.preferences?.preferredCompanyKeywords || "",
        }));
      } catch (error) {
        console.error("Failed to load settings", error);
        addToast("Failed to load settings", "error");
      }
    };

    fetchSettings();
  }, [addToast]);

  // 🆕 Poll scraping progress every 5 seconds
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await axios.get("/api/scraper/global-progress");
        if (res.data.success) {
          setScrapingProgress(res.data.progress);
          setIsScrapingActive(res.data.progress.isActive);
        }
      } catch (error) {
        // Silently fail - don't spam errors
        setIsScrapingActive(false);
      }
    };

    // Fetch immediately
    fetchProgress();

    // Then poll every 5 seconds
    const interval = setInterval(fetchProgress, 5000);

    return () => clearInterval(interval);
  }, []);

  // 🆕 Poll phantom status every 5 seconds
  useEffect(() => {
    const fetchPhantomStatus = async () => {
      try {
        const res = await axios.get("/api/phantom/status-check");
        if (res.data.success) {
          setPhantomStatuses((prev) => ({
            connections: {
              ...prev.connections,
              status: res.data.statuses.connections?.status || "idle",
            },
            search: {
              ...prev.search,
              status: res.data.statuses.search?.status || "idle",
            },
          }));
          setAnyPhantomRunning(res.data.anyRunning);
        }
      } catch (error) {
        // Silently fail - don't spam errors
        console.warn("Failed to fetch phantom status:", error);
      }
    };

    // Fetch immediately
    fetchPhantomStatus();

    // Then poll every 5 seconds
    const interval = setInterval(fetchPhantomStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const saveBranding = () => {
    setBrandingSaving(true);
    axios
      .put("/api/settings/branding", branding)
      .then(() => {
        addToast(
          "Branding saved. Refresh to see welcome and theme.",
          "success",
        );
      })
      .catch(() => addToast("Failed to save branding", "error"))
      .finally(() => setBrandingSaving(false));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(settings.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const payload = {
        phantombuster: {
          apiKey: settings.pbApiKey,
          linkedinSessionCookie: settings.liCookie,
        },
        safety: {
          maxDailyInvites: settings.maxDailyInvites,
        },
        preferences: {
          linkedinProfileUrl: settings.linkedinProfileUrl,
          preferredCompanyKeywords: settings.preferredCompanyKeywords,
        },
      };

      await axios.put("/api/settings", payload);
      addToast("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Failed to save settings", error);
      const message =
        error.response?.data?.error ||
        error.message ||
        "Failed to save settings";
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopScraping = async () => {
    try {
      const res = await axios.post("/api/scraper/stop-scraping");
      addToast(res.data.message, "info");
    } catch (error) {
      addToast("Failed to stop process", "error");
    }
  };

  const [isTriggering, setIsTriggering] = useState(false);
  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      const res = await axios.post("/api/scraper/scrape-contacts");
      if (res.data.success) {
        addToast(res.data.message, "success");
      }
    } catch (error) {
      addToast("Failed to start process", "error");
    } finally {
      setIsTriggering(false);
    }
  };

  const toggleAutoRunEnabled = () => {
    setAutoSyncState((prev) => ({
      ...prev,
      autoRunEnabled: !prev.autoRunEnabled,
    }));
  };

  // 🆕 Helpers to run primary and explore syncs sequentially
  const runPrimaryNetworkSync = async () => {
    if (anyPhantomRunning) {
      throw new Error(
        "Another sync is currently running. Please wait until it completes.",
      );
    }

    setPhantomStatuses((prev) => ({
      ...prev,
      connections: { ...prev.connections, status: "running", loading: true },
    }));

    try {
      const res = await axios.post(
        "/api/phantom/export-connections-complete",
        {},
        { timeout: 180000 },
      );
      if (!res.data?.success) {
        throw new Error(res.data?.error || "Failed to sync primary network");
      }

      setPhantomStatuses((prev) => ({
        ...prev,
        connections: { ...prev.connections, status: "idle", loading: false },
      }));

      addToast(
        `✅ Primary Network Sync completed. ${res.data.totalLeads || 0} leads processed.`,
        "success",
      );

      return res.data;
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to sync primary network";
      setPhantomStatuses((prev) => ({
        ...prev,
        connections: { ...prev.connections, status: "error", loading: false },
      }));
      throw new Error(errorMsg);
    }
  };

  const runExploreBeyondSync = async () => {
    if (anyPhantomRunning) {
      throw new Error(
        "Another sync is currently running. Please wait until it completes.",
      );
    }

    setPhantomStatuses((prev) => ({
      ...prev,
      search: { ...prev.search, status: "running", loading: true },
    }));

    try {
      const res = await axios.post(
        "/api/phantom/search-leads-complete",
        {},
        { timeout: 180000 },
      );
      if (!res.data?.success) {
        throw new Error(
          res.data?.error || "Failed to explore beyond your network",
        );
      }

      setPhantomStatuses((prev) => ({
        ...prev,
        search: { ...prev.search, status: "idle", loading: false },
      }));

      addToast(
        `✅ Explore Beyond My Network completed. ${res.data.totalLeads || 0} leads processed.`,
        "success",
      );

      return res.data;
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to explore beyond your network";
      setPhantomStatuses((prev) => ({
        ...prev,
        search: { ...prev.search, status: "error", loading: false },
      }));
      throw new Error(errorMsg);
    }
  };

  // Unified auto-sync runner with pause-after-phase & 24h lock
  const startOrResumeAutoSync = async () => {
    if (autoSyncState.status === "cooldown") {
      return;
    }
    if (anyPhantomRunning) {
      addToast(
        "Another sync is currently running. Please wait until it completes.",
        "warning",
      );
      return;
    }

    // Determine which phases are already completed in this run
    let state = autoSyncState;
    if (state.status === "idle") {
      state = {
        status: "running",
        phase: "primary",
        completedPhases: { primary: false, explore: false },
        lastRunCompletedAt: null,
        nextAvailableAt: null,
        pauseAfterCurrentPhase: false,
      };
      setAutoSyncState(state);
    } else if (state.status === "paused") {
      setAutoSyncState((prev) => ({
        ...prev,
        status: "running",
        pauseAfterCurrentPhase: false,
      }));
    } else if (state.status !== "running") {
      setAutoSyncState((prev) => ({ ...prev, status: "running" }));
    }

    try {
      // Phase 1: Primary Network
      if (!state.completedPhases.primary) {
        setAutoSyncState((prev) => ({
          ...prev,
          status: "running",
          phase: "primary",
        }));

        await runPrimaryNetworkSync();

        const updatedAfterPrimary = {
          ...state,
          status: "running",
          phase: "primary",
          completedPhases: { ...state.completedPhases, primary: true },
        };
        state = updatedAfterPrimary;
        setAutoSyncState((prev) => ({
          ...prev,
          phase: "primary",
          completedPhases: { ...prev.completedPhases, primary: true },
        }));

        if (state.pauseAfterCurrentPhase) {
          setAutoSyncState((prev) => ({
            ...prev,
            status: "paused",
          }));
          return;
        }
      }

      // Phase 2: Explore Beyond My Network
      if (!state.completedPhases.explore) {
        setAutoSyncState((prev) => ({
          ...prev,
          status: "running",
          phase: "explore",
        }));

        await runExploreBeyondSync();

        const completedAt = Date.now();
        const nextAvailableAt = completedAt + 24 * 60 * 60 * 1000;

        setAutoSyncState((prev) => ({
          ...prev,
          status: "cooldown",
          phase: "complete",
          completedPhases: { primary: true, explore: true },
          lastRunCompletedAt: completedAt,
          nextAvailableAt,
          pauseAfterCurrentPhase: false,
        }));

        addToast(
          "Automated Contact Sync completed. Locked for 24 hours.",
          "info",
        );
        return;
      }
    } catch (error) {
      addToast(error.message || "Automated sync failed.", "error");
      setAutoSyncState((prev) => ({
        ...prev,
        status: "idle",
        phase: "idle",
        pauseAfterCurrentPhase: false,
      }));
    }
  };

  const handleUnifiedSyncButtonClick = () => {
    if (autoSyncState.status === "cooldown") {
      return;
    }

    // Running → request pause after current phase
    if (autoSyncState.status === "running") {
      setAutoSyncState((prev) => ({
        ...prev,
        pauseAfterCurrentPhase: true,
      }));
      addToast("Will pause after the current phase finishes.", "info");
      return;
    }

    // Idle or paused → (re)start / resume
    startOrResumeAutoSync();
  };

  // 🆕 Slide Toggle Handler
  const handleUnifiedSyncToggle = () => {
    if (autoSyncState.status === "cooldown") {
      // Just toggle the preference, don't change status
      toggleAutoRunEnabled();
      return;
    }

    if (autoSyncState.status === "running") {
      // Turning OFF while running -> Request Pause
      if (autoSyncState.autoRunEnabled) {
        setAutoSyncState(prev => ({ ...prev, autoRunEnabled: false, pauseAfterCurrentPhase: true }));
        addToast("Sync will pause after current phase", "info");
      } else {
        // Wont happen usually if button shows state, but if UI desyncs:
        setAutoSyncState(prev => ({ ...prev, autoRunEnabled: true, pauseAfterCurrentPhase: false }));
      }
      return;
    }

    // Idle or Paused
    if (autoSyncState.autoRunEnabled) {
      // Turning OFF
      setAutoSyncState(prev => ({ ...prev, autoRunEnabled: false }));
    } else {
      // Turning ON -> Start
      setAutoSyncState(prev => ({ ...prev, autoRunEnabled: true }));
      // Slight delay to ensure state update propagates if needed, or just call directly (async state inside won't reflect immediately but logic handles it)
      startOrResumeAutoSync();
    }
  };

  // 🆕 Countdown effect moved here to access startOrResumeAutoSync
  useEffect(() => {
    if (!autoSyncState.nextAvailableAt || autoSyncState.status !== "cooldown") {
      setCountdownLabel("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remainingMs = autoSyncState.nextAvailableAt - now;
      if (remainingMs <= 0) {
        // Unlock after 24h
        setAutoSyncState((prev) => ({
          ...prev,
          status: "idle",
          phase: "idle",
          completedPhases: { primary: false, explore: false },
          nextAvailableAt: null,
          pauseAfterCurrentPhase: false,
        }));
        setCountdownLabel("");

        // AUTO-START logic: If autoRunEnabled is true, start the next cycle immediately
        if (autoSyncState.autoRunEnabled) {
          setTimeout(() => {
            startOrResumeAutoSync();
          }, 1000);
        }
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setCountdownLabel(parts.join(" "));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [autoSyncState.nextAvailableAt, autoSyncState.status, setAutoSyncState, autoSyncState.autoRunEnabled]);

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const handleDeleteAllLeads = async () => {
    // Double confirmation for safety
    const firstConfirm = window.confirm(
      "⚠️ WARNING: This will PERMANENTLY delete ALL leads from the database.\n\n" +
      "This includes:\n" +
      "- All leads (qualified, review, rejected, imported)\n" +
      "- All lead enrichment data\n" +
      "- All campaign associations\n\n" +
      "This action CANNOT be undone!\n\n" +
      "Are you absolutely sure you want to proceed?",
    );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.prompt(
      'Type "DELETE ALL" to confirm deletion of all leads:',
    );

    if (secondConfirm !== "DELETE ALL") {
      addToast(
        'Deletion cancelled. You must type "DELETE ALL" to confirm.',
        "warning",
      );
      return;
    }

    try {
      setIsDeletingAll(true);
      const res = await axios.delete("/api/leads/all?confirm=true");
      addToast(
        `✅ Successfully deleted ${res.data.deleted || 0} leads and all related data`,
        "success",
      );
    } catch (error) {
      console.error("Failed to delete all leads:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to delete all leads";
      addToast(`Error: ${errorMsg}`, "error");
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your API integrations, security limits, and automation
          parameters.
        </p>
      </div>

      {/* 🆕 Contact Scraping Progress Bar */}
      {isScrapingActive && scrapingProgress && (
        <Card className="border-blue-500/50 bg-blue-500/5 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium">
                  Enriching Contacts in Background
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-red-500/50 text-red-500 hover:bg-red-500/10"
                  onClick={handleStopScraping}
                >
                  Stop
                </Button>
                <div className="flex items-center gap-4 text-xs text-muted-foreground ml-2">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>
                      {scrapingProgress.processedProfiles} /{" "}
                      {scrapingProgress.totalProfiles}
                    </span>
                  </div>
                  <span className="font-semibold text-blue-600">
                    {scrapingProgress.progressPercentage}%
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${scrapingProgress.progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex justify-between">
              <span>
                {scrapingProgress.activeJobsCount} active task
                {scrapingProgress.activeJobsCount !== 1 ? "s" : ""} running
              </span>
              <span>
                ETA:{" "}
                {Math.ceil(
                  ((scrapingProgress.totalProfiles -
                    scrapingProgress.processedProfiles) *
                    5) /
                  60,
                )}{" "}
                mins
              </span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* 🆕 Automated Contact Sync Section – single slide control */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Automated Contact Sync
          </CardTitle>
          <CardDescription>
            One-touch sync that runs your full contact pipeline, then locks
            itself for 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {/* Slim Slide-Toggle UI */}
            {/* Slim Slide-Toggle UI */}
            <div className={`relative w-full max-w-6xl overflow-hidden rounded-xl border transition-all duration-500 ${autoSyncState.status === "running"
              ? "border-cyan-500/50 bg-cyan-950/10 shadow-[0_0_30px_-10px_rgba(6,182,212,0.3)]"
              : autoSyncState.status === "cooldown"
                ? "border-blue-500/30 bg-blue-950/10"
                : "border-border/50 bg-card/40 hover:border-primary/30"
              }`}>

              {/* Animated Background Mesh */}
              {autoSyncState.status === "running" && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(6,182,212,0.1),transparent_70%)] animate-pulse" />
              )}

              <div className="relative flex flex-col md:flex-row items-center justify-between px-6 py-5 gap-4">
                {/* Left: Indicator & Status */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-sm transition-all ${autoSyncState.status === "running"
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-cyan-500/20 backdrop-blur-sm"
                    : autoSyncState.status === "cooldown"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-muted/50 text-muted-foreground border-border/50"
                    }`}>
                    {autoSyncState.status === "running" ? (
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    ) : autoSyncState.status === "cooldown" ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Share2 className="h-6 w-6" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-base font-semibold tracking-tight ${autoSyncState.status === "running" ? "text-cyan-400" : "text-foreground"
                      }`}>
                      {autoSyncState.status === "running"
                        ? (autoSyncState.phase === "primary" ? "1. Syncing 1st Connections..." : "2. Syncing Other Connections...")
                        : autoSyncState.status === "cooldown"
                          ? "Sync Complete (Locked for 24h)"
                          : "Automated Contact Sync"
                      }
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {autoSyncState.status === "running"
                        ? "Processing your contact pipeline..."
                        : autoSyncState.status === "cooldown"
                          ? "System is resting. Next run is auto-scheduled."
                          : "Press the toggle to start the 24h cycle."
                      }
                    </span>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  {/* Clock / Timer Info */}
                  {(autoSyncState.status === "cooldown" || autoSyncState.status === "running") && (
                    <div className="flex flex-col items-end text-right mr-2">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {autoSyncState.status === "running"
                          ? "Active"
                          : countdownLabel || "24h Lock"
                        }
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                        {autoSyncState.status === "running" ? "Do not close" : "Cooldown"}
                      </span>
                    </div>
                  )}

                  {/* Labeled Switch Toggle */}
                  {/* Custom Slide Toggle */}
                  <div
                    onClick={handleUnifiedSyncToggle}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <div className={`relative flex h-10 w-36 items-center rounded-full border-2 transition-all duration-500 ${autoSyncState.autoRunEnabled
                      ? "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)] backdrop-blur-sm"
                      : "border-muted-foreground/20 bg-muted/20 hover:border-muted-foreground/40"
                      }`}>
                      {/* Slider Knob */}
                      <div className={`absolute top-1 bottom-1 w-[55%] rounded-full shadow-lg transition-all duration-500 flex items-center justify-center gap-2 ${autoSyncState.autoRunEnabled
                        ? "left-[42%] bg-cyan-500 text-white shadow-cyan-500/25"
                        : "left-1 bg-white dark:bg-zinc-800 text-muted-foreground border border-black/5"
                        }`}>
                        {autoSyncState.autoRunEnabled ? (
                          <>
                            <span className="text-[10px] font-bold tracking-wider uppercase">Active</span>
                            <Play className="h-3 w-3 fill-current" />
                          </>
                        ) : (
                          <>
                            <Pause className="h-3 w-3 fill-current" />
                            <span className="text-[10px] font-bold tracking-wider uppercase">Paused</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Progress Line */}
              {(autoSyncState.status === "running" || autoSyncState.status === "cooldown") && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-muted/30">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    style={{
                      width: autoSyncState.status === "cooldown" ? "100%" :
                        autoSyncState.phase === "primary" ? "45%" : "85%"
                    }}
                  />
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-[10px] text-muted-foreground/60 max-w-lg mx-auto">
                Toggle ON to run contact sync automatically every 24 hours. Slide OFF to pause.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Branding / Welcome & Theme */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Branding & Welcome
            </CardTitle>
            <CardDescription>
              Personalize the dashboard welcome message, logo, profile image,
              and theme colors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name" className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Display name (e.g. Rishab)
                </Label>
                <Input
                  id="user-name"
                  placeholder="Rishab"
                  value={branding.userName}
                  onChange={(e) =>
                    setBranding({ ...branding, userName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="company-name"
                  className="flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" /> Company name (e.g. Scottish
                  Chemicals)
                </Label>
                <Input
                  id="company-name"
                  placeholder="Scottish Chemicals"
                  value={branding.companyName}
                  onChange={(e) =>
                    setBranding({ ...branding, companyName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logo-url" className="flex items-center gap-2">
                  <Image className="w-4 h-4" /> Logo URL
                </Label>
                <Input
                  id="logo-url"
                  type="url"
                  placeholder="https://..."
                  value={branding.logoUrl}
                  onChange={(e) =>
                    setBranding({ ...branding, logoUrl: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="profile-url"
                  className="flex items-center gap-2"
                >
                  <Image className="w-4 h-4" /> Profile image URL
                </Label>
                <Input
                  id="profile-url"
                  type="url"
                  placeholder="https://..."
                  value={branding.profileImageUrl}
                  onChange={(e) =>
                    setBranding({
                      ...branding,
                      profileImageUrl: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Theme color</Label>
              <div className="flex flex-wrap gap-2">
                {["default", "blue", "green", "violet"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBranding({ ...branding, theme: t })}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${branding.theme === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={saveBranding}
              disabled={brandingSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" /> Save branding
            </Button>
          </CardFooter>
        </Card>

        {/* Integration Credentials */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Integration Credentials
            </CardTitle>
            <CardDescription>
              Your credentials for External Data Source and LinkedIn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pb-key">Data Source API Key</Label>
              <div className="relative">
                <Input
                  id="pb-key"
                  type="password"
                  value={settings.pbApiKey}
                  onChange={(e) =>
                    setSettings({ ...settings, pbApiKey: e.target.value })
                  }
                  className="pr-10"
                />
                <Key className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="li-cookie">LinkedIn Session Cookie (li_at)</Label>
              <div className="relative">
                <Input
                  id="li-cookie"
                  type="password"
                  value={settings.liCookie}
                  onChange={(e) =>
                    setSettings({ ...settings, liCookie: e.target.value })
                  }
                  className="pr-10"
                />
                <Linkedin className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Never share your session cookie. It expires every few months.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn Preferences */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-primary" />
              LinkedIn Preferences
            </CardTitle>
            <CardDescription>
              Store your profile URL and preferred companies so lead views can
              prioritize relevant contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="li-profile" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4" /> LinkedIn profile URL
              </Label>
              <Input
                id="li-profile"
                type="url"
                placeholder="https://www.linkedin.com/in/your-profile/"
                value={settings.linkedinProfileUrl}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    linkedinProfileUrl: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="preferred-companies"
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" /> Preferred companies (comma
                separated)
              </Label>
              <Input
                id="preferred-companies"
                placeholder="e.g. Your Company, Partner Co, Target Accounts"
                value={settings.preferredCompanyKeywords}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preferredCompanyKeywords: e.target.value,
                  })
                }
              />
              <p className="text-[10px] text-muted-foreground">
                These names help the Leads page surface contacts related to you
                and your company at the top.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-blue-500" />
              Webhook Integration
            </CardTitle>
            <CardDescription>
              Paste this URL into your Data Source dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={settings.webhookUrl}
                  className="bg-muted/50 font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">How to use:</p>
                <p>
                  Go to your Data Source settings &gt; Webhooks &gt; Paste this
                  URL. This allows the CRM to update lead status in real-time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safety Limits */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Account Safety
            </CardTitle>
            <CardDescription>
              Respect LinkedIn limits to prevent account flags.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Max Connection Requests / Day</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={settings.maxDailyInvites}
                  className="w-24"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxDailyInvites: parseInt(e.target.value),
                    })
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Recommended: 20-30
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warm-up Mode</Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                Gradually increase activity for new accounts (Coming Soon)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm font-medium">Backend Service</span>
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm font-medium">PostgreSQL Database</span>
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Data Source API</span>
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Verified
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full gap-2"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Configuration
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/50 bg-red-500/5 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600/80 dark:text-red-400/80">
              Irreversible and destructive actions. Use with extreme caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                    Delete All Leads
                  </h4>
                  <p className="text-xs text-red-700/80 dark:text-red-300/80 mb-3">
                    This will permanently delete <strong>ALL</strong> leads from
                    the database, including:
                  </p>
                  <ul className="text-xs text-red-700/80 dark:text-red-300/80 list-disc list-inside space-y-1 mb-3">
                    <li>All leads (qualified, review, rejected, imported)</li>
                    <li>All lead enrichment data</li>
                    <li>All campaign associations</li>
                  </ul>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                    ⚠️ This action CANNOT be undone!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleDeleteAllLeads}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete All Leads
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <PageGuide pageKey="settings" />
    </div>
  );
};

export default SettingsPage;
