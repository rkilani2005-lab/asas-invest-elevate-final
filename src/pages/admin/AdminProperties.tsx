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
import { Plus, Pencil, Trash2, Search, Eye, Star, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type PropertyWithMedia = Tables<"properties"> & {
  media: Tables<"media">[];
};

export default function AdminProperties() {
  const [properties, setProperties] = useState<PropertyWithMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*, media(*)")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Failed to load properties");
      return;
    }

    setProperties((data as PropertyWithMedia[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete property");
      return;
    }

    toast.success("Property deleted");
    fetchProperties();
  };

  const toggleFeatured = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from("properties")
      .update({ is_featured: !currentValue })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
      return;
    }

    toast.success(currentValue ? "Removed from featured" : "Marked as featured");
    fetchProperties();
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-600 hover:bg-green-500/20";
      case "reserved":
        return "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20";
      case "sold":
        return "bg-red-500/10 text-red-600 hover:bg-red-500/20";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage property listings
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/properties/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredProperties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No properties found
                </TableCell>
              </TableRow>
            ) : (
              filteredProperties.map((property) => {
                const heroImage = property.media?.find(m => m.type === "hero")?.url || 
                                 property.media?.find(m => m.type === "render")?.url ||
                                 property.media?.[0]?.url;
                return (
                <TableRow key={property.id}>
                  <TableCell>
                    {heroImage ? (
                      <img 
                        src={heroImage} 
                        alt={property.name_en} 
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {property.is_featured && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                      <span className="font-medium">{property.name_en}</span>
                    </div>
                    {property.name_ar && (
                      <span className="text-sm text-muted-foreground block" dir="rtl">
                        {property.name_ar}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{property.location_en || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={property.type === "off-plan" ? "default" : "secondary"}>
                      {property.type === "off-plan" ? "Off-Plan" : "Ready"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(property.status)}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeatured(property.id, property.is_featured)}
                        title={property.is_featured ? "Remove from featured" : "Mark as featured"}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            property.is_featured ? "fill-yellow-400 text-yellow-400" : ""
                          }`}
                        />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={`/property/${property.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/admin/properties/${property.id}/edit`} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{property.name_en}" and all associated media, amenities, and payment milestones. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(property.id)}
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
              );})
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
