import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ItemDialog } from "@/components/inventory/item-dialog";
import { useArchiveInventoryItem, useInventory, type InventoryItem } from "@/lib/inventory";
import { useToast } from "@/components/toast";
import { formatMoney } from "@/lib/utils";
import { CATEGORIES, type Category } from "@tayyaba/shared";

const CATEGORY_LABEL: Record<Category, string> = { FOOD: "Food", SITTING: "Sitting", SERVICE: "Services" };

export function InventoryPage() {
  const [category, setCategory] = useState<Category>("FOOD");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const { data: items = [] } = useInventory({ category, active: includeArchived ? undefined : true });
  const archive = useArchiveInventoryItem();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">Inventory</h1>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="h-4 w-4 rounded-sm border-border accent-primary"
        />
        Include archived
      </label>

      <div className="mt-4">
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No items in {CATEGORY_LABEL[category]} yet. Add one before creating a booking.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={!item.active ? "opacity-50" : ""}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>
                    {item.name}
                    {!item.active && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.unit === "PER_HEAD" ? "per head" : "per hour"}</TableCell>
                  <TableCell className="tabular-nums">{formatMoney(item.defaultPrice)}</TableCell>
                  <TableCell>{item.taxRate}%</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(item);
                            setDialogOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        {item.active && (
                          <DropdownMenuItem
                            onClick={() =>
                              archive.mutate(item.id, { onSuccess: () => toast("Item archived.") })
                            }
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={category}
        editing={editing}
        existingCodes={items.map((i) => i.code)}
      />
    </div>
  );
}
