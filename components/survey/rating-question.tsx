"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface RatingOption {
  value: number
  label: string
}

interface RatingQuestionProps {
  question: string
  name: string
  options: readonly RatingOption[]
  value: number | null
  onChange: (value: number) => void
  required?: boolean
}

export function RatingQuestion({
  question,
  name,
  options,
  value,
  onChange,
  required = true
}: RatingQuestionProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="mb-4 text-sm font-medium text-foreground">
        {question}
        {required && <span className="ml-1 text-destructive">*</span>}
      </p>
      <RadioGroup
        value={value?.toString() || ""}
        onValueChange={(val) => onChange(parseInt(val))}
        className="flex flex-col gap-2"
      >
        {options.map((option) => (
          <div key={option.value}>
            {/* Mobile: Full width buttons with text */}
            <button
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex w-full items-center justify-center rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all md:hidden",
                value === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 bg-background text-foreground hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {option.label}
            </button>

            {/* Desktop: Radio buttons with labels */}
            <div className="hidden md:flex items-center gap-3">
              <RadioGroupItem
                value={option.value.toString()}
                id={`${name}-${option.value}`}
                className={cn(
                  "border-muted-foreground/50",
                  value === option.value && "border-primary"
                )}
              />
              <Label
                htmlFor={`${name}-${option.value}`}
                className="cursor-pointer text-sm font-normal text-muted-foreground"
              >
                {option.label}
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
