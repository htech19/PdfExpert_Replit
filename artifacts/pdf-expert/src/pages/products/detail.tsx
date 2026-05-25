import { useParams, Link } from "wouter";
import { useState } from "react";
import { useGetProduct, useUpdateProduct, getGetProductQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Edit2, Save, X, Image, Tag, Package } from "lucide-react";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) }
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: (updated) => {
        qc.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setEditing(false);
      }
    }
  });

  const startEdit = () => {
    if (!product) return;
    setForm({
      cleanName: product.cleanName,
      sku: product.sku ?? "",
      brand: product.brand ?? "",
      category: product.category ?? "",
      subcategory: product.subcategory ?? "",
      color: product.color ?? "",
      material: product.material ?? "",
      size: product.size ?? "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    updateProduct.mutate({
      id,
      data: {
        cleanName: form.cleanName || undefined,
        sku: form.sku || null,
        brand: form.brand || null,
        category: form.category || null,
        subcategory: form.subcategory || null,
        color: form.color || null,
        material: form.material || null,
        size: form.size || null,
      }
    });
  };

  if (isLoading) return <div className="p-8 animate-pulse space-y-4"><div className="h-8 w-48 bg-card/40 rounded" /><div className="h-48 bg-card/40 rounded-lg" /></div>;
  if (!product) return <div className="p-8 text-center text-muted-foreground">Product not found.</div>;

  const fields = [
    { key: "sku", label: "SKU" },
    { key: "brand", label: "Brand" },
    { key: "category", label: "Category" },
    { key: "subcategory", label: "Subcategory" },
    { key: "color", label: "Color" },
    { key: "material", label: "Material" },
    { key: "size", label: "Size" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/products">
            <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold truncate">{product.cleanName}</h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={updateProduct.isPending}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit}><Edit2 className="w-3.5 h-3.5 mr-1" /> Edit</Button>
          )}
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Name Comparison */}
        {product.rawName !== product.cleanName && (
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> AI Name Correction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Original (raw)</p>
                  <p className="font-mono text-sm text-red-400/80 bg-red-500/5 px-3 py-2 rounded border border-red-500/20 line-through">{product.rawName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Corrected</p>
                  <p className="font-mono text-sm text-emerald-400 bg-emerald-500/5 px-3 py-2 rounded border border-emerald-500/20">{product.cleanName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Info */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-emerald-400" /> Product Data</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Clean Name</Label>
                    <Input
                      value={form.cleanName ?? ""}
                      onChange={e => setForm(p => ({ ...p, cleanName: e.target.value }))}
                      className="mt-1 bg-background border-border h-8 text-sm"
                    />
                  </div>
                  {fields.map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={form[key] ?? ""}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        className="mt-1 bg-background border-border h-8 text-sm"
                        placeholder={`Enter ${label.toLowerCase()}...`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map(({ key, label }) => {
                    const val = product[key as keyof typeof product] as string | null;
                    return val ? (
                      <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium">{val}</span>
                      </div>
                    ) : null;
                  })}
                  {product.slug && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-muted-foreground">Slug</span>
                      <span className="text-sm font-mono text-muted-foreground">{product.slug}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-400" /> Images ({product.imageCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {product.images.map(img => (
                    <div key={img.id} className="aspect-square rounded-lg bg-secondary/30 border border-border flex flex-col items-center justify-center gap-2">
                      <Image className="w-8 h-8 text-muted-foreground/40" />
                      <div className="text-center px-2">
                        <p className="text-xs font-mono text-muted-foreground truncate w-full">{img.filename}</p>
                        {img.width && img.height && (
                          <p className="text-xs text-muted-foreground/60">{img.width}×{img.height}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No images extracted
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
