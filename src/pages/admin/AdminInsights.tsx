import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Insight {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  category: string;
  is_featured: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string | null;
}

const categories = [
  { value: "all", label: "All Categories" },
  { value: "market_news", label: "Market News" },
  { value: "project_updates", label: "Project Updates" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "investment_guide", label: "Investment Guide" },
];

const statuses = [
  { value: "all", label: "All Status" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "featured", label: "Featured" },
];

export default function AdminInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInsights();
  }, []);

  async function fetchInsights() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("insights")
      .select("id, slug, title_en, title_ar, category, is_featured, is_published, published_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load insights");
      console.error(error);
    } else {
      setInsights(data || []);
    }
    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("insights").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete insight");
    } else {
      toast.success("Insight deleted");
      fetchInsights();
    }
  }

  async function toggleFeatured(id: string, currentValue: boolean) {
    const { error } = await supabase
      .from("insights")
      .update({ is_featured: !currentValue })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(currentValue ? "Removed from featured" : "Marked as featured");
      fetchInsights();
    }
  }

  const filteredInsights = insights.filter((insight) => {
    const matchesSearch = insight.title_en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || insight.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && insight.is_published) ||
      (statusFilter === "draft" && !insight.is_published) ||
      (statusFilter === "featured" && insight.is_featured);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryLabel = (value: string) => {
    return categories.find((c) => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Insights</h1>
          <p className="text-muted-foreground mt-1">
            Manage blog posts and news articles
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/insights/new">
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredInsights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No insights found
                </TableCell>
              </TableRow>
            ) : (
              filteredInsights.map((insight) => (
                <TableRow key={insight.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {insight.is_featured && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                      <span className="font-medium">{insight.title_en}</span>
                    </div>
                    {insight.title_ar && (
                      <span className="text-sm text-muted-foreground block" dir="rtl">
                        {insight.title_ar}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(insight.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    {insight.is_published ? (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {insight.published_at
                      ? format(new Date(insight.published_at), "MMM d, yyyy")
                      : insight.created_at
                      ? format(new Date(insight.created_at), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeatured(insight.id, insight.is_featured)}
                        title={insight.is_featured ? "Remove from featured" : "Mark as featured"}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            insight.is_featured ? "fill-yellow-400 text-yellow-400" : ""
                          }`}
                        />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/insights/${insight.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{insight.title_en}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(insight.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
