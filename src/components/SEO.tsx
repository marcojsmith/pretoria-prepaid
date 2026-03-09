import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  url?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: string;
  noindex?: boolean;
}

export function SEO({
  title,
  description,
  canonical,
  url: propUrl,
  ogType = "website",
  ogImage = "https://pretoria-prepaid.vercel.app/icons/icon-512x512.png",
  twitterCard = "summary_large_image",
  noindex = false,
}: SEOProps) {
  const siteTitle = "Pretoria Prepaid";
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDescription =
    "Calculate and track your prepaid electricity costs in Pretoria. Understand South Africa's tiered pricing and track usage.";
  const metaDescription = description || defaultDescription;
  const url = propUrl || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
