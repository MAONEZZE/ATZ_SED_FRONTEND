# Design: sub-itens Externo/Interno em Comunicação (sidebar)

## Contexto
`components/layout/sidebar-nav.tsx` tem item placeholder "Comunicação" (`href: "/"`, ícone `Settings`). Sem página própria ainda — não criar rota. Pedido: dentro do item Comunicação, ter "abas" Externo e Interno, entendido como sub-itens expansíveis no próprio sidebar (accordion), não uma página com tabs.

## Decisão
Estender `sidebarNavItems` para suportar `children?: { href: string; label: string }[]` opcional por item. Apenas "Comunicação" ganha:

```ts
children: [
  { href: "/", label: "Externo" },
  { href: "/", label: "Interno" },
]
```

## Comportamento
- Item com `children`: renderiza como `<button>` (não `Link`), toggla estado expandido local, mostra ícone chevron que rotaciona (aberto/fechado).
- Sem `children`: comportamento atual inalterado (`Link` direto).
- Children renderizados indentados abaixo do pai quando expandido, como `Link`s.
- Sidebar colapsado (ícone-only): item pai não expande, comporta-se como hoje (ícone + tooltip via `title`), children ficam ocultos.
- Estado: `useState<string | null>` guardando href/label do item pai aberto (só um aberto por vez, default fechado).

## Fora de escopo
- Não criar rota `/communication` nem página nova.
- Não alterar Administração/Juridico (permanecem `Link` simples).
