import { useState } from "react";
import { useGetLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TerminalSquare, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-slate-500",
};

const LEVEL_BG: Record<string, string> = {
  info: "",
  warn: "bg-amber-500/5",
  error: "bg-red-500/5",
  debug: "",
};

type Level = "info" | "warn" | "error" | "debug";

export default function LogsViewer() {
  const [level, setLevel] = useState<Level | undefined>(undefined);
  const [limit, setLimit] = useState(200);

  const { data: logs, isLoading, refetch, isFetching } = useGetLogs(
    { ...(level ? { level } : {}), limit },
    { query: { refetchInterval: 3000 } }
  );

  const LEVELS: (Level | undefined)[] = [undefined, "info", "warn", "error", "debug"];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TerminalSquare className="w-5 h-5 text-primary" />
          System Logs
          {logs && <span className="text-sm font-normal text-muted-foreground">({logs.length} entries)</span>}
        </h1>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <div className="p-8 space-y-4">
        <div className="flex items-center gap-2">
          {LEVELS.map(l => (
            <button
              key={l ?? "all"}
              onClick={() => setLevel(l)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors font-mono uppercase ${level === l
                ? l === "error" ? "border-red-500/50 text-red-400 bg-red-500/10"
                  : l === "warn" ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                  : l === "info" ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                  : l === "debug" ? "border-slate-500/50 text-slate-400 bg-slate-500/10"
                  : "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {l ?? "all"}
            </button>
          ))}
        </div>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading logs...</div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <TerminalSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No log entries found.</p>
              </div>
            ) : (
              <div className="font-mono text-xs divide-y divide-border/30 max-h-[calc(100vh-260px)] overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className={`flex gap-4 px-4 py-2.5 hover:bg-white/3 transition-colors ${LEVEL_BG[log.level] ?? ""}`}>
                    <span className="text-muted-foreground/50 flex-shrink-0 tabular-nums">
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </span>
                    <span className={`flex-shrink-0 font-bold uppercase w-10 ${LEVEL_COLORS[log.level] ?? ""}`}>
                      {log.level}
                    </span>
                    {log.jobId != null && (
                      <span className="flex-shrink-0 text-muted-foreground/60">job#{log.jobId}</span>
                    )}
                    <span className="text-foreground/80 break-all leading-relaxed">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {logs && logs.length >= limit && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setLimit(l => l + 200)} className="text-xs text-muted-foreground">
              Load more entries
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
