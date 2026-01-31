import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Loader2, GripVertical, Video, Image } from "lucide-react";
import { toast } from "sonner";
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
import type { PropertyData, MediaItem, MediaType } from "../types";

interface MediaStepProps {
  data: PropertyData;
  onChange: (updates: Partial<PropertyData>) => void;
  propertyId?: string;
}

const mediaCategories = [
  { value: "exterior", label: "Exterior Renders" },
  { value: "interior", label: "Interior Photography" },
  { value: "material_board", label: "Material Board" },
  { value: "amenities", label: "Amenities & Facilities" },
  { value: "lifestyle", label: "Lifestyle / Community" },
  { value: "floorplan", label: "Floor Plans" },
  { value: "construction", label: "Construction Progress" },
];

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: "render", label: "Render" },
  { value: "interior", label: "Interior" },
  { value: "hero", label: "Hero Image" },
  { value: "floorplan", label: "Floor Plan" },
  { value: "floor_plate", label: "Floor Plate" },
  { value: "material", label: "Material" },
  { value: "brochure", label: "Brochure" },
];

function SortableMediaItem({
  item,
  onUpdate,
  onDelete,
}: {
  item: MediaItem;
  onUpdate: (id: string, updates: Partial<MediaItem>) => void;
  onDelete: (id: string) => void;
}) {
  const id = item.id || item.url;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-muted rounded-lg overflow-hidden"
    >
      <img
        src={item.url}
        alt={item.caption_en || "Property media"}
        className="w-full h-32 object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="p-2 bg-white/20 rounded-lg hover:bg-white/30 cursor-grab"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={() => onDelete(id)}
          className="p-2 bg-destructive/80 rounded-lg hover:bg-destructive"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="p-2 space-y-2">
        <Select
          value={item.category}
          onValueChange={(value) => onUpdate(id, { category: value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {mediaCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={item.caption_en || ""}
          onChange={(e) => onUpdate(id, { caption_en: e.target.value })}
          placeholder="Caption (EN)"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export default function MediaStep({ data, onChange, propertyId }: MediaStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newMedia: MediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `properties/${propertyId || "new"}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("property-media")
        .upload(fileName, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("property-media")
        .getPublicUrl(fileName);

      newMedia.push({
        id: crypto.randomUUID(),
        url: urlData.publicUrl,
        type: "render",
        category: "exterior",
        order_index: data.media.length + i,
      });
    }

    if (newMedia.length > 0) {
      onChange({ media: [...data.media, ...newMedia] });
      toast.success(`${newMedia.length} image(s) uploaded`);
    }

    setIsUploading(false);
    e.target.value = "";
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVideoUploading(true);
    const fileName = `properties/${propertyId || "new"}/video-${Date.now()}.mp4`;

    const { error } = await supabase.storage
      .from("property-media")
      .upload(fileName, file, { contentType: "video/mp4" });

    if (error) {
      toast.error("Failed to upload video");
    } else {
      const { data: urlData } = supabase.storage
        .from("property-media")
        .getPublicUrl(fileName);
      onChange({ video_url: urlData.publicUrl });
      toast.success("Video uploaded");
    }

    setIsVideoUploading(false);
    e.target.value = "";
  }

  function updateMediaItem(id: string, updates: Partial<MediaItem>) {
    onChange({
      media: data.media.map((item) =>
        (item.id || item.url) === id ? { ...item, ...updates } : item
      ),
    });
  }

  function deleteMediaItem(id: string) {
    onChange({
      media: data.media.filter((item) => (item.id || item.url) !== id),
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.media.findIndex((item) => (item.id || item.url) === active.id);
    const newIndex = data.media.findIndex((item) => (item.id || item.url) === over.id);

    onChange({
      media: arrayMove(data.media, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order_index: index,
      })),
    });
  }

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Property Images
          </CardTitle>
          <CardDescription>
            Upload and categorize property images. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Zone */}
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click or drag images to upload
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Supports JPG, PNG, WebP (multiple files)
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>

          {/* Image Grid */}
          {data.media.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={data.media.map((m) => m.id || m.url)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.media.map((item) => (
                    <SortableMediaItem
                      key={item.id || item.url}
                      item={item}
                      onUpdate={updateMediaItem}
                      onDelete={deleteMediaItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Video */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Property Video
          </CardTitle>
          <CardDescription>
            Upload a native video or provide a YouTube/Vimeo URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Upload Video (.mp4)</Label>
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                {isVideoUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Upload MP4
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="video/mp4"
                  className="hidden"
                  onChange={handleVideoUpload}
                  disabled={isVideoUploading}
                />
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_url">Or Video URL</Label>
              <Input
                id="video_url"
                value={data.video_url}
                onChange={(e) => onChange({ video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
              {data.video_url && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {data.video_url}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange({ video_url: "" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Embed */}
      <Card>
        <CardHeader>
          <CardTitle>Google Maps</CardTitle>
          <CardDescription>
            Paste Google Maps embed code or coordinates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="map_embed">Map Embed Code</Label>
            <Input
              id="map_embed"
              value={data.map_embed_code}
              onChange={(e) => onChange({ map_embed_code: e.target.value })}
              placeholder='<iframe src="https://maps.google.com/..." />'
            />
          </div>
          {data.map_embed_code && (
            <div
              className="w-full h-48 rounded-lg overflow-hidden bg-muted"
              dangerouslySetInnerHTML={{ __html: data.map_embed_code }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
