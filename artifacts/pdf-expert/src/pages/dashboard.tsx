import { useGetStats, useGetQueue, useListJobs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, FileText, ImageIcon, Settings, Zap } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: stats } = useGetStats({ query: { refetchInterval: 2000 } });
  const { data: queue } = useGetQueue({ query: { refetchInterval: 2000 } });
  const { data: jobsData } = useListJobs({ limit: 5 }, { query: { refetchInterval: 2000 } });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <h1 className="text-xl font-bold">System Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-muted-foreground">Queue Health:</span>
            {queue?.queueHealth === "healthy" ? (
              <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>Healthy</span>
            ) : queue?.queueHealth === "degraded" ? (
              <span className="flex items-center text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full"><span className="w-2 h-2 rounded-full bg-amber-400 mr-2"></span>Degraded</span>
            ) : (
              <span className="flex items-center text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full"><span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span>Critical</span>
            )}
          </div>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed</CardTitle>
              <FileText className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalJobs.toLocaleString() ?? "-"}</div>
              <p className="text-xs text-muted-foreground mt-1">Catalogs analyzed</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Extracted Products</CardTitle>
              <Settings className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalProducts.toLocaleString() ?? "-"}</div>
              <p className="text-xs text-muted-foreground mt-1">Structured records</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Extracted Images</CardTitle>
              <ImageIcon className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalImages.toLocaleString() ?? "-"}</div>
              <p className="text-xs text-muted-foreground mt-1">High-res assets</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Processing Time</CardTitle>
              <Clock className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.avgProcessingTime ? `${stats.avgProcessingTime}s` : "-"}</div>
              <p className="text-xs text-muted-foreground mt-1">Per document</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Queue */}
          <Card className="col-span-1 lg:col-span-2 bg-card/50 border-border flex flex-col">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                {jobsData?.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No recent jobs</div>
                ) : (
                  jobsData?.items.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30 hover:bg-card/60 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`status-badge-${job.status} px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wider`}>
                          {job.status}
                        </div>
                        <div>
                          <Link href={`/jobs/${job.id}`} className="font-medium hover:text-primary transition-colors">
                            {job.originalName}
                          </Link>
                          <div className="text-xs text-muted-foreground flex items-center space-x-2 mt-1">
                            <span>{job.totalPages} pages</span>
                            <span>•</span>
                            <span>{job.productCount} products</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{job.progress}%</div>
                        <div className="w-24 h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              job.status === 'processing' ? 'bg-primary' : 
                              job.status === 'completed' ? 'bg-emerald-500' : 
                              job.status === 'failed' ? 'bg-red-500' : 'bg-muted-foreground'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Queue Status Panel */}
          <Card className="col-span-1 bg-card/50 border-border">
            <CardHeader>
              <CardTitle>Worker Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-secondary/20 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold text-primary mb-2 flex items-center justify-center">
                    <Activity className="w-8 h-8 mr-3 text-primary animate-pulse" />
                    {queue?.workers ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground uppercase tracking-widest">Active Workers</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Processing</span>
                  <span className="font-mono">{queue?.processing ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-mono">{queue?.pending ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Failed Today</span>
                  <span className="font-mono text-red-400">{queue?.failed ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
