import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/variants";

/**
 * Root AlertDialog component that manages the open state and content display.
 * Use with AlertDialogTrigger to control visibility, and AlertDialogContent for the dialog body.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialog = AlertDialogPrimitive.Root;

/**
 * Trigger that opens the AlertDialog when clicked.
 * Compose with AlertDialog to create a complete dialog.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

/**
 * Overlay behind the AlertDialog content that dims the background.
 * Forwards ref to AlertDialogPrimitive.Overlay.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

/**
 * Content container for the AlertDialog with title, description, and action buttons.
 * Forwards ref to AlertDialogPrimitive.Content.
 * Use with AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
 * AlertDialogAction, and AlertDialogCancel for complete composition.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

/**
 * Header section for AlertDialogContent, typically contains title and description.
 * Use with AlertDialogTitle and AlertDialogDescription.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

/**
 * Footer section for AlertDialogContent, typically contains action buttons.
 * Use with AlertDialogAction and AlertDialogCancel.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

/**
 * Title heading for AlertDialog.
 * Forwards ref to AlertDialogPrimitive.Title.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

/**
 * Description text for AlertDialog.
 * Forwards ref to AlertDialogPrimitive.Description.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

/**
 * Primary action button for AlertDialog.
 * Forwards ref to AlertDialogPrimitive.Action.
 * Uses buttonVariants() for styling.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

/**
 * Cancel/close button for AlertDialog.
 * Forwards ref to AlertDialogPrimitive.Cancel.
 * Uses buttonVariants({ variant: "outline" }) for styling.
 * @see https://www.radix-ui.com/docs/alert-dialog
 */
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
