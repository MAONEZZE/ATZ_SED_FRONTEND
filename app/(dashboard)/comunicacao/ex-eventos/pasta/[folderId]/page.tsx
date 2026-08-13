import { PastaPlaceholder } from "@/components/common/pasta-placeholder";

export default function PastaEventosPage() {
  return (
    <PastaPlaceholder
      breadcrumbItems={[
        { label: "Comunicação" },
        { label: "Externo" },
        { label: "Eventos", href: "/comunicacao/ex-eventos" },
      ]}
    />
  );
}
