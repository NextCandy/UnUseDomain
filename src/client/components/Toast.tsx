import { useEffect } from "react";

import { IconAlert, IconCheck } from "./icons";

export interface ToastMessage {
  id: number;
  text: string;
  tone?: "success" | "error";
}

export function Toast({ message, onClose }: { message: ToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className={`toast ${message.tone === "error" ? "toast-error" : ""}`} role="status">
      <span>{message.tone === "error" ? <IconAlert size={16} /> : <IconCheck size={16} />}</span>
      {message.text}
    </div>
  );
}
