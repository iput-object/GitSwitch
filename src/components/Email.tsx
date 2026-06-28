import { useEffect, useState } from "react";

const KEY = "gitswitch.hideEmail";
const EVENT = "gitswitch:hide-email";

export const getHideEmail = () => localStorage.getItem(KEY) === "true";

export function setHideEmail(on: boolean) {
  localStorage.setItem(KEY, String(on));
  window.dispatchEvent(new Event(EVENT)); // notify any mounted <Email>
}

/** Live "hide email" preference; re-renders when toggled anywhere. */
export function useHideEmail() {
  const [hidden, setHidden] = useState(getHideEmail);
  useEffect(() => {
    const sync = () => setHidden(getHideEmail());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return hidden;
}

/** Mask the local part, keeping the domain: jane@x.com -> ••••••@x.com */
export function maskEmail(email: string) {
  const at = email.indexOf("@");
  return at <= 0 ? "••••••" : "••••••" + email.slice(at);
}

/** Drop-in email text that masks itself when "hide email" is on. */
export default function Email({ value }: { value: string }) {
  return <>{useHideEmail() ? maskEmail(value) : value}</>;
}
