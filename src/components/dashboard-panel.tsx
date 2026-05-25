import type { DashboardStats } from "@/lib/app-types";

const WINDOWS = [1, 24, 168];

function MetricCard({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="border border-white/10 bg-white/3 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function CountRow({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-white/3 px-3 py-2 text-sm">
      <span className="truncate text-slate-300">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function DashboardPanel({
  stats,
  windowHours,
  onWindowChange,
}: Readonly<{
  stats?: DashboardStats;
  windowHours: number;
  onWindowChange: (value: number) => void;
}>) {
  return (
    <aside className="flex h-[calc(100vh-1.5rem)] min-h-0 flex-col border border-white/10 bg-[#111722] shadow-xl">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
        <h2 className="text-sm font-semibold">Dashboard</h2>
        <div className="flex border border-white/10 bg-[#0c111a] p-0.5">
          {WINDOWS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onWindowChange(value)}
              className={
                "px-2 py-1 text-xs " +
                (value === windowHours ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:bg-white/10")
              }
            >
              {value === 168 ? "7d" : `${value}h`}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Requests" value={stats?.totalRequests ?? 0} />
          <MetricCard label="Avg latency" value={`${stats?.averageLatencyMs ?? 0}ms`} />
          <MetricCard label="P95 latency" value={`${stats?.p95LatencyMs ?? 0}ms`} />
          <MetricCard label="Error rate" value={`${stats?.errorRate ?? 0}%`} />
          <MetricCard label="Req / hour" value={stats?.requestsPerHour ?? 0} />
          <MetricCard label="Tokens" value={stats?.totalTokens ?? 0} />
        </div>

        <section className="mt-5">
          <h3 className="text-sm font-semibold">Breakdown</h3>
          <div className="mt-3 space-y-2">
            {stats?.requestsByProvider.length ? (
              stats.requestsByProvider.map((item) => <CountRow key={item.provider} label={item.provider} value={item.count} />)
            ) : (
              <p className="text-sm text-slate-400">No provider traffic yet.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="bg-emerald-400/10 px-2 py-1 text-emerald-300">Success {stats?.successCount ?? 0}</span>
            <span className="bg-red-400/10 px-2 py-1 text-red-300">Errors {stats?.errorCount ?? 0}</span>
            <span className="bg-white/10 px-2 py-1 text-slate-300">Cancelled {stats?.cancelledCount ?? 0}</span>
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold">Recent Logs</h3>
          <div className="mt-3 space-y-2">
            {stats?.recentLogs?.map((log) => (
              <div key={log.id} className="border border-white/10 bg-white/3 p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="truncate">{log.provider}/{log.model}</span>
                  <span>{log.latency_ms}ms</span>
                </div>
                <div className={log.status === "error" ? "text-red-300" : "text-emerald-300"}>{log.status}</div>
                <div className="mt-1 line-clamp-2 text-slate-400">{log.input_preview}</div>
                {log.error_message ? <div className="mt-2 line-clamp-3 text-red-300">{log.error_message}</div> : null}
              </div>
            ))}
            {stats?.recentLogs.length ? null : <p className="text-sm text-slate-400">No logs yet.</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}
