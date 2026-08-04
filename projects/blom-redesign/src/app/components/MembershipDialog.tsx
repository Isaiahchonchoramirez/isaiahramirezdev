import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSubmission, SubmitConfirmation, SubmitButton, FieldError, isEmail } from "./SubmitState";

export const TIERS = [
  { id: "individual", name: "Individual", price: 60, cards: 1, discount: "15%" },
  { id: "household", name: "Household", price: 120, cards: 2, discount: "15%" },
  { id: "premium", name: "Premium", price: 250, cards: 4, discount: "20%" },
] as const;

export type TierId = (typeof TIERS)[number]["id"];

/**
 * Club signup.
 *
 * "Join Now" appeared four times on the club page and did nothing on any of
 * them. It now opens this, pre-selected to whichever tier was clicked.
 */
export default function MembershipDialog({
  tier,
  onClose,
}: {
  tier: TierId | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<TierId>(tier ?? "household");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { status, errors, send, clearError } = useSubmission("membership");

  useEffect(() => {
    if (tier) setSelected(tier);
  }, [tier]);

  useEffect(() => {
    if (!tier) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [tier, onClose]);

  if (!tier) return null;

  const chosen = TIERS.find((t) => t.id === selected)!;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await send({ tier: selected, price: chosen.price, name: name.trim(), email: email.trim() }, () => {
      const found: Record<string, string> = {};
      if (!name.trim()) found.name = "We need a name for the membership card.";
      if (!isEmail(email)) found.email = "Enter a valid email address.";
      // Alcohol memberships are 21+, and saying so is not optional.
      if (!confirmed) found.confirmed = "Please confirm you are 21 or older.";
      return found;
    });
  };

  const inputClass = (key: string) =>
    `w-full px-4 py-3 rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
      errors[key] ? "border-red-500" : "border-gray-300 dark:border-gray-600"
    }`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Join the club">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} tabIndex={-1} aria-label="Close" />

      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="font-bold text-xl text-gray-900 dark:text-white">Join the Bløm Club</h2>
          <div className="flex-1" />
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status.state === "done" ? (
          <SubmitConfirmation
            status={status}
            headline="Welcome to the club"
            body={`We will email your ${chosen.name} membership details and take payment on your first visit.`}
          />
        ) : (
          <form onSubmit={onSubmit} noValidate className="p-6 space-y-5">
            <fieldset>
              <legend className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Membership</legend>
              <div className="space-y-2">
                {TIERS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer transition-colors ${
                      selected === option.id
                        ? "border-orange-600 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      className="sr-only"
                      checked={selected === option.id}
                      onChange={() => setSelected(option.id)}
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-gray-900 dark:text-white">{option.name}</span>
                      <span className="block text-sm text-gray-600 dark:text-gray-400">
                        {option.discount} off · {option.cards} card{option.cards > 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">${option.price}/yr</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="club-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                id="club-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                className={inputClass("name")}
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError message={errors.name} />
            </div>

            <div>
              <label htmlFor="club-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="club-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                className={inputClass("email")}
                aria-invalid={Boolean(errors.email)}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-orange-600"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    clearError("confirmed");
                  }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">I am 21 years of age or older.</span>
              </label>
              <FieldError message={errors.confirmed} />
            </div>

            <SubmitButton status={status} idle={`Join — $${chosen.price}/yr`} sending="Signing up" className="w-full" />

            <p className="text-xs text-gray-500 dark:text-gray-400">
              No payment is taken here. The taproom confirms your membership and takes payment on your first visit.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
