import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import IconSelector from "@/components/admin/IconSelector";

interface AmenityLibraryItem {
  id: string;
  name_en: string;
  name_ar: string | null;
  icon: string;
  category: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

const CATEGORIES = [
  "General",
  "Recreation",
  "Security",
  "Fitness",
  "Wellness",
  "Business",
  "Family",
  "Outdoor",
  "Parking",
  "Services",
];

const defaultFormData = {
  name_en: "",
  name_ar: "",
  icon: "Star",
  category: "General",
  is_active: true,
};

export default function AdminAmenityLibrary() {
  const [amenities, setAmenities] = useState<AmenityLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchAmenities();
  }, []);

  async function fetchAmenities() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("amenity_library")
      .select("*")
      .order("category")
      .order("name_en");

    if (error) {
      toast.error("Failed to load amenities");
      console.error(error);
    } else {
      setAmenities(data || []);
    }
    setIsLoading(false);
  }

  function openCreateDialog() {
    setEditingId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  }

  function openEditDialog(amenity: AmenityLibraryItem) {
    setEditingId(amenity.id);
    setFormData({
      name_en: amenity.name_en,
      name_ar: amenity.name_ar || "",
      icon: amenity.icon,
      category: amenity.category || "General",
      is_active: amenity.is_active ?? true,
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name_en.trim()) {
      toast.error("English name is required");
      return;
    }

    setIsSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("amenity_library")
          .update({
            name_en: formData.name_en,
            name_ar: formData.name_ar || null,
            icon: formData.icon,
            category: formData.category,
            is_active: formData.is_active,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Amenity updated");
      } else {
        const { error } = await supabase.from("amenity_library").insert({
          name_en: formData.name_en,
          name_ar: formData.name_ar || null,
          icon: formData.icon,
          category: formData.category,
          is_active: formData.is_active,
        });

        if (error) throw error;
        toast.success("Amenity created");
      }

      setIsDialogOpen(false);
      fetchAmenities();
    } catch (error: any) {
      toast.error(error.message || "Failed to save amenity");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("amenity_library")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("Amenity deleted");
      setDeleteId(null);
      fetchAmenities();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete amenity");
    }
  }

  // Group amenities by category
  const groupedAmenities = amenities.reduce((acc, amenity) => {
    const cat = amenity.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(amenity);
    return acc;
  }, {} as Record<string, AmenityLibraryItem[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Amenity Library</h1>
          <p className="text-muted-foreground text-sm">
            Manage reusable amenities for properties
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Amenity
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Icon</TableHead>
              <TableHead>Name (EN)</TableHead>
              <TableHead>Name (AR)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-[80px]">Active</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {amenities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No amenities yet. Click "Add Amenity" to create one.
                </TableCell>
              </TableRow>
            ) : (
              amenities.map((amenity) => {
                const IconComponent = getIconComponent(amenity.icon);
                return (
                  <TableRow key={amenity.id}>
                    <TableCell>
                      {IconComponent && <IconComponent className="h-5 w-5 text-accent" />}
                    </TableCell>
                    <TableCell className="font-medium">{amenity.name_en}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {amenity.name_ar || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {amenity.category || "General"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          amenity.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {amenity.is_active ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(amenity)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(amenity.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Amenity" : "Add Amenity"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name (English) *</Label>
              <Input
                value={formData.name_en}
                onChange={(e) =>
                  setFormData({ ...formData, name_en: e.target.value })
                }
                placeholder="e.g., Swimming Pool"
              />
            </div>

            <div className="space-y-2">
              <Label>Name (Arabic)</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) =>
                  setFormData({ ...formData, name_ar: e.target.value })
                }
                placeholder="e.g., مسبح"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <IconSelector
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Amenity</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this amenity? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to get icon component from string
import * as LucideIcons from "lucide-react";

function getIconComponent(iconName: string) {
  const icons = LucideIcons as Record<string, any>;
  return icons[iconName] || icons["Star"];
}
