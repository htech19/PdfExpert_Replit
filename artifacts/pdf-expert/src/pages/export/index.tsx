import { useState } from "react";
import { useListExports, useExportProducts, getListExportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle, Loader2, FileJson, FileText, Table, ShoppingBag, ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  csv: <FileText className="w-5 h-5 text-emerald-400" />,
  json: <FileJson className="w-5 h-5 text-blue-400" />,
  xlsx: <Table className="w-5 h-5 text-green-400" />,
  shopify: <ShoppingBag className="w-5 h-5 text-purple-400" />,
  woocommerce: <ShoppingCart className="w-5 h-5 text-orange-400" />,
};

const FORMAT_DESCRIPTIONS: Record<string, string> = {
  csv: "Universal CSV — compatible with any spreadsheet or ERP",
  json: "Structured JSON — for API integrations and custom pipelines",
  xlsx: "Excel spreadsheet — formatted for human review",
  shopify: "Shopify product import CSV — ready to upload",
  woocommerce: "WooCommerce product import CSV — ready to upload",
};

export default function ExportCenter() {
  const qc = useQueryClient();
  const [format, setFormat] = useState<"csv" | "json" | "xlsx" | "shopify" | "woocommerce">("csv");
  const [includeImages, setIncludeImages] = useState(false);

  const { data: exports } = useListExports({ query: { refetchInterval: 5000 } });

  const exportProducts = useExportProducts({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListExportsQueryKey() }) }
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export Center
        </h1>
      </header>

      <div className="p-8 space-y-6">
        {/* Export Config */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Generate Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Cards */}
            <div>
              <Label className="text-xs text-muted-foreground mb-3 block">Output Format</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {(["csv", "json", "xlsx", "shopify", "woocommerce"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`p-4 rounded-lg border text-left transition-all ${format === f ? "border-primary bg-primary/10" : "border-border bg-card/30 hover:bg-card/50"}`}
                  >
                    <div className="mb-2">{FORMAT_ICONS[f]}</div>
                    <p className="text-sm font-medium uppercase">{f}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-tight">{FORMAT_DESCRIPTIONS[f]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-border">
              <div>
                <p className="text-sm font-medium">Include image references</p>
                <p className="text-xs text-muted-foreground">Add image filename paths to export</p>
              </div>
              <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
            </div>

            <Button
              className="gap-2"
              disabled={exportProducts.isPending}
              onClick={() => exportProducts.mutate({ data: { format, includeImages } })}
            >
              {exportProducts.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4" /> Export All Products as {format.toUpperCase()}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export History */}
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Export History</CardTitle>
          </CardHeader>
          <CardContent>
            {!exports || exports.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No exports yet. Generate your first export above.</p>
            ) : (
              <div className="space-y-2">
                {exports.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      {FORMAT_ICONS[exp.format] ?? <FileText className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium font-mono">{exp.filename}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{exp.productCount} products</span>
                          <span>{formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {exp.status === "ready" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : exp.status === "generating" ? (
                        <span className="flex items-center gap-1 text-xs text-blue-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating
                        </span>
                      ) : (
                        <span className="text-xs text-red-400">Failed</span>
                      )}
                      {exp.downloadUrl && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border/50">
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
