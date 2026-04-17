// src/lib/staticContent.ts

export const ABOUT_CONTENT = {
  headline: "Pas pour tout le monde.",
  subheadline: "Not for everyone.",
  sections: [
    {
      title: "The Billboard",
      body: `There is a brand that needs you.\n\nNot the way a craftsman needs his materials. The way a parasite needs a host. The way a name needs a body to be carried across a room so that other people can read it.\n\nLouis Vuitton. Balenciaga. The houses that spent thirty years printing their identity onto the chests, backs, and shoulders of men who believed they were buying status — and were, in fact, being rented as walking media.\n\nThe monogram that covers the chest does not celebrate you. It uses you.\n\nThis is what a hollow brand does: it borrows your presence and calls it prestige.`,
    },
    {
      title: "The Foundation",
      body: `Other brands put their name on your chest.\n\nWe put our mark at the back-bottom of the shirt.\n\nThis is not modesty. This is architecture.\n\nA foundation does not stand beside the building and demand credit. It is beneath the building, holding it up, invisible in its function and absolute in its necessity.\n\nYou are the presence.\n\nWe are the ground beneath it.`,
    },
    {
      title: "The Meal",
      body: `You've spent your life making sure everyone else was full.\n\nYou checked the plate before yours. You made sure the table had enough before you sat down. You ate last — not because you were told to, but because that is the kind of man you are.\n\nWe see that. Not as a sacrifice to be rewarded. Not as a debt to be repaid.\n\nAs the truth of who you are.\n\nSit down. The table is set.`,
    },
    {
      title: "The Silent Contract",
      body: `We do not put our name where your name should be. We do not borrow your presence to run our campaign.\n\nWe build for the man who has been building for everyone else.\n\nThe Silent Contract is not a tagline. It is a promise: We do not build for the stage.\n\nWe build for the man who holds it up.`,
    },
  ],
  closing: "— Popper Tulimond\nThe Syndicate does not announce itself. It builds the ground others stand on.",
} as const;

export const PROTOCOL_CONTENT = {
  header: "Popper Tulimond /",
  title: "THE PROTOCOL",
  rules: [
    { number: "01", text: "We open once a month. The 15th turns to the 16th at midnight EST." },
    { number: "02", text: "Slots are finite. Once we sell out, we close. No exceptions." },
    { number: "03", text: "The Constable is your only way in." },
  ],
  cta: "Text CONSTABLE for early access.",
  ctaSubtext: "15 minutes before the door opens to the public.",
} as const;

export const CONTACT_CONTENT = {
  headline: "Contact",
  address: {
    line1: "Popper Tulimond HQ",
    line2: "Las Vegas, NV",    // Update with full address before Stripe activation
  },
  phone: "",                   // Update before Stripe activation
  email: "",                   // Update before Stripe activation
  note: "For fastest resolution, review The Protocol or reach out via the form below. We read every message.",
} as const;

export const TERMS_CONTENT = {
  title: "Terms of Use",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Terms of Use before going live.\n\nThese terms govern your use of poppertulimond.com. By accessing the site you agree to these terms.`,
} as const;

export const PRIVACY_CONTENT = {
  title: "Privacy Policy",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Privacy Policy before going live.\n\nWe collect only what we need to process your order and communicate with you.`,
} as const;

export const SHIPPING_CONTENT = {
  title: "Shipping & Fulfillment",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Shipping Policy before going live.\n\nOrders are fulfilled within [X] business days of purchase.`,
} as const;

export const REFUND_CONTENT = {
  title: "Refund Policy",
  lastUpdated: "April 2026",
  body: `PLACEHOLDER — Replace with actual Refund Policy before going live.\n\nAll sales are final unless the item arrives damaged or defective.`,
} as const;
