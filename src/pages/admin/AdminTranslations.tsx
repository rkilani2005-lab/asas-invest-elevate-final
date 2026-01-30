import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, Save } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Translation = Tables<"translations">;

export default function AdminTranslations() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    en_text: "",
    ar_text: "",
    category: "ui" as "ui" | "content" | "property",
  });

  const fetchTranslations = async () => {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .order("category")
      .order("key");

    if (error) {
      toast.error("Failed to load translations");
      return;
    }

    setTranslations(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTranslations();
  }, []);

  const handleDelete = async (key: string) => {
    if (!confirm("Are you sure you want to delete this translation?")) return;

    const { error } = await supabase.from("translations").delete().eq("key", key);

    if (error) {
      toast.error("Failed to delete translation");
      return;
    }

    toast.success("Translation deleted");
    fetchTranslations();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.key.trim() || !formData.en_text.trim()) {
      toast.error("Key and English text are required");
      return;
    }

    try {
      if (editingTranslation) {
        const { error } = await supabase
          .from("translations")
          .update({
            en_text: formData.en_text,
            ar_text: formData.ar_text,
            category: formData.category,
          })
          .eq("key", editingTranslation.key);

        if (error) throw error;
        toast.success("Translation updated");
      } else {
        const { error } = await supabase.from("translations").insert(formData);

        if (error) throw error;
        toast.success("Translation created");
      }

      setIsDialogOpen(false);
      setEditingTranslation(null);
      setFormData({ key: "", en_text: "", ar_text: "", category: "ui" });
      fetchTranslations();
    } catch (error: any) {
      toast.error(error.message || "Failed to save translation");
    }
  };

  const openEditDialog = (translation: Translation) => {
    setEditingTranslation(translation);
    setFormData({
      key: translation.key,
      en_text: translation.en_text,
      ar_text: translation.ar_text || "",
      category: translation.category,
    });
    setIsDialogOpen(true);
  };

  const filteredTranslations = translations.filter((t) => {
    const matchesSearch =
      t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.en_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Translations</h1>
          <p className="text-muted-foreground mt-1">
            Manage UI text for English and Arabic
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingTranslation(null);
                setFormData({ key: "", en_text: "", ar_text: "", category: "ui" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Translation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTranslation ? "Edit Translation" : "Add Translation"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., nav.home"
                  disabled={!!editingTranslation}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "ui" | "content" | "property") =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ui">UI</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="en_text">English Text *</Label>
                <Textarea
                  id="en_text"
                  value={formData.en_text}
                  onChange={(e) => setFormData({ ...formData, en_text: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ar_text">Arabic Text</Label>
                <Textarea
                  id="ar_text"
                  value={formData.ar_text}
                  onChange={(e) => setFormData({ ...formData, ar_text: e.target.value })}
                  rows={3}
                  dir="rtl"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingTranslation ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search translations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ui">UI</SelectItem>
            <SelectItem value="content">Content</SelectItem>
            <SelectItem value="property">Property</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>English</TableHead>
              <TableHead>Arabic</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTranslations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No translations found
                </TableCell>
              </TableRow>
            ) : (
              filteredTranslations.map((translation) => (
                <TableRow key={translation.key}>
                  <TableCell className="font-mono text-sm">
                    {translation.key}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {translation.en_text}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" dir="rtl">
                    {translation.ar_text || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{translation.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(translation)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(translation.key)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
