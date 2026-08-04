import { useCallback, useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { submit, type Submission } from "../lib/api";

export type FormStatus =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "done"; reference: string; delivered: boolean };

/**
 * Shared submission behaviour for every form on the site.
 *
 * Each of these used to be a plain `<form>` with no handler: pressing the
 * button reloaded the page and threw the answers away. They now validate,
 * submit, and confirm with a reference the visitor can quote.
 */
export function useSubmission(kind: Submission["kind"]) {
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const send = useCallback(
    async (payload: Record<string, unknown>, validate?: () => Record<string, string>) => {
      const found = validate?.() ?? {};
      setErrors(found);
      if (Object.keys(found).length > 0) return false;

      setStatus({ state: "sending" });
      const result = await submit({ kind, payload });
      setStatus({ state: "done", reference: result.reference, delivered: result.delivered });
      return true;
    },
    [kind],
  );

  const reset = useCallback(() => {
    setStatus({ state: "idle" });
    setErrors({});
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return { status, errors, send, reset, clearError };
}

/** The confirmation panel shown once a form has been submitted. */
export function SubmitConfirmation({
  status,
  headline,
  body,
  onReset,
  resetLabel = "Send another",
}: {
  status: FormStatus;
  headline: string;
  body: string;
  onReset?: () => void;
  resetLabel?: string;
}) {
  if (status.state !== "done") return null;

  return (
    <div className="text-center py-10 px-6" role="status">
      <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
        <Check className="w-7 h-7 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{headline}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-3">{body}</p>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        Reference <span className="font-mono font-semibold text-gray-900 dark:text-white">{status.reference}</span>
      </p>
      {!status.delivered && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Saved on this device — the taproom service was not reachable, so it will be sent the next time it is.
        </p>
      )}
      {onReset && (
        <button
          onClick={onReset}
          className="mt-6 px-6 py-3 border-2 border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-600 hover:text-white rounded-md font-semibold transition-colors"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}

/** A submit button that reflects the request in flight. */
export function SubmitButton({
  status,
  idle,
  sending,
  className = "",
}: {
  status: FormStatus;
  idle: string;
  sending: string;
  className?: string;
}) {
  const busy = status.state === "sending";
  return (
    <button
      type="submit"
      disabled={busy}
      className={`px-8 py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {busy ? sending : idle}
    </button>
  );
}

/** Inline validation message under a field. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 mt-1.5">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  );
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
