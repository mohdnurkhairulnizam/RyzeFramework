import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";

export default function DashboardLayout({ children, sidebar }: { children: React.ReactNode; sidebar: React.ReactNode }) {
  const { loading, user, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#090d16]" />;
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#090d16] px-6 py-10 text-slate-100">
        <div className="absolute inset-0 ryze-grid opacity-30" />
        <div className="absolute left-[15%] top-[-20%] h-96 w-96 rounded-full bg-cyan-400/15 blur-[120px]" />
        <div className="absolute right-[10%] top-[25%] h-80 w-80 rounded-full bg-violet-500/15 blur-[110px]" />
        <main className="relative mx-auto flex min-h-[80vh] max-w-xl items-center">
          <section className="ryze-glass w-full rounded-[2rem] p-8 shadow-2xl shadow-black/40 sm:p-12">
            <div className="mb-7 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-500 shadow-lg shadow-cyan-500/20">
              <Sparkles className="size-7 text-white" />
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Secure hosted sandbox</p>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-white">PROJECT RYZE</h1>
            <p className="mt-4 max-w-md leading-7 text-slate-300">Sign in to test safe Ryze → Nerd workflows with persistent, portable sandbox data. Shell execution and external delivery remain unavailable by design.</p>
            <Button onClick={() => startLogin()} className="mt-8 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:brightness-110">
              <ShieldCheck className="mr-2 size-4" />
              Sign in to your sandbox
            </Button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-white/8 bg-[#0a101b] text-slate-100" collapsible="offcanvas">
        <SidebarHeader className="border-b border-white/8 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-500 shadow-lg shadow-cyan-500/20">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold tracking-[-0.03em] text-white">PROJECT RYZE</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Sandbox Control</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">{sidebar}</SidebarContent>
        <SidebarFooter className="border-t border-white/8 p-3">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Avatar className="size-8 border border-cyan-200/20 bg-cyan-400/10">
              <AvatarFallback className="bg-transparent text-xs font-bold text-cyan-200">{user.name?.slice(0, 1).toUpperCase() || "R"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">{user.name || "Sandbox user"}</p>
              <p className="truncate text-xs text-slate-500">Authenticated workspace</p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="h-9 w-full justify-start rounded-lg px-3 text-slate-400 hover:bg-white/[0.06] hover:text-white">
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-screen bg-[#090d16] text-slate-100">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/8 bg-[#090d16]/80 px-4 backdrop-blur-xl md:hidden">
          <SidebarTrigger className="text-slate-200 hover:bg-white/[0.08]" />
          <span className="text-sm font-semibold text-white">PROJECT RYZE Sandbox</span>
        </header>
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
