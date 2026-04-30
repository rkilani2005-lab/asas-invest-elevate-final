import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Loader2, Save } from "lucide-react";
import GeneralInfoStep from "./steps/GeneralInfoStep";
import MediaStep from "./steps/MediaStep";
import DetailsStep from "./steps/DetailsStep";
import FinancialsStep from "./steps/FinancialsStep";
import type { PropertyData } from "./types";

interface PropertyWizardProps {
  data: PropertyData;
  onChange: (data: PropertyData) => void;
  onSave: () => void;
  isSaving: boolean;
  isEditing: boolean;
  propertyId?: string;
}

const useSteps = () => {
  const { t } = useTranslation();
  return [
    { id: 1, title: t("admin.wizard.stepGeneral"), description: t("admin.wizard.stepGeneralDesc") },
    { id: 2, title: t("admin.wizard.stepMedia"), description: t("admin.wizard.stepMediaDesc") },
    { id: 3, title: t("admin.wizard.stepDetails"), description: t("admin.wizard.stepDetailsDesc") },
    { id: 4, title: t("admin.wizard.stepFinancials"), description: t("admin.wizard.stepFinancialsDesc") },
  ];
};

export default function PropertyWizard({
  data,
  onChange,
  onSave,
  isSaving,
  isEditing,
  propertyId,
}: PropertyWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  function updateData(updates: Partial<PropertyData>) {
    onChange({ ...data, ...updates });
  }

  function goToStep(step: number) {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  }

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return <GeneralInfoStep data={data} onChange={updateData} />;
      case 2:
        return <MediaStep data={data} onChange={updateData} propertyId={propertyId} />;
      case 3:
        return <DetailsStep data={data} onChange={updateData} />;
      case 4:
        return <FinancialsStep data={data} onChange={updateData} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => goToStep(step.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    currentStep === step.id
                      ? "bg-primary-foreground/20"
                      : currentStep > step.id
                      ? "bg-primary/20"
                      : "bg-muted-foreground/20"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs opacity-70">{step.description}</p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 lg:w-16 h-0.5 mx-2",
                    currentStep > step.id ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      <div className="min-h-[500px]">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <div className="flex items-center gap-2">
          {currentStep < 4 ? (
            <Button onClick={() => goToStep(currentStep + 1)}>
              Next Step
            </Button>
          ) : (
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Property" : "Create Property"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
