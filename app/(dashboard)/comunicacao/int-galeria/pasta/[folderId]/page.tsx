import { PastaPlaceholder } from "@/components/common/pasta-placeholder";

export default function PastaGaleriaPage() {
  return (
    <PastaPlaceholder
      breadcrumbItems={[
        { label: "Comunicação" },
        { label: "Interno" },
        { label: "Galeria", href: "/comunicacao/int-galeria" },
      ]}
    />
  );
}
