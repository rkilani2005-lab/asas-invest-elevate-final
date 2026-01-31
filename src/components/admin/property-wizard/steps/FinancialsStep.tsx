import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import type { PropertyData, PropertyStatus, PaymentMilestone } from "../types";

interface FinancialsStepProps {
  data: PropertyData;
  onChange: (updates: Partial<PropertyData>) => void;
}

function SortableMilestone({
  milestone,
  index,
  onUpdate,
  onDelete,
}: {
  milestone: PaymentMilestone;
  index: number;
  onUpdate: (index: number, updates: Partial<PaymentMilestone>) => void;
  onDelete: (index: number) => void;
}) {
  const id = milestone.id || `milestone-${index}`;
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
      className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="w-20">
        <Input
          type="number"
          min={0}
          max={100}
          value={milestone.percentage}
          onChange={(e) =>
            onUpdate(index, { percentage: parseInt(e.target.value) || 0 })
          }
          className="text-center"
        />
        <span className="text-xs text-muted-foreground block text-center mt-1">
          %
        </span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2">
        <Input
          value={milestone.milestone_en}
          onChange={(e) => onUpdate(index, { milestone_en: e.target.value })}
          placeholder="Milestone (EN)"
        />
        <Input
          value={milestone.milestone_ar}
          onChange={(e) => onUpdate(index, { milestone_ar: e.target.value })}
          placeholder="المرحلة"
          dir="rtl"
        />
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function FinancialsStep({ data, onChange }: FinancialsStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalPercentage = data.payment_milestones.reduce(
    (sum, m) => sum + m.percentage,
    0
  );

  function addMilestone() {
    onChange({
      payment_milestones: [
        ...data.payment_milestones,
        {
          id: crypto.randomUUID(),
          milestone_en: "",
          milestone_ar: "",
          percentage: 0,
          sort_order: data.payment_milestones.length,
        },
      ],
    });
  }

  function updateMilestone(index: number, updates: Partial<PaymentMilestone>) {
    onChange({
      payment_milestones: data.payment_milestones.map((m, i) =>
        i === index ? { ...m, ...updates } : m
      ),
    });
  }

  function deleteMilestone(index: number) {
    onChange({
      payment_milestones: data.payment_milestones.filter((_, i) => i !== index),
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.payment_milestones.findIndex(
      (m, i) => (m.id || `milestone-${i}`) === active.id
    );
    const newIndex = data.payment_milestones.findIndex(
      (m, i) => (m.id || `milestone-${i}`) === over.id
    );

    onChange({
      payment_milestones: arrayMove(
        data.payment_milestones,
        oldIndex,
        newIndex
      ).map((m, i) => ({ ...m, sort_order: i })),
    });
  }

  return (
    <div className="space-y-6">
      {/* Payment Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plan</CardTitle>
          <CardDescription>
            Define payment milestones for off-plan properties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={data.payment_milestones.map(
                (m, i) => m.id || `milestone-${i}`
              )}
              strategy={verticalListSortingStrategy}
            >
              {data.payment_milestones.map((milestone, index) => (
                <SortableMilestone
                  key={milestone.id || `milestone-${index}`}
                  milestone={milestone}
                  index={index}
                  onUpdate={updateMilestone}
                  onDelete={deleteMilestone}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={addMilestone}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total:</span>
              <Badge
                variant={totalPercentage === 100 ? "default" : "destructive"}
              >
                {totalPercentage}%
              </Badge>
              {totalPercentage === 100 && (
                <span className="text-sm text-green-600">✓</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Featured */}
      <Card>
        <CardHeader>
          <CardTitle>Property Status</CardTitle>
          <CardDescription>
            Availability and visibility settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-base">Availability Status</Label>
              <p className="text-sm text-muted-foreground">
                Current status of the property
              </p>
            </div>
            <Select
              value={data.status}
              onValueChange={(value: PropertyStatus) =>
                onChange({ status: value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Available
                  </span>
                </SelectItem>
                <SelectItem value="reserved">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Reserved
                  </span>
                </SelectItem>
                <SelectItem value="sold">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Sold
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label className="text-base">Featured Property</Label>
              <p className="text-sm text-muted-foreground">
                Display prominently on homepage
              </p>
            </div>
            <Switch
              checked={data.is_featured}
              onCheckedChange={(checked) => onChange({ is_featured: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Investment & End-User Text */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Copy</CardTitle>
          <CardDescription>
            Targeted messaging for different audiences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Investor Angle</Label>
            <div className="grid grid-cols-2 gap-4">
              <Textarea
                value={data.investment_en}
                onChange={(e) => onChange({ investment_en: e.target.value })}
                placeholder="Investment benefits and ROI potential..."
                rows={4}
              />
              <Textarea
                value={data.investment_ar}
                onChange={(e) => onChange({ investment_ar: e.target.value })}
                placeholder="فوائد الاستثمار وإمكانية العائد..."
                rows={4}
                dir="rtl"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>End-User Lifestyle</Label>
            <div className="grid grid-cols-2 gap-4">
              <Textarea
                value={data.enduser_text_en}
                onChange={(e) => onChange({ enduser_text_en: e.target.value })}
                placeholder="Lifestyle benefits and living experience..."
                rows={4}
              />
              <Textarea
                value={data.enduser_text_ar}
                onChange={(e) => onChange({ enduser_text_ar: e.target.value })}
                placeholder="فوائد نمط الحياة وتجربة المعيشة..."
                rows={4}
                dir="rtl"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
