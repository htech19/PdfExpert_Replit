import { useState, useRef } from "react";
import { Link } from "wouter";
import { useListJobs, useDeleteJob, useProcessJob, useCancelJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Plus, Play, X, Trash2, Eye, FileText, AlertCircle, Upload, File } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-700 text-slate-300",
  processing: "bg-blue-500/20 text-blue-400 animate-pulse",
  completed: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-amber-500/20 text-amber-400",
};

export default function JobsList() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [opts, setOpts] = useState({ ocrEnabled: true, imageExtractionEnabled: true, aiCorrectionEnabled: true });
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useListJobs(
    statusFilter ? { status: statusFilter as "pending" | "processing" | "completed" | "failed" | "cancelled", limit: 50 } : { limit: 50 },
    { query: { refetchInterval: 3000 } as any }
  );

  const uploadJob = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ocrEnabled", String(opts.ocrEnabled));
      formData.append("imageExtractionEnabled", String(opts.imageExtractionEnabled));
      formData.append("aiCorrectionEnabled", String(opts.aiCorrectionEnabled));

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.responseText));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
      setOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setOpts({ ocrEnabled: true, imageExtractionEnabled: true, aiCorrectionEnabled: true });
    },
    onError: () => setUploadProgress(0),
  });

  const deleteJob = useDeleteJob({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListJobsQueryKey() }) } });
  const processJob = useProcessJob({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListJobsQueryKey() }) } });
  const cancelJob = useCancelJob({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListJobsQueryKey() }) } });

  const FILTERS = [undefined, "pending", "processing", "completed", "failed", "cancelled"];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Queue & Jobs
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Upload PDF for Processing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf" || f?.name.endsWith(".pdf")) setSelectedFile(f);
                }}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${selectedFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-white/3"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <File className="w-8 h-8 text-primary" />
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground mt-1"
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Click or drag & drop a PDF</p>
                    <p className="text-xs text-muted-foreground">Max 100 MB</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {[
                  { key: "ocrEnabled" as const, label: "OCR Processing", desc: "Extract text from PDF pages" },
                  { key: "imageExtractionEnabled" as const, label: "Image Extraction", desc: "Extract and save product images" },
                  { key: "aiCorrectionEnabled" as const, label: "AI Name Correction", desc: "Auto-clean and normalize product names" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch checked={opts[key]} onCheckedChange={v => setOpts(p => ({ ...p, [key]: v }))} />
                  </div>
                ))}
              </div>

              {/* Upload progress */}
              {uploadJob.isPending && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}

              {uploadJob.isError && (
                <p className="text-xs text-red-400">Upload failed. Please try again.</p>
              )}

              <Button
                className="w-full"
                disabled={!selectedFile || uploadJob.isPending}
                onClick={() => selectedFile && uploadJob.mutate(selectedFile)}
              >
                {uploadJob.isPending ? "Uploading & processing…" : "Upload & Queue PDF"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f ?? "all"}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === f ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-card/40 animate-pulse" />)}
          </div>
        ) : data?.items.length === 0 ? (
          <Card className="bg-card/50 border-border">
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No jobs found. Create your first processing job.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data?.items.map(job => (
              <Card key={job.id} className="bg-card/50 border-border hover:bg-card/70 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wider ${STATUS_STYLES[job.status] ?? ""}`}>
                          {job.status}
                        </span>
                        <span className="font-medium truncate">{job.originalName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{job.totalPages} pages</span>
                        <span>{job.productCount} products</span>
                        <span>{job.imageCount} images</span>
                        <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                      </div>
                      {job.status === "processing" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Processing page {job.processedPages} of {job.totalPages}</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${job.progress}%` }} />
                          </div>
                        </div>
                      )}
                      {job.status === "failed" && job.error && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{job.error}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      {(job.status === "pending" || job.status === "failed") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary hover:text-primary"
                          onClick={() => processJob.mutate({ id: job.id })}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {job.status === "processing" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-amber-400 hover:text-amber-400"
                          onClick={() => cancelJob.mutate({ id: job.id })}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {job.status !== "processing" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400/60 hover:text-red-400"
                          onClick={() => deleteJob.mutate({ id: job.id })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
