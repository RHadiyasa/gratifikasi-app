import Breadcrumb from "@/app/about/_components/BreadCumb";

export default function TransaksiPage() {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Uang Kas", href: "/about/super-admin-123/kas" },
          { label: "Transaksi Uang Kas" },
        ]}
      />

      <h1 className="text-2xl font-semibold text-foreground">
        Transaksi Uang Kas
      </h1>

      {/* your content */}
    </div>
  );
}
