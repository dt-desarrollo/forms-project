interface SectionHeaderProps {
  number: number
  title: string
  description?: string
}

export function SectionHeader({ number, title, description }: SectionHeaderProps) {
  return (
    <div className="rounded-t-lg bg-primary px-4 py-3">
      <h2 className="text-lg font-semibold text-primary-foreground">
        {number}. {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-primary-foreground/80">{description}</p>
      )}
    </div>
  )
}
