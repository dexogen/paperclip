import { useTranslation as useUiTranslation } from "@/i18n";
import { t as translateUi } from "@/i18n";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function LegacyBoardSendNotice({ onDiscard }: { onDiscard: () => void }) {
  useUiTranslation();
  return <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button size="sm" variant="outline">{translateUi("interfaceUpdates.discard_saved_delivery_record_d4e26c37")}</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{translateUi("interfaceUpdates.discard_saved_delivery_record_d41005ee")}</AlertDialogTitle>
        <AlertDialogDescription>
          {translateUi("interfaceUpdates.first_check_activity_discarding_this_browser_recor_a333dfb1")}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{translateUi("interfaceUpdates.keep_record_562a1cd2")}</AlertDialogCancel>
        <AlertDialogAction onClick={onDiscard}>{translateUi("interfaceUpdates.discard_record_de3035c7")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
