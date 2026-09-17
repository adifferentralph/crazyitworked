import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteConfig.url,
    rules: {
      allow: "/",
      disallow: [
        "/account",
        "/admin",
        "/api",
        "/cart",
        "/checkout",
        "/forgot-password",
        "/login",
        "/reset-password",
        "/seller",
        "/signup",
        "/suppliers/auth",
        "/vendor-login",
        "/vendor-signup",
        "/verify-email",
      ],
      userAgent: "*",
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
