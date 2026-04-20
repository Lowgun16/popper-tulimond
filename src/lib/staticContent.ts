// src/lib/staticContent.ts
// All hardcoded page content. Phase B will replace this with database-driven values via the same exported shapes.

export const ABOUT_CONTENT = {
  headline: "Pas pour tout le monde.",
  subheadline: "Not for everyone.",
  sections: [
    {
      id: "billboard",
      title: "The Billboard",
      body: `There is a brand that needs you.\n\nNot the way a craftsman needs his materials. The way a parasite needs a host. The way a name needs a body to be carried across a room so that other people can read it.\n\nLouis Vuitton. Balenciaga. The houses that spent thirty years printing their identity onto the chests, backs, and shoulders of men who believed they were buying status — and were, in fact, being rented as walking media.\n\nThe monogram that covers the chest does not celebrate you. It uses you.\n\nThis is what a hollow brand does: it borrows your presence and calls it prestige.`,
    },
    {
      id: "foundation",
      title: "The Foundation",
      body: `Other brands put their name on your chest.\n\nWe put our mark at the back-bottom of the shirt.\n\nThis is not modesty. This is architecture.\n\nA foundation does not stand beside the building and demand credit. It is beneath the building, holding it up, invisible in its function and absolute in its necessity.\n\nYou are the presence.\n\nWe are the ground beneath it.`,
    },
    {
      id: "meal",
      title: "The Meal",
      body: `You've spent your life making sure everyone else was full.\n\nYou checked the plate before yours. You made sure the table had enough before you sat down. You ate last — not because you were told to, but because that is the kind of man you are.\n\nWe see that. Not as a sacrifice to be rewarded. Not as a debt to be repaid.\n\nAs the truth of who you are.\n\nSit down. The table is set.`,
    },
    {
      id: "silent-contract",
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
    { number: "01", text: "We open once a month: When the 15th turns to the 16th at midnight EST." },
    { number: "02", text: "Slots are finite. Once we sell out, we close. No exceptions." },
    { number: "03", text: "The Constable is your only way in." },
  ],
  cta: "Tap here for 15-minute early access",
  ctaSubtext: "Text CONSTABLE when we send you the number. You'll get in before the public does.",
} as const;

export const CONTACT_CONTENT: {
  headline: string;
  address: { line1: string; line2: string };
  phone: string;
  email: string;
  note: string;
} = {
  headline: "Contact",
  address: {
    line1: "8925 W Flamingo Rd. Unit 227",
    line2: "Las Vegas, NV 89147",
  },
  phone: "(702) 546-1344",
  email: "Support@poppertulimond.com",
  note: "For fastest resolution, review The Protocol or reach out via the form below. We read every message.",
};

export const TERMS_CONTENT = {
  title: "Terms of Use",
  lastUpdated: "April 2026",
  body: `Agreement to Terms\nBy accessing our website, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.\n\nIntellectual Property\nAll content on this site, including but not limited to text, graphics, logos, and shirt designs, is the property of Popper Tulimond and is protected by copyright and trademark laws. You may not reproduce or use our designs without express written permission.\n\nProducts and Pricing\nWe reserve the right to modify or discontinue any product at any time. Prices for our shirts are subject to change without notice. While we strive for color accuracy in our photos, we cannot guarantee that your monitor's display of any color will be 100% accurate.\n\nAccuracy of Billing\nYou agree to provide current, complete, and accurate purchase and account information for all purchases. We reserve the right to refuse any order you place with us. In the event that we make a change to or cancel an order, we will attempt to notify you via the email provided.\n\nLimitation of Liability\nPopper Tulimond shall not be held liable for any indirect, incidental, or consequential damages resulting from the use of our products or website. Our liability is limited to the amount paid for the product in question.\n\nGoverning Law\nThese terms are governed by and construed in accordance with the laws of the State of Nevada, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.`,
} as const;

export const PRIVACY_CONTENT = {
  title: "Privacy Policy",
  lastUpdated: "April 2026",
  body: `Information We Collect\nWhen you purchase something from our store, as part of the buying and selling process, we collect the personal information you give us such as your name, address, and email address.\n\nConsent\nWhen you provide us with personal information to complete a transaction, verify your credit card, place an order, or arrange for a delivery, we imply that you consent to our collecting it and using it for that specific reason only.\n\nSecurity\nTo protect your personal information, we take reasonable precautions and follow industry best practices to make sure it is not inappropriately lost, misused, accessed, disclosed, altered, or destroyed. Your credit card information is encrypted using secure socket layer technology (SSL) and stored with AES-256 encryption via our payment processor, Stripe.\n\nThird-Party Services\nIn general, the third-party providers used by us will only collect, use, and disclose your information to the extent necessary to allow them to perform the services they provide to us (such as payment processing and shipping).`,
} as const;

export const SHIPPING_CONTENT = {
  title: "Shipping & Fulfillment",
  lastUpdated: "April 2026",
  body: `Standard Shipping (In-Stock Items)\nFor items currently in stock, orders are processed within 2–3 business days.\n\nPre-Orders\nAt Popper Tulimond, we prioritize quality over mass production. To ensure each shirt meets our standards, many of our items are sold on a Pre-Order basis.\n\nEstimated Ship Dates: Any item designated as a "Pre-Order" will have an estimated shipping date clearly listed on the product page. Please note that this date is an estimate based on our current manufacturing capacity.\n\nDelayed Fulfillment: Because we produce in limited runs to maintain exclusivity and quality, high sales volume may occasionally extend our standard lead times.\n\nTransparency: If your order is delayed more than 7 business days beyond the original estimate, we will notify you via email with an updated timeline and the option to maintain or cancel your order.`,
} as const;

export const REFUND_CONTENT = {
  title: "Refund Policy",
  lastUpdated: "April 2026",
  body: `Our Guarantee\nAt Popper Tulimond, we take pride in the quality of our apparel. If you are not completely satisfied with your purchase, we are here to help.\n\nReturns\nYou have 30 calendar days to return an item from the date you received it. To be eligible for a return, your item must be unworn, unwashed, and in the same condition that you received it. It must be in the original packaging with all tags attached.\n\nRefunds\nOnce we receive your item, we will inspect it and notify you of the status of your refund. If approved, we will initiate a refund to your original method of payment. You will receive the credit within a certain amount of days, depending on your card issuer's policies.\n\nShipping Costs\nYou will be responsible for paying for your own shipping costs for returning your item. Return shipping costs are non-refundable, but in the event of a refund, we will refund the initial shipping expense as part of the refund.\n\nWhere To Return\n8925 W Flamingo Rd. Unit 227\nLas Vegas, NV 89147`,
} as const;
