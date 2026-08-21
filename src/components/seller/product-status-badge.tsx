import { Badge } from "@/components/ui/badge";
import { productStatusLabels } from "@/lib/marketplace/products";
import type { ProductStatus } from "@/lib/supabase/database.types";

const variants: Record<ProductStatus, "accent" | "default" | "muted" | "outline" | "secondary"> = {
  APPROVED: "default",
  DRAFT: "muted",
  FLAGGED: "accent",
  NEEDS_CHANGES: "accent",
  OUT_OF_STOCK: "outline",
  PENDING_REVIEW: "secondary",
  REJECTED: "outline",
  SUSPENDED: "outline",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={variants[status]}>{productStatusLabels[status]}</Badge>;
}
