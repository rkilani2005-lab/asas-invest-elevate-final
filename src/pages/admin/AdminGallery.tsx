import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Building2,
  Eye,
  X,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Pencil,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { compressImage, getExtensionFromBlob } from "@/lib/image-compression";

interface UploadProgress {
  fileName: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

type MediaRow = Tables<"media">;
type PropertyRow = Tables<"properties">;

const GALLERY_CATEGORIES = [
  { value: "exterior", label: "Exterior", labelAr: "الخارج" },
  { value: "interior", label: "Interior", labelAr: "الداخل" },
  { value: "amenities", label: "Amenities", labelAr: "المرافق" },
  { value: "views", label: "Views", labelAr: "الإطلالات" },
  { value: "lifestyle", label: "Lifestyle", labelAr: "نمط الحياة" },
];

const MEDIA_TYPES_FOR_GALLERY = ["render", "interior"] as const;

interface SortableImageProps {
  image: MediaRow;
  onDelete: (id: string) => void;
  onPreview: (url: string) => void;
  onEdit: (image: MediaRow) => void;
}

function SortableImage({ image, onDelete, onPreview, onEdit }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isHero = image.type === "hero";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border border-border hover:border-accent/50 transition-colors"
    >
      <img
        src={image.url}
        alt={image.caption_en || "Gallery image"}
        className="w-full h-full object-cover"
      />
      {isHero && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded z-10">
          Hero
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
        <div className={`absolute top-2 ${isHero ? 'left-14' : 'left-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 bg-background/90 rounded hover:bg-background cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(image)}
            className="p-1.5 bg-background/90 rounded hover:bg-background"
            title="Edit"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => onPreview(image.url)}
            className="p-1.5 bg-background/90 rounded hover:bg-background"
            title="Preview"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => onDelete(image.id)}
            className="p-1.5 bg-destructive/90 rounded hover:bg-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive-foreground" />
          </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-white text-xs truncate">
          {image.caption_en || "No caption"}
        </p>
        <p className="text-white/70 text-[10px] capitalize">
          {image.category || "uncategorized"}
        </p>
      </div>
    </div>
  );
}

export default function AdminGallery() {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadForm, setUploadForm] = useState({
    category: "exterior",
    caption_en: "",
    caption_ar: "",
    showInHero: false,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<MediaRow | null>(null);
  const [editForm, setEditForm] = useState({
    category: "",
    caption_en: "",
    caption_ar: "",
    showInHero: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["admin-properties-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name_en, name_ar, slug")
        .order("name_en");
      if (error) throw error;
      return data as PropertyRow[];
    },
  });

  // Fetch gallery media for selected property
  const { data: galleryMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ["admin-gallery-media", selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("property_id", selectedPropertyId)
        .in("type", MEDIA_TYPES_FOR_GALLERY)
        .order("order_index");
      if (error) throw error;
      return data as MediaRow[];
    },
    enabled: !!selectedPropertyId,
  });

  // Filter media by category
  const filteredMedia =
    activeCategory === "all"
      ? galleryMedia
      : galleryMedia?.filter((m) => m.category === activeCategory);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedPropertyId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("property-media").getPublicUrl(fileName);

      const maxOrder =
        galleryMedia?.reduce(
          (max, m) => Math.max(max, m.order_index || 0),
          0
        ) || 0;

      const { error: insertError } = await supabase.from("media").insert({
        property_id: selectedPropertyId,
        url: publicUrl,
        type: "render",
        category: uploadForm.category,
        caption_en: uploadForm.caption_en || null,
        caption_ar: uploadForm.caption_ar || null,
        order_index: maxOrder + 1,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-gallery-media", selectedPropertyId],
      });
      toast.success("Image uploaded successfully");
      setUploadForm({ category: "exterior", caption_en: "", caption_ar: "", showInHero: false });
    },
    onError: (error) => {
      toast.error("Failed to upload image");
      console.error(error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await supabase.from("media").delete().eq("id", mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-gallery-media", selectedPropertyId],
      });
      toast.success("Image deleted");
    },
    onError: () => {
      toast.error("Failed to delete image");
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      for (const item of items) {
        await supabase
          .from("media")
          .update({ order_index: item.order_index })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-gallery-media", selectedPropertyId],
      });
    },
  });

  // Update mutation for editing
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; category: string; caption_en: string | null; caption_ar: string | null; type: "hero" | "render" }) => {
      const { error } = await supabase
        .from("media")
        .update({
          category: data.category,
          caption_en: data.caption_en,
          caption_ar: data.caption_ar,
          type: data.type,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-gallery-media", selectedPropertyId],
      });
      toast.success("Image updated successfully");
      setEditDialogOpen(false);
      setEditingImage(null);
    },
    onError: () => {
      toast.error("Failed to update image");
    },
  });

  const handleOpenEdit = useCallback((image: MediaRow) => {
    setEditingImage(image);
    setEditForm({
      category: image.category || "exterior",
      caption_en: image.caption_en || "",
      caption_ar: image.caption_ar || "",
      showInHero: image.type === "hero",
    });
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingImage) return;
    updateMutation.mutate({
      id: editingImage.id,
      category: editForm.category,
      caption_en: editForm.caption_en || null,
      caption_ar: editForm.caption_ar || null,
      type: editForm.showInHero ? "hero" : "render",
    });
  }, [editingImage, editForm, updateMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles(Array.from(files));
    setUploadProgress(
      Array.from(files).map((f) => ({
        fileName: f.name,
        status: "pending" as const,
        progress: 0,
      }))
    );
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    let currentMaxOrder =
      galleryMedia?.reduce((max, m) => Math.max(max, m.order_index || 0), 0) || 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Show compressing status
      setUploadProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "uploading" as const, progress: 10 } : p
        )
      );

      try {
        // Compress the image
        const originalSize = file.size;
        const compressedBlob = await compressImage(file);
        const compressionRatio = ((1 - compressedBlob.size / originalSize) * 100).toFixed(0);
        
        console.log(`Compressed ${file.name}: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedBlob.size / 1024).toFixed(0)}KB (${compressionRatio}% reduction)`);

        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: 40 } : p
          )
        );

        // Determine file extension based on blob type
        const fileExt = getExtensionFromBlob(compressedBlob);
        const fileName = `${selectedPropertyId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("property-media")
          .upload(fileName, compressedBlob, {
            contentType: compressedBlob.type,
          });

        if (uploadError) throw uploadError;

        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: 70 } : p
          )
        );

        const {
          data: { publicUrl },
        } = supabase.storage.from("property-media").getPublicUrl(fileName);

        currentMaxOrder += 1;

        const { error: insertError } = await supabase.from("media").insert({
          property_id: selectedPropertyId,
          url: publicUrl,
          type: uploadForm.showInHero ? "hero" : "render",
          category: uploadForm.category,
          caption_en: uploadForm.caption_en || null,
          caption_ar: uploadForm.caption_ar || null,
          order_index: currentMaxOrder,
        });

        if (insertError) throw insertError;

        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: "success" as const, progress: 100 } : p
          )
        );
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, status: "error" as const, error: "Upload failed" }
              : p
          )
        );
      }
    }

    const successCount = uploadProgress.filter((p) => p.status === "success").length;
    queryClient.invalidateQueries({
      queryKey: ["admin-gallery-media", selectedPropertyId],
    });

    setTimeout(() => {
      setUploading(false);
      setSelectedFiles([]);
      setUploadProgress([]);
      setUploadDialogOpen(false);
      setUploadForm({ category: "exterior", caption_en: "", caption_ar: "", showInHero: false });
      toast.success(`${selectedFiles.length} images uploaded successfully`);
    }, 1000);
  };

  const resetUploadDialog = useCallback(() => {
    setSelectedFiles([]);
    setUploadProgress([]);
    setUploadForm({ category: "exterior", caption_en: "", caption_ar: "", showInHero: false });
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !filteredMedia) return;

    const oldIndex = filteredMedia.findIndex((m) => m.id === active.id);
    const newIndex = filteredMedia.findIndex((m) => m.id === over.id);

    const newOrder = arrayMove(filteredMedia, oldIndex, newIndex);
    const updates = newOrder.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));

    reorderMutation.mutate(updates);
  };

  const categoryCounts = GALLERY_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.value] =
        galleryMedia?.filter((m) => m.category === cat.value).length || 0;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Property Gallery</h1>
          <p className="text-muted-foreground">
            Manage gallery images for each property
          </p>
        </div>
      </div>

      {/* Property Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedPropertyId}
              onValueChange={setSelectedPropertyId}
            >
              <SelectTrigger className="w-full md:w-96">
                <SelectValue placeholder="Choose a property to manage gallery..." />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Gallery Management */}
      {selectedPropertyId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Gallery Images
            </CardTitle>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Images
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Gallery Images</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={uploadForm.category}
                      onValueChange={(v) =>
                        setUploadForm((prev) => ({ ...prev, category: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GALLERY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label} / {cat.labelAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Caption (EN)</Label>
                      <Input
                        value={uploadForm.caption_en}
                        onChange={(e) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            caption_en: e.target.value,
                          }))
                        }
                        placeholder="Image caption"
                      />
                    </div>
                    <div>
                      <Label>Caption (AR)</Label>
                      <Input
                        value={uploadForm.caption_ar}
                        onChange={(e) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            caption_ar: e.target.value,
                          }))
                        }
                        placeholder="عنوان الصورة"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="showInHero"
                      checked={uploadForm.showInHero}
                      onCheckedChange={(checked) =>
                        setUploadForm((prev) => ({ ...prev, showInHero: checked === true }))
                      }
                    />
                    <Label htmlFor="showInHero" className="text-sm cursor-pointer">
                      Show in Property Hero Slider
                    </Label>
                  </div>
                  <div>
                    <Label>Select Images</Label>
                    <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="gallery-upload"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                      <label
                        htmlFor="gallery-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Click to select images or drag & drop
                        </span>
                        <span className="text-xs text-muted-foreground">
                          You can select multiple files at once
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>{selectedFiles.length} file(s) selected</Label>
                        {!uploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetUploadDialog}
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {selectedFiles.map((file, index) => {
                          const progress = uploadProgress[index];
                          return (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                            >
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{file.name}</p>
                                {progress?.status === "uploading" && (
                                  <Progress value={progress.progress} className="h-1 mt-1" />
                                )}
                                {progress?.status === "error" && (
                                  <p className="text-xs text-destructive">
                                    {progress.error}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {progress?.status === "pending" && !uploading && (
                                  <button
                                    onClick={() => removeSelectedFile(index)}
                                    className="p-1 hover:bg-muted rounded"
                                  >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                )}
                                {progress?.status === "uploading" && (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                )}
                                {progress?.status === "success" && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {progress?.status === "error" && (
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        onClick={handleBulkUpload}
                        disabled={uploading || selectedFiles.length === 0}
                        className="w-full gap-2"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload {selectedFiles.length} Image(s)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {/* Category Tabs */}
            <Tabs
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs">
                  All ({galleryMedia?.length || 0})
                </TabsTrigger>
                {GALLERY_CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat.value}
                    value={cat.value}
                    className="text-xs"
                  >
                    {cat.label} ({categoryCounts[cat.value]})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeCategory} className="mt-0">
                {mediaLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                    ))}
                  </div>
                ) : filteredMedia && filteredMedia.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={filteredMedia.map((m) => m.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredMedia.map((media) => (
                          <SortableImage
                            key={media.id}
                            image={media}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onPreview={setPreviewImage}
                            onEdit={handleOpenEdit}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No images in this category</p>
                    <p className="text-sm">
                      Click "Add Images" to upload gallery photos
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Edit Image Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingImage && (
              <div className="flex justify-center">
                <img
                  src={editingImage.url}
                  alt="Preview"
                  className="max-h-40 rounded-lg object-contain"
                />
              </div>
            )}
            <div>
              <Label>Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) =>
                  setEditForm((prev) => ({ ...prev, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GALLERY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label} / {cat.labelAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Caption (EN)</Label>
                <Input
                  value={editForm.caption_en}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      caption_en: e.target.value,
                    }))
                  }
                  placeholder="Image caption"
                />
              </div>
              <div>
                <Label>Caption (AR)</Label>
                <Input
                  value={editForm.caption_ar}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      caption_ar: e.target.value,
                    }))
                  }
                  placeholder="عنوان الصورة"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="editShowInHero"
                checked={editForm.showInHero}
                onCheckedChange={(checked) =>
                  setEditForm((prev) => ({ ...prev, showInHero: checked === true }))
                }
              />
              <Label htmlFor="editShowInHero" className="text-sm cursor-pointer">
                Show in Property Hero Slider
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
}
