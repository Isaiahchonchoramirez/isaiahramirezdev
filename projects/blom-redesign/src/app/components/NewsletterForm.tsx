import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useSubmission, FieldError, isEmail } from "./SubmitState";

/**
 * The newsletter signup, in the two shapes the site needs.
 *
 * Both used to be an input and a button with no handler attached: typing an
 * address and pressing Subscribe did nothing at all.
 */
export default function NewsletterForm({
  variant = "inline",
  interests = false,
}: {
  /** "inline" is the one-line version; "stacked" is the footer column. */
  variant?: "inline" | "stacked";
  /** Footer only — the two topic checkboxes. */
  interests?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [releases, setReleases] = useState(true);
  const [shipping, setShipping] = useState(false);
  const { status, errors, send, clearError } = useSubmission("newsletter");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await send(
      {
        email: email.trim(),
        interests: [releases && "seasonal-releases-and-events", shipping && "out-of-state-shipping"].filter(Boolean),
      },
      (): Record<string, string> => (isEmail(email) ? {} : { email: "Enter a valid email address." }),
    );
  };

  if (status.state === "done") {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-md bg-green-50 dark:bg-green-900/20" role="status">
        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-green-800 dark:text-green-300">
          You're on the list.{" "}
          {!status.delivered && "Saved on this device — it will be sent when the taproom service is reachable."}
        </p>
      </div>
    );
  }

  const busy = status.state === "sending";

  const input = (
    <>
      <label htmlFor={`news-${variant}`} className="sr-only">
        Email address
      </label>
      <input
        id={`news-${variant}`}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearError("email");
        }}
        placeholder="Email Address"
        aria-invalid={Boolean(errors.email)}
        className={`flex-1 min-w-0 px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-500 dark:placeholder-stone-400 border ${
          errors.email ? "border-red-500" : "border-stone-300 dark:border-stone-600"
        }`}
      />
    </>
  );

  const button = (
    <button
      type="submit"
      disabled={busy}
      className="px-6 py-3 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-60 text-white rounded-md transition-colors font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {busy ? "Subscribing" : "Subscribe"}
    </button>
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      {interests && (
        <div className="space-y-3 mb-4">
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 accent-orange-600"
              checked={releases}
              onChange={(e) => setReleases(e.target.checked)}
            />
            <span className="text-sm">Fill me in on seasonal releases and taproom events</span>
          </label>
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 accent-orange-600"
              checked={shipping}
              onChange={(e) => setShipping(e.target.checked)}
            />
            <span className="text-sm">I live out of state. Please send shipping news!</span>
          </label>
        </div>
      )}

      <div className={variant === "inline" ? "flex flex-col sm:flex-row gap-3" : "flex flex-col space-y-3"}>
        {input}
        {button}
      </div>

      <FieldError message={errors.email} />
    </form>
  );
}
