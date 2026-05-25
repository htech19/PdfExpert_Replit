import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useListProducts, useDeleteProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Trash2, Search, Package, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProductsList() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const jobIdParam = params.get("jobId");

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const qc = useQueryClient();

  const listParams = {
    limit: 30,
    ...(query ? { search: query } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(jobIdParam ? { jobId: parseInt(jobIdParam, 10) } : {}),
  };

  const { data, isLoading } = useListProducts(listParams, {
    query: { queryKey: getListProductsQueryKey(listParams), refetchInterval: 5000 }
  });

  const deleteProduct = useDeleteProduct({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListProductsQueryKey() }) }
  });

  const CATEGORIES = ["Armários", "Estantes", "Mesas", "Cadeiras", "Sofás", "Camas", "Poltronas", "Racks"];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/30 sticky top-0 z-10 backdrop-blur-sm">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          Product Catalog
          {data?.total != null && <span className="text-sm font-normal text-muted-foreground ml-1">({data.total} total)</span>}
        </h1>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9 bg-background border-border h-8 text-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="p-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!categoryFilter ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? undefined : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${categoryFilter === cat ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-card/40 rounded-lg animate-pulse" />)}
          </div>
        ) : data?.items.length === 0 ? (
          <Card className="bg-card/50 border-border">
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Package className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No products found. Process a PDF job to extract products.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.items.map(product => (
              <Card key={product.id} className="bg-card/50 border-border hover:bg-card/70 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight mb-1">{product.cleanName}</p>
                      {product.rawName !== product.cleanName && (
                        <p className="text-xs text-muted-foreground line-through truncate">{product.rawName}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/products/${product.id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400/60 hover:text-red-400"
                        onClick={() => deleteProduct.mutate({ id: product.id })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {product.brand && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-primary/15 text-primary border border-primary/20">{product.brand}</span>
                    )}
                    {product.category && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-secondary text-muted-foreground">{product.category}</span>
                    )}
                    {product.color && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-secondary text-muted-foreground">{product.color}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {product.sku && <span className="font-mono">{product.sku}</span>}
                      <span className="flex items-center gap-1"><Image className="w-3 h-3" />{product.imageCount}</span>
                    </div>
                    <span>{formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}</span>
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
