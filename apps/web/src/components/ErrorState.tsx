import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Kunde inte hämta data</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
