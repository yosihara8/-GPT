import BusinessNav from "@/components/BusinessNav";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <BusinessNav>{children}</BusinessNav>;
}
