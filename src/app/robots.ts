import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/checkout",
        "/api/",
        "/membership-setup",
        "/early-access",
        "/studio",
        "/sound-test",
      ],
    },
    sitemap: "https://www.poppertulimond.com/sitemap.xml",
  };
}
