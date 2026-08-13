import { PastaPlaceholder } from "@/components/common/pasta-placeholder";

export default function PastaTreinamentosPage() {
  return (
    <PastaPlaceholder
      breadcrumbItems={[
        { label: "Comunicação" },
        { label: "Interno" },
        { label: "Treinamentos", href: "/comunicacao/int-treinamentos" },
      ]}
    />
  );
}
