import type { DashboardStats } from "@/lib/app-types";

function MetricCard({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="border border-slate-200 p-3">
      <div className="text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function DashboardPanel({ stats }: Readonly<{ stats?: DashboardStats }>) {
  return (
    <aside className="space-y-4">
      <section className="border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Dashboard</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <MetricCard label="Requests" value={stats?.totalRequests ?? 0} />
          <MetricCard label="Avg latency" value={(stats?.averageLatencyMs ?? 0) + "ms"} />
          <MetricCard label="Success" value={stats?.successCount ?? 0} />
          <MetricCard label="Errors" value={stats?.errorCount ?? 0} />
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Throughput By Provider</h2>
        <div className="mt-3 space-y-2 text-sm">
          {stats?.requestsByProvider.length ? (
            stats.requestsByProvider.map((item) => (
              <div key={item.provider} className="flex justify-between border border-slate-200 px-3 py-2">
                <span>{item.provider}</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500">No provider traffic yet.</p>
          )}
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Recent Logs</h2>
        <div className="mt-3 space-y-2">
          {stats?.recentLogs?.map((log) => (
            <div key={log.id} className="border border-slate-200 p-3 text-xs">
              <div className="flex justify-between gap-2">
                <span>{log.provider}/{log.model}</span>
                <span>{log.latency_ms}ms</span>
              </div>
              <div className={log.status === "error" ? "text-red-600" : "text-emerald-700"}>{log.status}</div>
              <div className="mt-1 text-slate-500">{log.input_preview}</div>
              {log.error_message ? <div className="mt-1 text-red-600">{log.error_message}</div> : null}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
