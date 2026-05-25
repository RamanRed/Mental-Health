import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  reactStrictMode: true,
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
