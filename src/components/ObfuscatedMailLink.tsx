import { openFeedbackMail } from "../lib/obfuscatedMail";
import { IconMail } from "./icons";

type Props = { children?: React.ReactNode; className?: string };

export function ObfuscatedMailLink({ children = "Feedback", className = "sheet-mail-link" }: Props) {
  return (
    <button type="button" className={className} onClick={() => openFeedbackMail()}>
      <IconMail />
      {children}
    </button>
  );
}
