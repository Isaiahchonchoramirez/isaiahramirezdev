import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Users, Calendar, Utensils, Music } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useState } from "react";
import { useSubmission, SubmitConfirmation, SubmitButton, FieldError, isEmail } from "../components/SubmitState";

type EnquiryFields = {
  name: string;
  email: string;
  phone: string;
  date: string;
  type: string;
  guests: string;
  details: string;
};

const EMPTY_ENQUIRY: EnquiryFields = {
  name: "",
  email: "",
  phone: "",
  date: "",
  type: "Birthday Party",
  guests: "",
  details: "",
};

const EVENT_TYPES = ["Birthday Party", "Corporate Event", "Wedding Reception", "Anniversary", "Other"];

/** The taproom seats this many for a private booking. */
const MAX_GUESTS = 120;

function EnquiryForm() {
  const [fields, setFields] = useState<EnquiryFields>(EMPTY_ENQUIRY);
  const { status, errors, send, reset, clearError } = useSubmission("enquiry");

  const set = (key: keyof EnquiryFields) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFields((prev) => ({ ...prev, [key]: event.target.value }));
    clearError(key);
  };

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!fields.name.trim()) found.name = "We need a name to put on the booking.";
    if (!isEmail(fields.email)) found.email = "Enter an email we can reply to.";

    if (fields.date) {
      // Compare dates only — a booking for later today is still valid.
      const chosen = new Date(`${fields.date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (chosen < today) found.date = "That date has already passed.";
    }

    if (fields.guests) {
      const count = Number(fields.guests);
      if (!Number.isFinite(count) || count < 1) found.guests = "Enter how many people you expect.";
      else if (count > MAX_GUESTS) found.guests = `The taproom holds ${MAX_GUESTS}. Tell us more in the details and we will work something out.`;
    }

    return found;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const sent = await send({ ...fields, name: fields.name.trim(), email: fields.email.trim() }, validate);
    if (sent) setFields(EMPTY_ENQUIRY);
  };

  const inputClass = (key: keyof EnquiryFields) =>
    `w-full px-4 py-3 rounded-md border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
      errors[key] ? "border-red-500" : "border-gray-300 dark:border-gray-600"
    }`;

  if (status.state === "done") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <SubmitConfirmation
          status={status}
          headline="Request received"
          body="Someone from the taproom will be in touch within one business day."
          onReset={reset}
          resetLabel="Send another request"
        />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="pe-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Name *
          </label>
          <input id="pe-name" type="text" autoComplete="name" value={fields.name} onChange={set("name")} className={inputClass("name")} aria-invalid={Boolean(errors.name)} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label htmlFor="pe-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Email *
          </label>
          <input id="pe-email" type="email" autoComplete="email" value={fields.email} onChange={set("email")} className={inputClass("email")} aria-invalid={Boolean(errors.email)} />
          <FieldError message={errors.email} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="pe-phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Phone
          </label>
          <input id="pe-phone" type="tel" autoComplete="tel" value={fields.phone} onChange={set("phone")} className={inputClass("phone")} />
        </div>
        <div>
          <label htmlFor="pe-date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Event Date
          </label>
          <input id="pe-date" type="date" value={fields.date} onChange={set("date")} className={inputClass("date")} aria-invalid={Boolean(errors.date)} />
          <FieldError message={errors.date} />
        </div>
      </div>

      <div>
        <label htmlFor="pe-type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Event Type
        </label>
        <select id="pe-type" value={fields.type} onChange={set("type")} className={inputClass("type")}>
          {EVENT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pe-guests" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Expected Guest Count
        </label>
        <input id="pe-guests" type="number" min={1} max={MAX_GUESTS} value={fields.guests} onChange={set("guests")} className={inputClass("guests")} aria-invalid={Boolean(errors.guests)} />
        <FieldError message={errors.guests} />
      </div>

      <div>
        <label htmlFor="pe-details" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Additional Details
        </label>
        <textarea id="pe-details" rows={4} value={fields.details} onChange={set("details")} className={inputClass("details")} placeholder="Tell us about your event..." />
      </div>

      <SubmitButton status={status} idle="Submit request" sending="Sending" className="w-full" />
    </form>
  );
}

export default function PrivateEventsPage() {
  return (
    <div className="pt-20 min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-private-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-private-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-private-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-private-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-private-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-private-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-private-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-private-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Private Events
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto">
            Make your celebration unforgettable at Bløm
          </p>
        </div>
      </section>

      {/* Hero Image */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1759646827844-bbbdbfd0ada2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcml2YXRlJTIwZXZlbnQlMjBwYXJ0eXxlbnwxfHx8fDE3NzU4MzcxNzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Private Event"
              className="w-full h-96 object-cover rounded-lg shadow-xl"
            />
          </div>

          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Your Perfect Venue
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              Whether you're planning a birthday party, corporate event, wedding reception, or just want to celebrate with friends, Bløm provides a unique and memorable setting.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Private Space</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Exclusive use of our taproom for groups up to 80</p>
              </CardContent>
            </Card>

            <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Flexible Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Customizable options to fit your needs and budget</p>
              </CardContent>
            </Card>

            <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Catering Available</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Partner with local caterers or bring your own</p>
              </CardContent>
            </Card>

            <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Entertainment Options</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Live music, games, and more available</p>
              </CardContent>
            </Card>
          </div>

          {/* Package Details */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl">Basic Package</CardTitle>
                <CardDescription className="text-2xl font-bold text-orange-600">$500</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>2 hours of private space</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Up to 30 guests</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Dedicated server</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Beverage service</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-600 dark:bg-gray-800 dark:border-orange-600">
              <CardHeader>
                <CardTitle className="text-2xl">Premium Package</CardTitle>
                <CardDescription className="text-2xl font-bold text-orange-600">$1,000</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>4 hours of private space</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Up to 60 guests</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Dedicated server & bartender</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Custom tasting experience</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Appetizer service</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-2xl">Deluxe Package</CardTitle>
                <CardDescription className="text-2xl font-bold text-orange-600">$2,000</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Full day access</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Up to 80 guests</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Full service staff</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Complete catering</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Live entertainment</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2" />
                    <span>Custom decorations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sign Up Form */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Request Information
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Fill out the form below and we'll get back to you within 24 hours
            </p>
          </div>

          <EnquiryForm />
        </div>
      </section>
    </div>
  );
}
