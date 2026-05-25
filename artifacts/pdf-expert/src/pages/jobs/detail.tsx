import { useParams, Link } from "wouter";
import { useGetJob, useGetJobLogs, useListProducts, useProcessJob, useCancelJob, getGetJobQueryKey, getListJobsQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, X, FileText, Package, Image, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link as WouterLink } from "wouter";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-700 text-slate-300",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-amber-500/20 text-amber-400",
};

const LOG_COLORS: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-slate-400",
};

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const qc = useQueryClient();

  const { data: job, isLoading } = useGetJob(id, {
    query: { enabled: !!id, queryKey: getGetJobQueryKey(id), refetchInterval: 2000 }
  });

  const { data: logs } = useGetJobLogs(id, {
    query: { enabled: !!id, refetchInterval: 2000 }
  });

  const { data: products } = useListProducts({ jobId: id, limit: 6 }, {
    query: { enabled: !!id, queryKey: getListProductsQueryKey({ jobId: id, limit: 6 }) }
  });

  const processJob = useProcessJob({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetJobQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
      }
    }
  });

  const cancelJob = useCancelJob({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetJobQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-card/40 rounded animate-pulse" />
        <div className="h-32 bg-card/40 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Job not found.</p>
        <Link href="/jobs"><Button variant="ghost" className="mt-4">Back to Jobs</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/jobs">
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold truncate max-w-lg">{job.originalName}</h1>
          <span className={`px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider ${STATUS_STYLES[job.status] ?? ""}`}>
            {job.status}
          </span>
        </div>
        <div className="flex gap-2">
          {(job.status === "pending" || job.status === "failed") && (
            <Button size="sm" onClick={() => processJob.mutate({ id: job.id })} disabled={processJob.isPending}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start Processing
            </Button>
          )}
          {job.status === "processing" && (
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400" onClick={() => cancelJob.mutate({ id: job.id })}>
              <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
          )}
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pages", value: `${job.processedPages} / ${job.totalPages}`, icon: FileText, color: "text-primary" },
            { label: "Products", value: job.productCount, icon: Package, color: "text-emerald-400" },
            { label: "Images", value: job.imageCount, icon: Image, color: "text-amber-400" },
            { label: "Created", value: formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }), icon: Clock, color: "text-purple-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-card/50 border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold font-mono">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress */}
        {job.status === "processing" && (
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Processing page {job.processedPages} of {job.totalPages}</span>
                <span className="font-mono font-bold text-primary">{job.progress}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Settings */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pipeline Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {[
                { label: "OCR", enabled: job.ocrEnabled },
                { label: "Image Extraction", enabled: job.imageExtractionEnabled },
                { label: "AI Name Correction", enabled: job.aiCorrectionEnabled },
              ].map(({ label, enabled }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-600"}`} />
                  <span className={`text-sm ${enabled ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Products Preview */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Extracted Products</CardTitle>
              {job.productCount > 0 && (
                <WouterLink href={`/products?jobId=${job.id}`}>
                  <Button size="sm" variant="ghost" className="text-xs h-7">View all {job.productCount}</Button>
                </WouterLink>
              )}
            </CardHeader>
            <CardContent>
              {products?.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No products extracted yet</p>
              ) : (
                <div className="space-y-2">
                  {products?.items.map(p => (
                    <div key={p.id} className="flex items-start gap-2 p-2 rounded border border-border/50 hover:bg-white/5 transition-colors">
                      <Package className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.cleanName}</p>
                        {p.rawName !== p.cleanName && (
                          <p className="text-xs text-muted-foreground truncate line-through">{p.rawName}</p>
                        )}
                        <div className="flex gap-2 mt-0.5">
                          {p.brand && <span className="text-xs text-primary">{p.brand}</span>}
                          {p.category && <span className="text-xs text-muted-foreground">{p.category}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs Panel */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Processing Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-xs space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
                {!logs || logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No logs yet</p>
                ) : (
                  [...logs].reverse().map(log => (
                    <div key={log.id} className="flex gap-2 py-0.5">
                      <span className="text-muted-foreground/60 flex-shrink-0">{format(new Date(log.timestamp), "HH:mm:ss")}</span>
                      <span className={`uppercase font-bold flex-shrink-0 w-8 ${LOG_COLORS[log.level] ?? ""}`}>{log.level.slice(0, 4)}</span>
                      <span className="text-foreground/80 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {job.error && (
          <Card className="bg-red-500/5 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-red-400 mb-1">Error</p>
              <p className="text-sm text-red-300/80 font-mono">{job.error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
