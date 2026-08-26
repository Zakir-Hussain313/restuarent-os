"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  checked,
  defaultChecked,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  const isChecked = checked ?? defaultChecked ?? false

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      checked={checked}
      defaultChecked={defaultChecked}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        isChecked ? "bg-[#5b21b6]" : "bg-[#9ca3af]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          isChecked
            ? "group-data-[size=default]/switch:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:translate-x-[calc(100%-2px)]"
            : "translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }