import { Star, Gift, Calendar, Users, TrendingUp, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useState } from "react";
import MembershipDialog, { type TierId } from "../components/MembershipDialog";

export default function ClubPage() {
  const [joining, setJoining] = useState<TierId | null>(null);

  return (
    <div className="pt-20 min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="honeycomb-club-header-5" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="5"/>
              </pattern>
              <pattern id="honeycomb-club-header-4" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="4"/>
              </pattern>
              <pattern id="honeycomb-club-header-3" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="3"/>
              </pattern>
              <pattern id="honeycomb-club-header-2" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <polygon points="28,0 56,15 56,45 28,60 0,45 0,15" fill="none" stroke="#D3A02A" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="25%" height="100%" fill="url(#honeycomb-club-header-5)" />
            <rect x="25%" width="25%" height="100%" fill="url(#honeycomb-club-header-4)" />
            <rect x="50%" width="25%" height="100%" fill="url(#honeycomb-club-header-3)" />
            <rect x="75%" width="25%" height="100%" fill="url(#honeycomb-club-header-2)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Join the Club
          </h1>
          <p className="text-xl text-orange-50 max-w-3xl mx-auto">
            Become a Bløm member and enjoy exclusive benefits
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Member Benefits</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">More than just discounts - join our community</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>15% Off Everything</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Save on all purchases in the taproom and online shop</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Early Access</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Be the first to try new releases and limited editions</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Exclusive Events</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Member-only tastings, workshops, and celebrations</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Birthday Bonus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Special gift on your birthday month</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Priority Seating</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Skip the wait during busy hours</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle>Community Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">Part of your membership supports local farms and beekeepers</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Membership Tiers */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Membership Options</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Choose the plan that's right for you</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Individual</CardTitle>
                <div className="text-4xl font-bold text-orange-600 mb-2">$75</div>
                <CardDescription>per year</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>All member benefits</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>15% discount</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>1 member card</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>Access to member events</span>
                  </li>
                </ul>
                <Button
                  onClick={() => setJoining("individual")}
                  className="w-full mt-6 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white"
                >
                  Join now
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-600 dark:bg-gray-800 dark:border-orange-500">
              <CardHeader className="text-center bg-orange-50 dark:bg-gray-700">
                <div className="inline-block px-3 py-1 bg-orange-600 text-white text-sm font-semibold rounded-full mb-2">
                  MOST POPULAR
                </div>
                <CardTitle className="text-2xl mb-2">Household</CardTitle>
                <div className="text-4xl font-bold text-orange-600 mb-2">$120</div>
                <CardDescription>per year</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>All member benefits</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>15% discount</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>2 member cards</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>Bring a guest to member events</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>Extra birthday gifts</span>
                  </li>
                </ul>
                <Button
                  onClick={() => setJoining("household")}
                  className="w-full mt-6 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white"
                >
                  Join now
                </Button>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Premium</CardTitle>
                <div className="text-4xl font-bold text-orange-600 mb-2">$250</div>
                <CardDescription>per year</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>All member benefits</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>20% discount</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>4 member cards</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>VIP event access</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>Quarterly gift package</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 mt-2 flex-shrink-0" />
                    <span>Behind-the-scenes tour</span>
                  </li>
                </ul>
                <Button
                  onClick={() => setJoining("premium")}
                  className="w-full mt-6 bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 text-white"
                >
                  Join now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-12 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">How long does membership last?</h3>
              <p className="text-gray-600 dark:text-gray-400">Memberships are valid for one full year from the date of purchase.</p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Can I upgrade my membership?</h3>
              <p className="text-gray-600 dark:text-gray-400">Yes! You can upgrade at any time and we'll credit the remaining value of your current membership.</p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Is the membership refundable?</h3>
              <p className="text-gray-600 dark:text-gray-400">Memberships are non-refundable but can be transferred to another person.</p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Do discounts apply to gift cards?</h3>
              <p className="text-gray-600 dark:text-gray-400">Member discounts apply to all purchases except gift cards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-orange-600 to-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Join?
          </h2>
          <p className="text-xl text-orange-50 mb-8">
            Become part of the Bløm family today
          </p>
          <Button size="lg" onClick={() => setJoining("household")} className="bg-white text-orange-600 hover:bg-gray-100">
            Sign up now
          </Button>
        </div>
      </section>

      <MembershipDialog tier={joining} onClose={() => setJoining(null)} />
    </div>
  );
}
