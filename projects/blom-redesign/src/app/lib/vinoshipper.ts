// Where a purchase actually completes.
//
// Bløm is licensed to ship through Vinoshipper, so the money, the age check
// and the state-by-state shipping rules all live on their storefront, not
// here. The cart in this app is a shopping list: it lets someone gather what
// they want without being thrown out to a different-looking site on the first
// click, which is what the usability study found people bouncing off (Problem
// 3 — all three participants). Checkout is the deliberate handoff.
//
// The basket does not travel with them. Vinoshipper keeps its own cart and
// offers no public way to hand one over, so the drawer says so plainly rather
// than pretending the transfer happened.

/** Bløm's storefront on Vinoshipper. Change this one line if the slug moves. */
export const VINOSHIPPER_SHOP_URL = "https://vinoshipper.com/shop/bl_m_mead_cider";

/**
 * Send the customer to Vinoshipper to pay.
 *
 * A same-tab navigation, on purpose: a new tab leaves a dead copy of the site
 * behind and makes the back button useless, which is exactly the "I could not
 * get back" complaint from the study.
 */
export function goToVinoshipper() {
  window.location.assign(VINOSHIPPER_SHOP_URL);
}
