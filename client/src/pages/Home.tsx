import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  KeyRound,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Network,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type View = "workspace" | "memory" | "files" | "settings";

const viewItems: { id: View; label: string; icon: typeof Activity }[] = [
  { id: "workspace", label: "Workspace", icon: Activity },
  { id: "memory", label: "Memory vault", icon: BrainCircuit },
  { id: "files", label: "File manifest", icon: FolderOpen },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status: string) {
  if (status === "COMPLETED")
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  if (status === "FAILED")
    return "border-rose-400/25 bg-rose-400/10 text-rose-300";
  return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
}

function taskIcon(status: string) {
  if (status === "COMPLETED")
    return <CheckCircle2 className="size-4 text-emerald-300" />;
  if (status === "FAILED") return <XCircle className="size-4 text-rose-300" />;
  return <Loader2 className="size-4 animate-spin text-cyan-300" />;
}

function LocalLogin() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/local-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      window.location.reload();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Sign-in failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-5 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl"
      >
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-cyan-300/10">
          <LockKeyhole className="size-6 text-cyan-200" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
          Ryze · local computer
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Unlock your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Enter the owner password you set during installation. This local app
          is available only on this computer.
        </p>
        <label
          htmlFor="local-owner-password"
          className="mt-7 block text-sm font-medium text-slate-200"
        >
          Owner password
        </label>
        <Input
          id="local-owner-password"
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          className="mt-2 h-12 border-white/10 bg-slate-950/70"
          required
          minLength={6}
          maxLength={1024}
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={busy || password.length < 6}
          className="mt-5 h-12 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
        >
          {busy ? "Checking…" : "Unlock locally"}
        </Button>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          Six characters are accepted, but a six-digit PIN is easier to guess.
          Prefer a longer passphrase. Use the app through its localhost address;
          do not expose this port to your network.
        </p>
      </form>
    </main>
  );
}

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.ryze.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 2200,
  });
  const exportQuery = trpc.ryze.exportData.useQuery(undefined, {
    enabled: false,
  });
  const [activeView, setActiveView] = useState<View>("workspace");
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [telegramCode, setTelegramCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState({
    provider: "local-demo" as
      | "local-demo"
      | "ollama-ready"
      | "external-disabled",
    ryzeModel: "ryze-safe-demo",
    nerdModel: "nerd-safe-demo",
    demoMode: true,
  });
  const uploadInput = useRef<HTMLInputElement>(null);
  const localBuild = import.meta.env.VITE_LOCAL_MODE === "true";
  const integrationStatus = trpc.ryze.integrationStatus.useQuery(undefined, {
    enabled: localBuild && isAuthenticated,
    refetchInterval: 10000,
  });
  const chatConfigured = Boolean(
    integrationStatus.data &&
      integrationStatus.data.freeLlmApi !== "not_configured"
  );
  const telegramControl = trpc.ryze.telegramControl.useQuery(undefined, {
    enabled: localBuild && isAuthenticated,
    refetchInterval: 5000,
  });
  const saveTelegramAccount = trpc.ryze.saveTelegramAccount.useMutation({
    onSuccess: () => void telegramControl.refetch(),
    onError: error => toast.error(error.message),
  });
  const removeTelegramAccount = trpc.ryze.removeTelegramAccount.useMutation({
    onSuccess: () => { void telegramControl.refetch(); toast.success("Telegram account removed from Ryze control."); },
    onError: error => toast.error(error.message),
  });
  const setTelegramAdmin = trpc.ryze.setTelegramAdminUserId.useMutation({
    onSuccess: () => { void telegramControl.refetch(); toast.success("Telegram admin ID updated."); },
    onError: error => toast.error(error.message),
  });
  const issueTelegramCode = trpc.ryze.issueTelegramSecretCode.useMutation({
    onSuccess: result => { void telegramControl.refetch(); setTelegramCode({ code: result.code, expiresAt: String(result.expiresAt) }); toast.success("One-time code generated locally."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!activeSessionId && data?.sessions[0])
      setActiveSessionId(data.sessions[0].id);
  }, [activeSessionId, data?.sessions]);

  useEffect(() => {
    if (data?.settings) {
      setSettings({
        provider: data.settings.provider as
          | "local-demo"
          | "ollama-ready"
          | "external-disabled",
        ryzeModel: data.settings.ryzeModel,
        nerdModel: data.settings.nerdModel,
        demoMode: data.settings.demoMode,
      });
    }
  }, [data?.settings]);

  const refresh = () => utils.ryze.dashboard.invalidate();
  const submitTask = trpc.ryze.submitTask.useMutation({
    onSuccess: async result => {
      setPrompt("");
      await refresh();
      if (!result.success)
        toast.error(
          "The task failed or was blocked. Review its status and logs."
        );
      else
        toast.success(
          result.mode === "opencode"
            ? "OpenCode replied through FreeLLMAPI."
            : "Ryze completed the safe local demo workflow."
        );
    },
    onError: mutationError => toast.error(mutationError.message),
  });
  const createSession = trpc.ryze.createSession.useMutation({
    onSuccess: async session => {
      setActiveSessionId(session.id);
      await refresh();
      toast.success("New sandbox session created.");
    },
  });
  const upload = trpc.ryze.upload.useMutation({
    onSuccess: async file => {
      await refresh();
      toast.success(
        `${file.originalName} added to the portable file manifest.`
      );
    },
    onError: mutationError => toast.error(mutationError.message),
  });
  const operationalBaseline = trpc.ryze.operationalBaseline.useMutation({
    onSuccess: result => {
      setBaselineConsole(result.consoleText);
      void refresh();
      toast.success(
        result.ok
          ? "Operational baseline check completed."
          : "Baseline check finished with an issue. Review the console."
      );
    },
    onError: mutationError => {
      setBaselineConsole(
        `RYZE OPERATIONAL BASELINE FAILED\n\n${mutationError.message}`
      );
      toast.error(mutationError.message);
    },
  });
  const [baselineConsole, setBaselineConsole] = useState("");
  const updateSettings = trpc.ryze.updateSettings.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success(
        "Safe sandbox settings saved. External actions remain disabled."
      );
    },
  });

  const activeTasks = useMemo(
    () =>
      (data?.tasks ?? []).filter(
        task => task.status === "PENDING" || task.status === "IN_PROGRESS"
      ),
    [data?.tasks]
  );
  const completedTasks = useMemo(
    () => (data?.tasks ?? []).filter(task => task.status === "COMPLETED"),
    [data?.tasks]
  );
  const failedTasks = useMemo(
    () => (data?.tasks ?? []).filter(task => task.status === "FAILED"),
    [data?.tasks]
  );
  const scopedTasks = useMemo(
    () =>
      (data?.tasks ?? []).filter(
        task => !activeSessionId || task.sessionId === activeSessionId
      ),
    [data?.tasks, activeSessionId]
  );

  const logsFor = (taskId: string) =>
    (data?.logs ?? [])
      .filter(log => log.taskId === taskId)
      .sort((a, b) => a.sequence - b.sequence);

  async function onSubmitTask() {
    if (prompt.trim().length < 2)
      return toast.error("Describe a safe sandbox action first.");
    await submitTask.mutateAsync({
      sessionId: activeSessionId,
      prompt: prompt.trim(),
    });
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024)
      return toast.error("The safe sandbox accepts files up to 5 MB.");
    const allowed = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ];
    if (!allowed.includes(file.type))
      return toast.error(
        "Use a TXT, MD, CSV, JSON, PDF, DOCX, PNG, or JPEG file."
      );
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("The file could not be read."));
      reader.readAsDataURL(file);
    });
    await upload.mutateAsync({
      fileName: file.name,
      mimeType: file.type,
      base64: encoded,
      byteSize: file.size,
    });
  }

  async function downloadExport() {
    const response = await exportQuery.refetch();
    if (!response.data) return toast.error("The export is not available yet.");
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-ryze-sandbox-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Portable sandbox export downloaded.");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Metric label="Active" value={activeTasks.length} tone="cyan" />
        <Metric label="Done" value={completedTasks.length} tone="emerald" />
        <Metric label="Failed" value={failedTasks.length} tone="rose" />
      </div>
      <div className="mb-4 flex items-center justify-between px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Control deck
        </p>
        <div className="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
      </div>
      <nav className="space-y-1">
        {viewItems.map(item => {
          const Icon = item.icon;
          const selected = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-all",
                selected
                  ? "bg-gradient-to-r from-cyan-400/15 to-blue-500/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.12)]"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  selected ? "text-cyan-300" : "text-slate-500"
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-7 flex items-center justify-between px-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Sessions
        </p>
        <button
          onClick={() => createSession.mutate({})}
          className="text-cyan-300 transition hover:text-white"
          aria-label="Create sandbox session"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {(data?.sessions ?? []).map(session => (
          <button
            key={session.id}
            onClick={() => {
              setActiveSessionId(session.id);
              setActiveView("workspace");
            }}
            className={cn(
              "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition",
              activeSessionId === session.id
                ? "bg-white/[0.07] text-white"
                : "text-slate-400 hover:bg-white/[0.04]"
            )}
          >
            <MessageSquareText
              className={cn(
                "size-4 shrink-0",
                activeSessionId === session.id
                  ? "text-violet-300"
                  : "text-slate-600"
              )}
            />
            <span className="truncate text-sm">{session.name}</span>
            <ChevronRight className="ml-auto size-3.5 opacity-0 transition group-hover:opacity-70" />
          </button>
        ))}
        {!isLoading && !data?.sessions.length ? (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs leading-5 text-slate-500">
            Your first task creates an isolated testing session.
          </p>
        ) : null}
      </div>
      <div className="mt-auto rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100">
          <ShieldCheck className="size-4 text-cyan-300" /> Safe mode enforced
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {localBuild
            ? "OpenCode is chat-only; its tools are denied. Prompts go through FreeLLMAPI to configured providers."
            : "Shell, external LLM, email, and Telegram actions are disabled in this hosted test environment."}
        </p>
      </div>
    </div>
  );

  if (localBuild && !isAuthenticated)
    return authLoading ? (
      <main className="flex min-h-screen items-center justify-center bg-[#070b14]">
        <Loader2 className="size-7 animate-spin text-cyan-300" />
      </main>
    ) : (
      <LocalLogin />
    );
  if (isLoading && isAuthenticated)
    return (
      <DashboardLayout sidebar={sidebar}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="size-7 animate-spin text-cyan-300" />
        </div>
      </DashboardLayout>
    );
  if (error && isAuthenticated)
    return (
      <DashboardLayout sidebar={sidebar}>
        <div className="ryze-glass mx-auto mt-16 max-w-2xl rounded-3xl p-8">
          <CircleAlert className="mb-4 size-7 text-rose-300" />
          <h1 className="text-2xl font-semibold text-white">
            Sandbox connection needs attention
          </h1>
          <p className="mt-3 text-slate-400">{error.message}</p>
          <Button onClick={() => refresh()} className="mt-6">
            Retry connection
          </Button>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="ryze-ambient pointer-events-none fixed inset-0 -z-10" />
      {localBuild ? (
        <IntegrationStatusBanner status={integrationStatus.data} />
      ) : null}
      {activeView === "workspace" && (
        <Workspace
          prompt={prompt}
          setPrompt={setPrompt}
          submitTask={onSubmitTask}
          submitting={submitTask.isPending}
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          failedTasks={failedTasks}
          scopedTasks={scopedTasks}
          logsFor={logsFor}
          activeSession={data?.sessions.find(
            session => session.id === activeSessionId
          )}
          onNewSession={() => createSession.mutate({})}
          localBuild={localBuild}
          chatReady={Boolean(integrationStatus.data?.chatReady)}
          chatConfigured={chatConfigured}
        />
      )}
      {activeView === "memory" && (
        <MemoryView memory={data?.memory ?? []} skills={data?.skills ?? []} />
      )}
      {activeView === "files" && (
        <FilesView
          files={data?.files ?? []}
          uploadInput={uploadInput}
          onSelectFile={onFileSelected}
          uploading={upload.isPending}
        />
      )}
      {activeView === "settings" && (
        <SettingsView
          settings={settings}
          setSettings={setSettings}
          save={() => updateSettings.mutate(settings)}
          saving={updateSettings.isPending}
          exportData={downloadExport}
          exporting={exportQuery.isFetching}
          localBuild={localBuild}
          integrationStatus={integrationStatus.data}
          telegramControl={telegramControl.data}
          saveTelegramAccount={input => saveTelegramAccount.mutate(input)}
          removeTelegramAccount={() => removeTelegramAccount.mutate()}
          setTelegramAdmin={telegramUserId => setTelegramAdmin.mutate({ telegramUserId })}
          issueTelegramCode={() => issueTelegramCode.mutate()}
          telegramCode={telegramCode}
          runBaseline={() => operationalBaseline.mutate()}
          baselineRunning={operationalBaseline.isPending}
          baselineConsole={baselineConsole}
        />
      )}
    </DashboardLayout>
  );
}

function IntegrationStatusBanner({
  status,
}: {
  status?: { openCode: string; freeLlmApi: string; chatReady: boolean };
}) {
  const gatewayMessage =
    status?.freeLlmApi === "connected"
      ? "Connected"
      : status?.freeLlmApi === "unauthorized"
        ? "Key rejected — reconfigure the key"
        : status?.freeLlmApi === "unavailable"
          ? "Not reachable — check the configured gateway"
          : "Not configured — run Configure-FreeLLMAPI.cmd from the installed Ryze folder";
  const openCodeMessage =
    status?.openCode === "connected" ? "Running" : "Offline — restart Ryze";
  const guidance = !status
    ? "Checking the local chat services…"
    : status.chatReady
      ? "Chat is ready. Prompts go through FreeLLMAPI to the gateway and model you configured; OpenCode tools are denied."
      : status.freeLlmApi === "not_configured"
        ? "Safe local demo actions remain available. Configure the gateway URL, model, and key to enable AI chat."
        : "AI chat is unavailable until both services show Connected. Local demo actions remain available; chat errors will be recorded clearly.";
  return (
    <section className="ryze-glass mx-auto mb-5 flex max-w-7xl flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="font-semibold text-slate-200">
          OpenCode:{" "}
          <span
            className={
              status?.openCode === "connected"
                ? "text-emerald-300"
                : "text-amber-300"
            }
          >
            {status ? openCodeMessage : "Checking…"}
          </span>
        </span>
        <span className="font-semibold text-slate-200">
          FreeLLMAPI:{" "}
          <span
            className={
              status?.freeLlmApi === "connected"
                ? "text-emerald-300"
                : "text-amber-300"
            }
          >
            {status ? gatewayMessage : "Checking…"}
          </span>
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">{guidance}</p>
    </section>
  );
}

function IntegrationSettingsCard({
  status,
}: {
  status?: { openCode: string; freeLlmApi: string; chatReady: boolean };
}) {
  const gateway =
    status?.freeLlmApi === "connected"
      ? "Connected"
      : status?.freeLlmApi === "unauthorized"
        ? "Key rejected"
        : status?.freeLlmApi === "unavailable"
          ? "Not reachable"
          : "Not configured";
  const openCode =
    status?.openCode === "connected"
      ? "Running"
      : status
        ? "Offline"
        : "Checking…";
  return (
    <section className="rounded-[1.5rem] border border-cyan-300/10 bg-cyan-300/[0.04] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
        <Network className="size-4 text-cyan-300" /> OpenCode + FreeLLMAPI
      </div>
      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <p>
          OpenCode: <span className="text-slate-200">{openCode}</span>
        </p>
        <p>
          FreeLLMAPI: <span className="text-slate-200">{gateway}</span>
        </p>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        Run Configure-FreeLLMAPI.cmd from the installed Ryze folder to enter
        your gateway URL, model ID, and key. Use HTTPS for hosted gateways. The
        key stays in the protected local config; chat prompts are sent to that
        gateway. OpenCode tools remain denied.
      </p>
      <p className="mt-3 text-[11px] font-semibold text-slate-500">
        Setup helper:
        %LOCALAPPDATA%\Programs\RyzeFramework\Configure-FreeLLMAPI.cmd
      </p>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cyan" | "emerald" | "rose";
}) {
  const colors = {
    cyan: "text-cyan-200",
    emerald: "text-emerald-200",
    rose: "text-rose-200",
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2 text-center">
      <div className={cn("text-lg font-semibold", colors[tone])}>{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
        {label}
      </div>
    </div>
  );
}

function Workspace({
  prompt,
  setPrompt,
  submitTask,
  submitting,
  activeTasks,
  completedTasks,
  failedTasks,
  scopedTasks,
  logsFor,
  activeSession,
  onNewSession,
  localBuild,
  chatReady,
  chatConfigured,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  submitTask: () => void;
  submitting: boolean;
  activeTasks: any[];
  completedTasks: any[];
  failedTasks: any[];
  scopedTasks: any[];
  logsFor: (taskId: string) => any[];
  activeSession: any;
  onNewSession: () => void;
  localBuild: boolean;
  chatReady: boolean;
  chatConfigured: boolean;
}) {
  const active = scopedTasks.filter(
    task => task.status === "PENDING" || task.status === "IN_PROGRESS"
  );
  const completed = scopedTasks.filter(task => task.status === "COMPLETED");
  const failed = scopedTasks.filter(task => task.status === "FAILED");
  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1 text-xs font-semibold text-cyan-200">
            <div className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,1)]" />
            {chatReady
              ? "OPENCODE CHAT"
              : chatConfigured
                ? "OPENCODE CHAT OFFLINE"
                : localBuild
                  ? "LOCAL SAFE DEMO"
                  : "ARCHITECT–EXECUTOR TESTING"}
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            {activeSession?.name ||
              (localBuild ? "New local chat" : "New sandbox chat")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {chatReady
              ? "Chat with Ryze through OpenCode and FreeLLMAPI. Tool actions remain blocked; chat replies are saved to your local task history."
              : chatConfigured
                ? "The gateway is configured, but AI chat is offline. Check the integration status before sending a chat prompt; safe local workflows remain available."
                : localBuild
                  ? "Run local safe workflows now, or configure the FreeLLMAPI URL, model, and key for model-backed text chat. No shell or message-delivery actions are available."
                  : "Test how Ryze plans and Nerd executes within a fixed safety allowlist. Actions write structured logs and stay ready for export."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onNewSession}
            className="rounded-xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white"
          >
            <Plus className="mr-2 size-4" />
            New session
          </Button>
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-xs font-semibold text-emerald-200">
            <ShieldCheck className="mr-1.5 inline size-4" />
            Sandbox protected
          </div>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <div className="ryze-glass rounded-[1.5rem] p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="size-4 text-cyan-300" />{" "}
                  {chatReady ? "Chat with Ryze" : "Submit a safe task"}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {chatReady
                    ? "Ask a question or request a text draft. The model cannot access files or perform actions."
                    : "Try: “remember that property reports use Malaysian English”, “recall property preferences”, “inspect uploaded document”, or “create a briefing note”."}
                </p>
              </div>
              <Badge className="border border-violet-300/15 bg-violet-300/[0.07] text-violet-200 hover:bg-violet-300/[0.07]">
                {chatReady
                  ? "OPENCODE · FREELLMAPI"
                  : chatConfigured
                    ? "CHAT OFFLINE"
                    : "SAFE DEMO"}
              </Badge>
            </div>
            <Textarea
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              placeholder={
                chatReady
                  ? "Message Ryze…"
                  : "What should RYZE safely demonstrate?"
              }
              className="min-h-32 resize-y border-white/10 bg-[#080c15]/70 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus-visible:border-cyan-300/40 focus-visible:ring-cyan-300/15"
            />
            <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <LockKeyhole className="size-3.5 text-cyan-300" /> No arbitrary
                execution or external delivery
              </div>
              <Button
                onClick={submitTask}
                disabled={submitting || prompt.trim().length < 2}
                className="h-10 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-5 font-semibold text-white shadow-lg shadow-blue-500/20 hover:brightness-110"
              >
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 size-4" />
                )}{" "}
                {chatReady
                  ? "Send to OpenCode"
                  : chatConfigured
                    ? "Submit task (chat offline)"
                    : "Run Ryze → Nerd demo"}
              </Button>
            </div>
          </div>
          <TaskSection
            title="Active tasks"
            subtitle="Plan and execution progress inside the local workflow"
            icon={<Activity className="size-5 text-cyan-300" />}
            empty="No task is currently running."
            tasks={active}
            logsFor={logsFor}
          />
          <TaskSection
            title="Completed tasks"
            subtitle="Verified results and learning records"
            icon={<CheckCircle2 className="size-5 text-emerald-300" />}
            empty="Completed workflow results will appear here."
            tasks={completed}
            logsFor={logsFor}
          />
          <TaskSection
            title="Failed or blocked tasks"
            subtitle="Safety blocks and simulated retry outcomes"
            icon={<CircleAlert className="size-5 text-rose-300" />}
            empty="No safety blocks or failed demos in this session."
            tasks={failed}
            logsFor={logsFor}
          />
        </div>
        <aside className="space-y-4">
          <div className="ryze-glass rounded-[1.5rem] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Live system status
            </p>
            <div className="mt-4 space-y-3">
              <StatusRow label="Ryze · Architect" status="Online" tone="cyan" />
              <StatusRow
                label="Nerd · Executor"
                status="Allowlisted"
                tone="violet"
              />
              <StatusRow
                label="Delivery bridge"
                status="Disabled"
                tone="muted"
              />
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/[0.07] bg-gradient-to-br from-[#101a2c] to-[#0b0f1c] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <TerminalSquare className="size-4 text-cyan-300" /> Sandbox
              boundary
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {localBuild
                ? "OpenCode runs on this computer with tool permissions denied. Model prompts are routed through FreeLLMAPI to its configured provider(s)."
                : "This hosted environment intentionally never runs shell commands, exposes credentials, or contacts external delivery channels."}
            </p>
            <div className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-[11px] leading-5 text-slate-500">
              Safe actions: memory, recall, metadata inspection, generated
              Markdown, retry simulation.
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatusRow({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone: "cyan" | "violet" | "muted";
}) {
  const dot =
    tone === "cyan"
      ? "bg-cyan-300"
      : tone === "violet"
        ? "bg-violet-300"
        : "bg-slate-500";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        <span className={cn("size-1.5 rounded-full", dot)} />
        {status}
      </span>
    </div>
  );
}

function TaskSection({
  title,
  subtitle,
  icon,
  empty,
  tasks,
  logsFor,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  empty: string;
  tasks: any[];
  logsFor: (taskId: string) => any[];
}) {
  return (
    <section className="ryze-glass rounded-[1.5rem] p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-white/[0.04]">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} logs={logsFor(task.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskCard({ task, logs }: { task: any; logs: any[] }) {
  const completion = Math.round(
    (task.completedSteps / Math.max(task.totalSteps, 1)) * 100
  );
  return (
    <details className="group rounded-2xl border border-white/[0.07] bg-black/10 open:bg-white/[0.025]">
      <summary className="cursor-pointer list-none px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{taskIcon(task.status)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="line-clamp-1 text-sm font-medium text-slate-100">
                {task.prompt}
              </span>
              <Badge
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  statusTone(task.status)
                )}
              >
                {task.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>{task.action.replace(/_/g, " ")}</span>
              <span>{formatDate(task.createdAt)}</span>
              {task.retryCount ? <span>Retry {task.retryCount}/3</span> : null}
            </div>
            {task.status !== "FAILED" ? (
              <Progress
                value={completion || (task.status === "COMPLETED" ? 100 : 35)}
                className="mt-3 h-1.5 bg-white/[0.07]"
              />
            ) : null}
          </div>
          <ChevronRight className="mt-1 size-4 text-slate-500 transition-transform group-open:rotate-90" />
        </div>
      </summary>
      <div className="border-t border-white/[0.07] px-4 py-4">
        <p className="text-sm leading-6 text-slate-300">
          {task.summary || "Ryze is preparing a safe delegate instruction."}
        </p>
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#070b13] px-3 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
            Structured activity log
          </p>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex gap-2 text-xs leading-5">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    log.level === "success"
                      ? "bg-emerald-300"
                      : log.level === "warning"
                        ? "bg-amber-300"
                        : log.level === "error"
                          ? "bg-rose-300"
                          : "bg-cyan-300"
                  )}
                />
                <span className="font-semibold uppercase text-slate-500">
                  {log.actor}
                </span>
                <span className="text-slate-400">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}

function MemoryView({ memory, skills }: { memory: any[]; skills: any[] }) {
  const core = memory.filter(entry => entry.scope === "core");
  const evolving = memory.filter(entry => entry.scope === "evolving");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Persistent intelligence"
        title="Memory vault"
        copy="Core preferences never expire; evolving records capture successful workflow patterns and safe failure lessons."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <MemoryPanel
          title="Core memory"
          entries={core}
          empty="Save a preference with “remember …” to create your first permanent entry."
        />
        <MemoryPanel
          title="Evolving memory"
          entries={evolving}
          empty="Completed safe workflows automatically add learning records here."
        />
      </div>
      <section className="ryze-glass mt-5 rounded-[1.5rem] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04]">
            <Gauge className="size-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Skill tree</h2>
            <p className="text-xs text-slate-500">
              Successful safe steps earn 10 XP. Blocked actions preserve the
              safety signal and deduct 2 XP from their domain.
            </p>
          </div>
        </div>
        {skills.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
            Run a supported demo action to establish skill progression.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map(skill => (
              <div
                key={skill.id}
                className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize text-slate-100">
                    {skill.domain}
                  </span>
                  <span className="text-xs font-bold text-violet-300">
                    Lv {skill.level}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{skill.xp} XP</span>
                  <span>{skill.successCount} successful</span>
                </div>
                <Progress
                  value={skill.xp % 100}
                  className="mt-3 h-1.5 bg-white/[0.07]"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MemoryPanel({
  title,
  entries,
  empty,
}: {
  title: string;
  entries: any[];
  empty: string;
}) {
  return (
    <section className="ryze-glass rounded-[1.5rem] p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04]">
          <BrainCircuit className="size-5 text-cyan-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold capitalize text-cyan-200">
                  {entry.kind.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-slate-600">
                  {formatDate(entry.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FilesView({
  files,
  uploadInput,
  onSelectFile,
  uploading,
}: {
  files: any[];
  uploadInput: React.RefObject<HTMLInputElement | null>;
  onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Portable object storage"
        title="File manifest"
        copy="Uploaded and generated file bytes are stored in the RyzeFramework folder under your Windows local application data. Downloads are checked against your local account."
      />
      <section className="ryze-glass rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Secure file intake
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              TXT, MD, CSV, JSON, PDF, DOCX, PNG, and JPEG. Maximum 5 MB.
            </p>
          </div>
          <div className="relative">
            <CloudUpload className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-cyan-300" />
            <input
              ref={uploadInput}
              aria-label="Upload sandbox document"
              type="file"
              disabled={uploading}
              className="h-10 max-w-full cursor-pointer rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] py-1 pl-9 pr-2 text-xs text-slate-300 file:mr-3 file:h-7 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-cyan-400 file:to-blue-500 file:px-3 file:text-xs file:font-semibold file:text-white hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-70"
              onChange={onSelectFile}
              accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg"
            />
          </div>
        </div>
      </section>
      <section className="ryze-glass mt-5 rounded-[1.5rem] p-5 sm:p-6">
        {files.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <FolderOpen className="size-8 text-slate-600" />
            <p className="mt-4 text-sm font-medium text-slate-300">
              Your portable file manifest is empty.
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              Upload a test document, then ask Nerd to inspect uploaded metadata
              or generate a Markdown note.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="grid grid-cols-[minmax(0,1fr)_110px_100px] gap-4 border-b border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>File</span>
              <span>Source</span>
              <span>Open</span>
            </div>
            {files.map(file => (
              <div
                key={file.id}
                className="grid grid-cols-[minmax(0,1fr)_110px_100px] items-center gap-4 border-b border-white/[0.06] px-4 py-4 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-4 shrink-0 text-cyan-300" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {file.originalName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {file.mimeType} · {file.byteSize.toLocaleString()} bytes ·{" "}
                      {formatDate(file.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge className="w-fit border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.04]">
                  {file.source}
                </Badge>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-white"
                >
                  <Download className="size-3.5" />
                  Open
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TelegramSettingsCard({
  control,
  saveAccount,
  removeAccount,
  setAdmin,
  issueCode,
  telegramCode,
}: {
  control?: any;
  saveAccount: (input: { label: string; phoneMasked: string; telegramUserId?: string; status?: "configured" | "authorized" | "paused" | "removed" }) => void;
  removeAccount: () => void;
  setAdmin: (telegramUserId: string) => void;
  issueCode: () => void;
  telegramCode: { code: string; expiresAt: string } | null;
}) {
  const [label, setLabel] = useState(control?.account?.label ?? "");
  const [phoneMasked, setPhoneMasked] = useState(control?.account?.phoneMasked ?? "");
  const [accountId, setAccountId] = useState(control?.account?.telegramUserId ?? "");
  const [adminId, setAdminId] = useState(control?.access?.adminTelegramUserId ?? "");
  useEffect(() => {
    setLabel(control?.account?.label ?? "");
    setPhoneMasked(control?.account?.phoneMasked ?? "");
    setAccountId(control?.account?.telegramUserId ?? "");
    setAdminId(control?.access?.adminTelegramUserId ?? "");
  }, [control?.account?.label, control?.account?.phoneMasked, control?.account?.telegramUserId, control?.access?.adminTelegramUserId]);
  const expires = control?.access?.temporaryExpiresAt ? new Date(control.access.temporaryExpiresAt) : null;
  return (
    <section className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/[0.035] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><UserRound className="size-4 text-cyan-300" /> Telegram account bridge</div>
      <p className="mt-3 text-xs leading-5 text-slate-400">Manage one active Telegram user account. Incoming and outgoing channel events are kept in the local audit log. Outbound replies remain disabled until the approval gate is completed.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input value={label} onChange={event => setLabel(event.target.value)} placeholder="Account label" className="border-white/10 bg-black/20 text-slate-100" />
        <Input value={phoneMasked} onChange={event => setPhoneMasked(event.target.value)} placeholder="Masked phone, e.g. +60••••89" className="border-white/10 bg-black/20 text-slate-100" />
        <Input value={accountId} onChange={event => setAccountId(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Account user ID (optional until login)" className="border-white/10 bg-black/20 text-slate-100" />
        <Button disabled={!label || !phoneMasked} onClick={() => saveAccount({ label, phoneMasked, telegramUserId: accountId || undefined, status: "configured" })} className="bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25">{control?.account ? "Replace / save account" : "Add account"}</Button>
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/10 p-3">
        <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-200">Permanent admin Telegram user ID</span><Badge className="border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">{control?.access?.adminTelegramUserId ? "configured" : "not set"}</Badge></div>
        <div className="mt-3 flex gap-2"><Input value={adminId} onChange={event => setAdminId(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Numeric Telegram user ID" className="border-white/10 bg-black/20 text-slate-100" /><Button disabled={!/^\d+$/.test(adminId)} onClick={() => setAdmin(adminId)} className="bg-white/[0.08] text-slate-100 hover:bg-white/[0.14]">Save admin ID</Button></div>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">Use the numeric Telegram user ID only—not a phone number, username, or value beginning with `@`. All other senders are ignored unless temporarily authorized.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={issueCode} className="bg-violet-400/15 text-violet-100 hover:bg-violet-400/25">Generate one-time code</Button><Button variant="outline" disabled={!control?.account} onClick={removeAccount} className="border-rose-300/20 text-rose-200 hover:bg-rose-300/10"><Trash2 className="mr-2 size-4" />Remove account</Button></div>
      {telegramCode ? <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[0.07] p-3"><p className="text-[11px] text-violet-100">Use this code only from the specific Telegram sender you want to authorize:</p><p className="mt-2 select-all font-mono text-lg font-bold tracking-wider text-white">{telegramCode.code}</p><p className="mt-1 text-[11px] text-violet-200">Expires {formatDate(telegramCode.expiresAt)}. It is shown only in this local dashboard.</p></div> : null}
      {expires ? <p className="mt-3 text-xs text-amber-200">Temporary sender: {control.access.temporaryTelegramUserId}; expires {formatDate(expires)}.</p> : null}
      <div className="mt-4 border-t border-white/[0.07] pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Telegram channel log</p><div className="mt-2 max-h-44 space-y-2 overflow-auto">{(control?.logs ?? []).slice(0, 20).map((log: any) => <div key={log.id} className="rounded-lg bg-black/10 px-3 py-2 text-[11px] text-slate-400"><span className="mr-2 font-semibold text-slate-300">{log.direction}</span>{log.status} · {log.messagePreview} · {formatDate(log.createdAt)}</div>)}{!control?.logs?.length ? <p className="text-xs text-slate-500">No Telegram events recorded.</p> : null}</div></div>
    </section>
  );
}

function SettingsView({
  settings,
  setSettings,
  save,
  saving,
  exportData,
  exporting,
  localBuild,
  integrationStatus,
  telegramControl,
  saveTelegramAccount,
  removeTelegramAccount,
  setTelegramAdmin,
  issueTelegramCode,
  telegramCode,
  runBaseline,
  baselineRunning,
  baselineConsole,
}: {
  localBuild: boolean;
  integrationStatus?: {
    openCode: string;
    freeLlmApi: string;
    chatReady: boolean;
  };
  telegramControl?: any;
  saveTelegramAccount: (input: { label: string; phoneMasked: string; telegramUserId?: string; status?: "configured" | "authorized" | "paused" | "removed" }) => void;
  removeTelegramAccount: () => void;
  setTelegramAdmin: (telegramUserId: string) => void;
  issueTelegramCode: () => void;
  telegramCode: { code: string; expiresAt: string } | null;
  settings: {
    provider: "local-demo" | "ollama-ready" | "external-disabled";
    ryzeModel: string;
    nerdModel: string;
    demoMode: boolean;
  };
  setSettings: (settings: {
    provider: "local-demo" | "ollama-ready" | "external-disabled";
    ryzeModel: string;
    nerdModel: string;
    demoMode: boolean;
  }) => void;
  save: () => void;
  saving: boolean;
  exportData: () => void;
  exporting: boolean;
  runBaseline: () => void;
  baselineRunning: boolean;
  baselineConsole: string;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading
        eyebrow="Server-side controls"
        title="Sandbox settings"
        copy={
          localBuild
            ? "Configure the local OpenCode + FreeLLMAPI chat integration and review data/backup locations. API keys are entered on this computer and are never shown in this dashboard."
            : "This hosted test environment persists safe display settings only. Credentials, shell access, external LLM, email, and Telegram channels are intentionally not available here."
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="ryze-glass rounded-[1.5rem] p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Sandbox provider profile
              </span>
              <select
                value={settings.provider}
                onChange={event =>
                  setSettings({
                    ...settings,
                    provider: event.target.value as typeof settings.provider,
                  })
                }
                className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40"
              >
                <option value="local-demo">Local safe demo</option>
                <option value="ollama-ready">Ollama-ready profile</option>
                <option value="external-disabled">
                  External providers disabled
                </option>
              </select>
            </label>
            <div className="rounded-xl border border-white/[0.07] bg-black/10 px-4 py-3">
              <div className="text-xs font-semibold text-slate-200">
                Demo engine
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Allowlisted workflows only
                </span>
                <Switch
                  checked={settings.demoMode}
                  onCheckedChange={demoMode =>
                    setSettings({ ...settings, demoMode })
                  }
                />
              </div>
            </div>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Ryze display model
              </span>
              <Input
                value={settings.ryzeModel}
                onChange={event =>
                  setSettings({ ...settings, ryzeModel: event.target.value })
                }
                className="border-white/10 bg-black/20 text-slate-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">
                Nerd display model
              </span>
              <Input
                value={settings.nerdModel}
                onChange={event =>
                  setSettings({ ...settings, nerdModel: event.target.value })
                }
                className="border-white/10 bg-black/20 text-slate-100"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:brightness-110"
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Settings2 className="mr-2 size-4" />
              )}
              Save safe settings
            </Button>
          </div>
        </section>
        <aside className="space-y-5">
          {localBuild ? (
            <IntegrationSettingsCard status={integrationStatus} />
          ) : null}
          {localBuild ? (
            <TelegramSettingsCard
              control={telegramControl}
              saveAccount={saveTelegramAccount}
              removeAccount={removeTelegramAccount}
              setAdmin={setTelegramAdmin}
              issueCode={issueTelegramCode}
              telegramCode={telegramCode}
            />
          ) : null}
          <section className="rounded-[1.5rem] border border-rose-300/10 bg-rose-300/[0.035] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
              <KeyRound className="size-4" />
              External channels locked
            </div>
            <ul className="mt-4 space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <LockKeyhole className="size-3.5 text-rose-300" /> External LLM
                actions disabled
              </li>
              <li className="flex items-center gap-2">
                <LockKeyhole className="size-3.5 text-rose-300" /> Email
                delivery disabled
              </li>
              <li className="flex items-center gap-2">
                <LockKeyhole className="size-3.5 text-rose-300" /> Telegram
                bridge disabled
              </li>
              <li className="flex items-center gap-2">
                <LockKeyhole className="size-3.5 text-rose-300" /> Arbitrary
                shell unavailable
              </li>
            </ul>
          </section>
          <section className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-300/[0.04] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <ClipboardCheck className="size-4 text-emerald-300" /> target
              Windows computer baseline
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              One safe button creates a private backup, rehearses a restore
              without replacing live data, creates test database/log/file
              records, and checks Windows permissions. No manual PowerShell
              steps.
            </p>
            <Button
              onClick={runBaseline}
              disabled={!localBuild || baselineRunning}
              className="mt-4 w-full rounded-xl bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25"
            >
              {baselineRunning ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ClipboardCheck className="mr-2 size-4" />
              )}
              {baselineRunning ? "Running checks…" : "Run operational baseline"}
            </Button>
            {!localBuild ? (
              <p className="mt-2 text-[11px] text-amber-300">
                Available on the installed local Windows build.
              </p>
            ) : null}
          </section>
          {baselineConsole ? (
            <section className="rounded-[1.5rem] border border-white/[0.08] bg-black/30 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <TerminalSquare className="size-4 text-cyan-300" /> Diagnostic
                  console
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(baselineConsole);
                    toast.success("Diagnostics copied to clipboard.");
                  }}
                  className="h-8 rounded-lg border-white/10 px-2 text-xs text-slate-200"
                >
                  <Copy className="mr-1.5 size-3.5" />
                  Copy
                </Button>
              </div>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-[#05070d] p-3 text-[11px] leading-5 text-slate-400">
                {baselineConsole}
              </pre>
              <p className="mt-2 text-[11px] text-slate-500">
                Copy this console and send it here if any check is marked FAIL.
              </p>
            </section>
          ) : null}
          <section className="rounded-[1.5rem] border border-cyan-300/10 bg-cyan-300/[0.04] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Network className="size-4 text-cyan-300" /> Computer migration
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Export all database-backed sessions, tasks, logs, memory, skills,
              settings, and a file manifest. Reconfigure secrets locally after
              migration.
            </p>
            <Button
              variant="outline"
              onClick={exportData}
              disabled={exporting}
              className="mt-4 w-full rounded-xl border-cyan-300/20 bg-cyan-300/[0.05] text-cyan-100 hover:bg-cyan-300/[0.12]"
            >
              {exporting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              Export portable JSON
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <section className="mb-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{copy}</p>
    </section>
  );
}
