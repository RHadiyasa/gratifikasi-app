import React from "react";
import Breadcrumb from "@/app/about/_components/BreadCumb";

const TagihanKas = () => {
  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Uang Kas", href: "/about/super-admin-123/kas" },
          { label: "Tagihan Uang Kas" },
        ]}
      />

      <h1 className="text-2xl font-semibold text-foreground">Tagihan Uang Kas</h1>

      {/* your content */}
    </div>
  );
};

export default TagihanKas;
