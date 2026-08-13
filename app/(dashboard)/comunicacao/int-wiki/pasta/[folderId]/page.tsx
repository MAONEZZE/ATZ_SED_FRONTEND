import { PastaPlaceholder } from "@/components/common/pasta-placeholder";

export default function PastaWikiPage() {
  return (
    <PastaPlaceholder
      breadcrumbItems={[
        { label: "Comunicação" },
        { label: "Interno" },
        { label: "Wiki (Docs)", href: "/comunicacao/int-wiki" },
      ]}
    />
  );
}
