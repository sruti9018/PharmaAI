"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  ArrowUpDown,
  Calendar as CalendarIcon,
  RefreshCw,
  Pill,
  Radio,
  PackagePlus,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";

// Coss UI components:
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
  TableCaption,
} from "@/components/ui/table";
import { Meter, MeterTrack, MeterIndicator } from "@/components/ui/meter";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Toolbar, ToolbarButton } from "@/components/ui/toolbar";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/menu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPopup,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import {
  NumberField,
  NumberFieldGroup,
  NumberFieldInput,
  NumberFieldIncrement,
  NumberFieldDecrement,
} from "@/components/ui/number-field";
import { Popover, PopoverTrigger, PopoverPopup } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MedicineItem {
  id: string;
  name: string;
  rfidUid: string;
  shelfLocation: string;
  unitWeightGrams: number;
  minStockCount: number;
  expiryDate: string;
  daysUntilExpiry: number;
  currentCount: number;
  weightGrams: number;
  status: "OK" | "Low" | "Out";
  isLowStock: boolean;
  isExpiringSoon: boolean;
}

export default function InventoryPage() {
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewFilter, setViewFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<MedicineItem | null>(null);

  // New Medicine Form State
  const [formName, setFormName] = useState("");
  const [formRfid, setFormRfid] = useState("");
  const [formShelf, setFormShelf] = useState("Shelf A-01");
  const [formUnitWeight, setFormUnitWeight] = useState(0.5);
  const [formMinStock, setFormMinStock] = useState(30);
  const [formInitialCount, setFormInitialCount] = useState(50);
  const [formExpiryDate, setFormExpiryDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Quick Add Stock Dialog State
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedMedForStock, setSelectedMedForStock] = useState<MedicineItem | null>(null);
  const [stockToAdd, setStockToAdd] = useState(10);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medicines");
      if (res.ok) {
        const data = await res.json();
        setMedicines(data.medicines || []);
      }
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
      toastManager.add({
        title: "Network Error",
        description: "Failed to communicate with pharmacy database.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
    setFormExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  }, []);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      // Search filter
      const matchesSearch =
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.rfidUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.shelfLocation.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status dropdown filter
      if (statusFilter === "low" && med.status !== "Low" && med.status !== "Out") return false;
      if (statusFilter === "ok" && med.status !== "OK") return false;
      if (statusFilter === "expiring" && !med.isExpiringSoon) return false;

      // Toggle group view filter
      if (viewFilter === "alerts" && !med.isLowStock && !med.isExpiringSoon) return false;
      if (viewFilter === "healthy" && (med.isLowStock || med.isExpiringSoon)) return false;

      return true;
    });
  }, [medicines, searchQuery, statusFilter, viewFilter]);

  // Paginated items
  const totalPages = Math.max(1, Math.ceil(filteredMedicines.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMedicines.slice(start, start + itemsPerPage);
  }, [filteredMedicines, currentPage]);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRfid || !formShelf || !formExpiryDate) {
      toastManager.add({
        title: "Validation Error",
        description: "Please fill in all mandatory medication fields.",
        type: "error",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          rfidUid: formRfid,
          shelfLocation: formShelf,
          unitWeightGrams: Number(formUnitWeight),
          minStockCount: Number(formMinStock),
          initialCount: Number(formInitialCount),
          expiryDate: formExpiryDate.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register medication");
      }

      toastManager.add({
        title: "Medicine Registered",
        description: `${formName} added with RFID ${formRfid}.`,
        type: "success",
      });

      setAddDialogOpen(false);
      // Reset form
      setFormName("");
      setFormRfid("");
      fetchMedicines();
    } catch (err: any) {
      toastManager.add({
        title: "Registration Failed",
        description: err.message,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!medicineToDelete) return;
    try {
      const res = await fetch(`/api/medicines/${medicineToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toastManager.add({
          title: "Medicine Deleted",
          description: `${medicineToDelete.name} has been removed from inventory.`,
          type: "success",
        });
        setDeleteDialogOpen(false);
        setMedicineToDelete(null);
        fetchMedicines();
      }
    } catch {
      toastManager.add({
        title: "Error",
        description: "Failed to delete medicine.",
        type: "error",
      });
    }
  };

  const handleQuickAddStock = async () => {
    if (!selectedMedForStock) return;
    try {
      const res = await fetch(`/api/medicines/${selectedMedForStock.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addStockCount: stockToAdd }),
      });
      if (res.ok) {
        toastManager.add({
          title: "Stock Updated",
          description: `Added ${stockToAdd} units to ${selectedMedForStock.name}.`,
          type: "success",
        });
        setStockDialogOpen(false);
        fetchMedicines();
      }
    } catch {
      toastManager.add({
        title: "Error",
        description: "Failed to update stock.",
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
            Medication Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time shelf positions, RFID hardware tags, and load cell unit counts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMedicines}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync DB</span>
          </Button>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-2">
                  <Plus className="size-4" />
                  <span>Add Medicine</span>
                </Button>
              }
            />

            <DialogPopup className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Register New Medicine</DialogTitle>
                <DialogDescription>
                  Configure medication details, physical shelf location, and load cell weight telemetry.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateMedicine} className="space-y-4 py-2">
                <Fieldset className="space-y-3">
                  <FieldsetLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Clinical Identification
                  </FieldsetLegend>

                  <Field>
                    <FieldLabel>Medicine Name &amp; Strength *</FieldLabel>
                    <Input
                      required
                      placeholder="e.g. Amoxicillin 500mg Caps"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                    <FieldDescription>Generic or trade name with unit dosage</FieldDescription>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>RFID UID Tag *</FieldLabel>
                      <Input
                        required
                        placeholder="e.g. E280116060000219"
                        value={formRfid}
                        onChange={(e) => setFormRfid(e.target.value)}
                      />
                      <FieldDescription>Hardware tag UID from RC522</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Shelf Location *</FieldLabel>
                      <Input
                        required
                        placeholder="e.g. Shelf A-04 (Antibiotics)"
                        value={formShelf}
                        onChange={(e) => setFormShelf(e.target.value)}
                      />
                      <FieldDescription>Aisle &amp; bin assignment</FieldDescription>
                    </Field>
                  </div>
                </Fieldset>

                <Fieldset className="space-y-3 border-t pt-3">
                  <FieldsetLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hardware Load Cell Calibration
                  </FieldsetLegend>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field>
                      <FieldLabel>Unit Weight (g)</FieldLabel>
                      <NumberField
                        value={formUnitWeight}
                        onValueChange={(val) => val !== null && setFormUnitWeight(val)}
                        step={0.05}
                        min={0.01}
                      >
                        <NumberFieldGroup>
                          <NumberFieldDecrement />
                          <NumberFieldInput />
                          <NumberFieldIncrement />
                        </NumberFieldGroup>
                      </NumberField>
                      <FieldDescription>Single pill/bottle weight</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Min Stock Alert</FieldLabel>
                      <NumberField
                        value={formMinStock}
                        onValueChange={(val) => val !== null && setFormMinStock(val)}
                        step={5}
                        min={1}
                      >
                        <NumberFieldGroup>
                          <NumberFieldDecrement />
                          <NumberFieldInput />
                          <NumberFieldIncrement />
                        </NumberFieldGroup>
                      </NumberField>
                      <FieldDescription>Low threshold trigger</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>Initial Count</FieldLabel>
                      <NumberField
                        value={formInitialCount}
                        onValueChange={(val) => val !== null && setFormInitialCount(val)}
                        step={10}
                        min={0}
                      >
                        <NumberFieldGroup>
                          <NumberFieldDecrement />
                          <NumberFieldInput />
                          <NumberFieldIncrement />
                        </NumberFieldGroup>
                      </NumberField>
                      <FieldDescription>Starting bottle count</FieldDescription>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Expiry Date *</FieldLabel>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          />
                        }
                      >
                        <CalendarIcon className="size-4 me-2" />
                        {formExpiryDate
                          ? formExpiryDate.toISOString().split("T")[0]
                          : "Pick medication expiry date"}
                      </PopoverTrigger>
                      <PopoverPopup align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formExpiryDate}
                          onSelect={(d) => d && setFormExpiryDate(d)}
                        />
                      </PopoverPopup>
                    </Popover>
                  </Field>
                </Fieldset>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button type="submit" loading={submitting}>
                    Register Medication
                  </Button>
                </div>
              </form>
            </DialogPopup>
          </Dialog>
        </div>
      </div>

      {/* Toolbar with Search, Select, ToggleGroup */}
      <Toolbar className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-card border rounded-2xl shadow-xs">
        <div className="flex-1 max-w-md">
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <Input
              placeholder="Search by medicine name, RFID UID, or shelf aisle..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border-0 shadow-none focus-visible:ring-0"
            />
            <InputGroupAddon align="inline-end">
              <Kbd>⌘K</Kbd>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Dropdown Filter */}
          <div className="w-40">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }
              }}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ok">Status: OK</SelectItem>
                <SelectItem value="low">Status: Low Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
              </SelectPopup>
            </Select>
          </div>

          {/* Toggle Group View Mode */}
          <ToggleGroup
            value={viewFilter ? [viewFilter] : ["all"]}
            onValueChange={(vals) => {
              if (vals && vals.length > 0) {
                setViewFilter(vals[0]);
                setCurrentPage(1);
              }
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all">All Items</ToggleGroupItem>
            <ToggleGroupItem value="alerts">Alerts Only</ToggleGroupItem>
            <ToggleGroupItem value="healthy">Healthy</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Toolbar>

      {/* Main Table */}
      <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredMedicines.length === 0 ? (
          <Empty className="py-16">
            <EmptyMedia variant="icon">
              <Pill className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No Medications Found</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? `No inventory items matched your search query "${searchQuery}".`
                : "No medications currently match the active filters."}
            </EmptyDescription>
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setViewFilter("all");
                }}
              >
                Clear all filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Table>
            <TableCaption>A real-time list of current pharmacy inventory and ESP32 weight telemetry.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine &amp; Shelf</TableHead>
                <TableHead>Unit Wt.</TableHead>
                <TableHead className="min-w-44">Stock Telemetry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((med) => {
                const stockPercent = Math.min(
                  100,
                  Math.round((med.currentCount / Math.max(med.minStockCount * 2, 1)) * 100)
                );

                return (
                  <ContextMenu key={med.id}>
                    <ContextMenuTrigger
                      render={
                        <TableRow className="hover:bg-muted/30 transition-colors cursor-context-menu" />
                      }
                    >
                      {/* Name & Shelf */}
                      <TableCell className="font-medium">
                        <div className="font-medium text-foreground">{med.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block size-1.5 rounded-full bg-primary" />
                          {med.shelfLocation}
                        </div>
                      </TableCell>

                      {/* Unit Weight */}
                      <TableCell className="text-xs text-muted-foreground">
                        {med.unitWeightGrams}g
                      </TableCell>

                      {/* Stock Telemetry with Coss Meter / Progress */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-foreground">
                              {med.currentCount} units
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              Min: {med.minStockCount} | {med.weightGrams}g
                            </span>
                          </div>
                          <Meter value={stockPercent} min={0} max={100} className="w-full">
                            <MeterTrack className="h-2 rounded-full bg-secondary">
                              <MeterIndicator
                                className={
                                  med.currentCount === 0
                                    ? "bg-destructive"
                                    : med.isLowStock
                                    ? "bg-warning"
                                    : "bg-primary"
                                }
                              />
                            </MeterTrack>
                          </Meter>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        {med.status === "OK" ? (
                          <Badge variant="outline">
                            <span
                              aria-hidden="true"
                              className="size-1.5 rounded-full bg-emerald-500"
                            />
                            In Stock
                          </Badge>
                        ) : med.status === "Low" ? (
                          <Badge variant="outline">
                            <span
                              aria-hidden="true"
                              className="size-1.5 rounded-full bg-amber-500"
                            />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <span
                              aria-hidden="true"
                              className="size-1.5 rounded-full bg-red-500"
                            />
                            Out of Stock
                          </Badge>
                        )}
                      </TableCell>

                      {/* Expiry */}
                      <TableCell>
                        <div className="text-xs text-foreground">
                          {new Date(med.expiryDate).toLocaleDateString()}
                        </div>
                        <div
                          className={cn(
                            "text-[11px]",
                            med.daysUntilExpiry <= 30
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          {med.daysUntilExpiry <= 0
                            ? "Expired"
                            : `${med.daysUntilExpiry} days left`}
                        </div>
                      </TableCell>

                      {/* Actions Menu */}
                      <TableCell className="text-right">
                        <Menu>
                          <MenuTrigger
                            className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            aria-label="Row actions"
                          >
                            <MoreVertical className="size-4" />
                          </MenuTrigger>
                          <MenuPopup align="end" side="bottom">
                            <div className="px-2 py-1.5 font-semibold text-foreground text-xs truncate">
                              {med.name}
                            </div>
                            <MenuItem
                              onClick={() => {
                                setSelectedMedForStock(med);
                                setStockDialogOpen(true);
                              }}
                            >
                              <PackagePlus className="size-4 text-primary" />
                              <span>Restock Inventory</span>
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                window.location.href = `/rfid-lookup?uid=${med.rfidUid}`;
                              }}
                            >
                              <Radio className="size-4 text-info" />
                              <span>Inspect RFID Tag</span>
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem
                              onClick={() => {
                                setMedicineToDelete(med);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="size-4" />
                              <span>Delete Medication</span>
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      </TableCell>
                    </ContextMenuTrigger>

                    {/* Context Menu on Right Click */}
                    <ContextMenuPopup>
                      <div className="px-2 py-1.5 font-semibold text-foreground text-xs truncate">
                        {med.name}
                      </div>
                      <ContextMenuItem
                        onClick={() => {
                          setSelectedMedForStock(med);
                          setStockDialogOpen(true);
                        }}
                      >
                        <PackagePlus className="size-4 text-primary" />
                        <span>Add Received Stock</span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          window.location.href = `/rfid-lookup?uid=${med.rfidUid}`;
                        }}
                      >
                        <Radio className="size-4 text-info" />
                        <span>Inspect RFID UID ({med.rfidUid})</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          setMedicineToDelete(med);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                        <span>Delete Record</span>
                      </ContextMenuItem>
                    </ContextMenuPopup>
                  </ContextMenu>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>
                  Total Inventory ({filteredMedicines.length} medicines)
                </TableCell>
                <TableCell>
                  {filteredMedicines.reduce((sum, item) => sum + item.currentCount, 0)} units total
                </TableCell>
                <TableCell colSpan={3} className="text-right">
                  ESP32 Telemetry Live
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}

        {/* Pagination */}
        {filteredMedicines.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredMedicines.length)} of{" "}
              {filteredMedicines.length} medicines
            </p>

            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="size-5" />
              Confirm Medication Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{medicineToDelete?.name}</strong>? This will permanently
              remove its RFID mapping ({medicineToDelete?.rfidUid}) and all associated load cell weight history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
              }
            />
            <AlertDialogClose
              render={
                <Button variant="destructive" onClick={handleDeleteConfirm}>
                  Delete Medication
                </Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      {/* Quick Restock Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive &amp; Restock Inventory</DialogTitle>
            <DialogDescription>
              Add newly delivered units for {selectedMedForStock?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-xl bg-muted/60 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Current Stock Count:</span>
                <span className="font-bold text-foreground">
                  {selectedMedForStock?.currentCount} units
                </span>
              </div>
              <div className="flex justify-between">
                <span>Unit Weight (g):</span>
                <span>{selectedMedForStock?.unitWeightGrams}g</span>
              </div>
              <div className="flex justify-between">
                <span>Shelf Destination:</span>
                <span>{selectedMedForStock?.shelfLocation}</span>
              </div>
            </div>

            <Field>
              <FieldLabel>Units to Add</FieldLabel>
              <NumberField
                value={stockToAdd}
                onValueChange={(val) => val !== null && setStockToAdd(val)}
                min={1}
                step={5}
              >
                <NumberFieldGroup>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldGroup>
              </NumberField>
              <FieldDescription>Simulates batch addition onto load cell shelf</FieldDescription>
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={handleQuickAddStock}>Update Stock Level</Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  );
}

