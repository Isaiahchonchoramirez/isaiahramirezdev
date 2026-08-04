import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import { Link } from "react-router";
import bdayGraphic from "../../imports/8thBday.Graphic.webp";
import aperitivoEvent from "../../imports/BLOM_-_APERITIVO-1.webp";
import gameNight from "../../imports/Bløm.Game.Night.WED-01.webp";
import eventPhoto from "../../imports/EDF12522-1E70-4A9D-A8C2-45A59C60C05A.webp";
import lacEvent from "../../imports/LAC-Event-Blom-Apr18May16.webp";
import yogaEvent from "../../imports/yogaatblom.webp";
import eventsHeader from "../../imports/events.webp";

interface Event {
  id: number;
  title: string;
  date: Date;
  time: string;
  location: string;
  description: string;
  capacity: string;
  image: string;
}

const upcomingEvents: Event[] = [
  {
    id: 1,
    title: "8th Birthday Celebration",
    date: new Date(2026, 4, 15),
    time: "7:00 PM - 10:00 PM",
    location: "Bløm Taproom",
    description: "Celebrate 8 years of Bløm with live music, special releases, and anniversary specials!",
    capacity: "100 people",
    image: bdayGraphic,
  },
  {
    id: 2,
    title: "Aperitivo Launch Party",
    date: new Date(2026, 4, 22),
    time: "6:00 PM - 9:00 PM",
    location: "Bløm Taproom",
    description: "Join us for the official launch of our new botanical aperitif. Sample cocktails and learn about the craft.",
    capacity: "80 people",
    image: aperitivoEvent,
  },
  {
    id: 3,
    title: "Game Night Wednesdays",
    date: new Date(2026, 5, 5),
    time: "6:00 PM - 10:00 PM",
    location: "Bløm Taproom",
    description: "Bring your friends for board games, trivia, and great drinks every Wednesday night.",
    capacity: "50 people",
    image: gameNight,
  },
  {
    id: 4,
    title: "Live at the Commons",
    date: new Date(2026, 5, 18),
    time: "5:00 PM - 8:00 PM",
    location: "Liberty Athletic Club",
    description: "Join us at Liberty Athletic Club for an evening of music, drinks, and community.",
    capacity: "150 people",
    image: lacEvent,
  },
  {
    id: 5,
    title: "Summer Concert Series",
    date: new Date(2026, 5, 20),
    time: "3:00 PM - 9:00 PM",
    location: "Bløm Taproom",
    description: "Celebrate summer with live music featuring local Michigan artists.",
    capacity: "100 people",
    image: eventPhoto,
  },
  {
    id: 6,
    title: "Yoga at Bløm",
    date: new Date(2026, 6, 10),
    time: "10:00 AM - 12:00 PM",
    location: "Bløm Taproom",
    description: "Flow through a refreshing yoga session followed by mimosas and brunch.",
    capacity: "30 people",
    image: yogaEvent,
  },
];

export default function EventsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleAddToCalendar = (event: Event) => {
    const startDate = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const eventData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${startDate}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([eventData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-100">
          <img
            src={eventsHeader}
            alt="Events Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-events-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-events-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-events-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-events-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-events-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-events-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-events-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-events-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            Events
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
            Join us for tastings, workshops, live music, and special celebrations
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Event Calendar</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Select a date to see events</p>
                </CardHeader>
                <CardContent>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border border-gray-200 dark:border-gray-700"
                    modifiers={{
                      hasEvent: upcomingEvents.map(e => e.date)
                    }}
                    modifiersClassNames={{
                      hasEvent: "bg-orange-100 font-bold"
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Private Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Host your next celebration at Bløm!</p>
                  <Link to="/private-events">
                    <Button className="w-full bg-orange-600 dark:bg-orange-500 hover:bg-orange-700">
                      Learn More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Events List */}
          <div className="lg:col-span-2 space-y-6">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group cursor-pointer dark:bg-gray-800 dark:border-gray-700"
              >
                {/* Background Image Section */}
                <div className="relative h-64 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${event.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <CardTitle className="text-3xl text-white drop-shadow-lg">{event.title}</CardTitle>
                  </div>
                </div>

                {/* Content Section */}
                <CardHeader>
                  <div className="space-y-2 text-base text-gray-600 dark:text-gray-400">
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                      {event.date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <Clock className="w-4 h-4 mr-2 text-orange-600" />
                      {event.time}
                    </div>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <MapPin className="w-4 h-4 mr-2 text-orange-600" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <Users className="w-4 h-4 mr-2 text-orange-600" />
                      Capacity: {event.capacity}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{event.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white">
                      Register Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAddToCalendar(event)}
                      className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-gray-700 dark:text-orange-500 dark:hover:bg-gray-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
