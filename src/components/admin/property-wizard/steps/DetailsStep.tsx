import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "@/components/admin/RichTextEditor";
import IconSelector from "@/components/admin/IconSelector";
import type { PropertyData, AmenityItem, NearbyPlace } from "../types";

interface DetailsStepProps {
  data: PropertyData;
  onChange: (updates: Partial<PropertyData>) => void;
}

interface AmenityLibraryItem {
  id: string;
  name_en: string;
  name_ar: string | null;
  icon: string;
  category: string | null;
}

const landmarkTypes = [
  { value: "metro", label: "Metro Station" },
  { value: "mall", label: "Shopping Mall" },
  { value: "school", label: "School" },
  { value: "hospital", label: "Hospital" },
  { value: "airport", label: "Airport" },
  { value: "beach", label: "Beach" },
  { value: "park", label: "Park" },
  { value: "restaurant", label: "Restaurant/Dining" },
];

function SortableLandmark({
  place,
  onUpdate,
  onDelete,
  lang,
}: {
  place: NearbyPlace;
  onUpdate: (id: string, updates: Partial<NearbyPlace>) => void;
  onDelete: (id: string) => void;
  lang: "en" | "ar";
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: place.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex-1 grid grid-cols-3 gap-2">
        <Input
          value={lang === "en" ? place.name_en : place.name_ar}
          onChange={(e) =>
            onUpdate(place.id, {
              [lang === "en" ? "name_en" : "name_ar"]: e.target.value,
            })
          }
          placeholder={lang === "ar" ? "الاسم" : "Name"}
          dir={lang === "ar" ? "rtl" : "ltr"}
        />
        <Input
          value={place.distance}
          onChange={(e) => onUpdate(place.id, { distance: e.target.value })}
          placeholder="5 mins"
        />
        <Select
          value={place.type}
          onValueChange={(value) => onUpdate(place.id, { type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {landmarkTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(place.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function DetailsStep({ data, onChange }: DetailsStepProps) {
  const [amenityLibrary, setAmenityLibrary] = useState<AmenityLibraryItem[]>([]);
  const [customAmenity, setCustomAmenity] = useState({
    name_en: "",
    name_ar: "",
    icon: "star",
    category: "Custom",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchAmenityLibrary();
  }, []);

  async function fetchAmenityLibrary() {
    const { data: library } = await supabase
      .from("amenity_library")
      .select("*")
      .eq("is_active", true)
      .order("category");
    
    if (library) {
      setAmenityLibrary(library);
    }
  }

  function toggleAmenity(amenity: AmenityLibraryItem) {
    const exists = data.amenities.some((a) => a.name_en === amenity.name_en);
    if (exists) {
      onChange({
        amenities: data.amenities.filter((a) => a.name_en !== amenity.name_en),
      });
    } else {
      onChange({
        amenities: [
          ...data.amenities,
          {
            name_en: amenity.name_en,
            name_ar: amenity.name_ar || undefined,
            icon: amenity.icon,
            category: amenity.category || undefined,
          },
        ],
      });
    }
  }

  function addCustomAmenity() {
    if (!customAmenity.name_en) return;
    onChange({
      amenities: [...data.amenities, { ...customAmenity }],
    });
    setCustomAmenity({ name_en: "", name_ar: "", icon: "star", category: "Custom" });
  }

  function removeAmenity(name: string) {
    onChange({
      amenities: data.amenities.filter((a) => a.name_en !== name),
    });
  }

  function addLandmark(lang: "en" | "ar") {
    const key = `nearby_${lang}` as "nearby_en" | "nearby_ar";
    onChange({
      [key]: [
        ...data[key],
        {
          id: crypto.randomUUID(),
          name_en: "",
          name_ar: "",
          distance: "",
          type: "mall",
        },
      ],
    });
  }

  function updateLandmark(
    lang: "en" | "ar",
    id: string,
    updates: Partial<NearbyPlace>
  ) {
    const key = `nearby_${lang}` as "nearby_en" | "nearby_ar";
    onChange({
      [key]: data[key].map((place) =>
        place.id === id ? { ...place, ...updates } : place
      ),
    });
  }

  function deleteLandmark(lang: "en" | "ar", id: string) {
    const key = `nearby_${lang}` as "nearby_en" | "nearby_ar";
    onChange({
      [key]: data[key].filter((place) => place.id !== id),
    });
  }

  function handleLandmarkDragEnd(lang: "en" | "ar", event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const key = `nearby_${lang}` as "nearby_en" | "nearby_ar";
    const items = data[key];
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    onChange({
      [key]: arrayMove(items, oldIndex, newIndex),
    });
  }

  // Group amenities by category
  const amenitiesByCategory = amenityLibrary.reduce((acc, amenity) => {
    const cat = amenity.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(amenity);
    return acc;
  }, {} as Record<string, AmenityLibraryItem[]>);

  return (
    <div className="space-y-6">
      {/* Property Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Property Overview</CardTitle>
          <CardDescription>
            Rich text description for the property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="en" className="space-y-4">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ar">العربية</TabsTrigger>
            </TabsList>
            <TabsContent value="en">
              <RichTextEditor
                content={data.overview_en}
                onChange={(content) => onChange({ overview_en: content })}
                placeholder="Describe the property's unique features..."
              />
            </TabsContent>
            <TabsContent value="ar">
              <RichTextEditor
                content={data.overview_ar}
                onChange={(content) => onChange({ overview_ar: content })}
                placeholder="وصف الميزات الفريدة للعقار..."
                dir="rtl"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities & Features</CardTitle>
          <CardDescription>
            Select from library or add custom amenities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Standard Amenities */}
          {Object.entries(amenitiesByCategory).map(([category, amenities]) => (
            <div key={category}>
              <h4 className="text-sm font-medium mb-3">{category}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {amenities.map((amenity) => {
                  const isSelected = data.amenities.some(
                    (a) => a.name_en === amenity.name_en
                  );
                  return (
                    <div
                      key={amenity.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`amenity-${amenity.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <label
                        htmlFor={`amenity-${amenity.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {amenity.name_en}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Selected Amenities */}
          {data.amenities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Selected Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {data.amenities.map((amenity) => (
                  <div
                    key={amenity.name_en}
                    className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {amenity.name_en}
                    <button
                      onClick={() => removeAmenity(amenity.name_en)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Amenity */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Add Custom Amenity</h4>
            <div className="flex items-end gap-3">
              <div className="w-24">
                <Label className="text-xs">Icon</Label>
                <IconSelector
                  value={customAmenity.icon}
                  onChange={(icon) =>
                    setCustomAmenity((prev) => ({ ...prev, icon }))
                  }
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Name (EN)</Label>
                <Input
                  value={customAmenity.name_en}
                  onChange={(e) =>
                    setCustomAmenity((prev) => ({
                      ...prev,
                      name_en: e.target.value,
                    }))
                  }
                  placeholder="Amenity name"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Name (AR)</Label>
                <Input
                  value={customAmenity.name_ar}
                  onChange={(e) =>
                    setCustomAmenity((prev) => ({
                      ...prev,
                      name_ar: e.target.value,
                    }))
                  }
                  placeholder="اسم الميزة"
                  dir="rtl"
                />
              </div>
              <Button onClick={addCustomAmenity}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Landmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Nearby Landmarks</CardTitle>
          <CardDescription>
            Add nearby places and distances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="en" className="space-y-4">
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ar">العربية</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleLandmarkDragEnd("en", e)}
              >
                <SortableContext
                  items={data.nearby_en.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {data.nearby_en.map((place) => (
                    <SortableLandmark
                      key={place.id}
                      place={place}
                      onUpdate={(id, updates) => updateLandmark("en", id, updates)}
                      onDelete={(id) => deleteLandmark("en", id)}
                      lang="en"
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" onClick={() => addLandmark("en")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Landmark
              </Button>
            </TabsContent>
            <TabsContent value="ar" className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleLandmarkDragEnd("ar", e)}
              >
                <SortableContext
                  items={data.nearby_ar.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {data.nearby_ar.map((place) => (
                    <SortableLandmark
                      key={place.id}
                      place={place}
                      onUpdate={(id, updates) => updateLandmark("ar", id, updates)}
                      onDelete={(id) => deleteLandmark("ar", id)}
                      lang="ar"
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outline" onClick={() => addLandmark("ar")}>
                <Plus className="mr-2 h-4 w-4" />
                إضافة معلم
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
