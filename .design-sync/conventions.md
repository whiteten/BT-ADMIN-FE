# BT Admin Design System — build conventions

This DS is **shadcn/ui (Radix) + custom components**, styled with **Tailwind CSS v4**.
Every component is on `window.BtUI.*` (compiled from the real `libs/shared-ui` source). Two groups:
- `shadcn/` — UI primitives and their compound parts (flat exports: `Card`, `CardHeader`, `CardContent`, `Dialog`, `DialogContent`, …).
- `custom/` — app building blocks (`FallbackSpinner`, `NoData`, `PageTabs`, `TreeRow`/`TreeCaret`/`TreeLabel`, AG-Grid cell renderers, brand `Icon*` SVGs, …).

## Styling idiom — Tailwind v4 utility classes + CSS-variable tokens

Style with Tailwind utility classes. Colors map to CSS-variable tokens defined in `styles.css` — **use the token classes, do not hardcode hex**. Real token families (all present in the shipped `styles.css`):

| Purpose | Class examples |
|---|---|
| Surface | `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-accent`, `bg-secondary` |
| Foreground/text | `text-foreground`, `text-muted-foreground`, `text-card-foreground`, `text-primary` |
| Brand / action | `bg-primary text-primary-foreground`, `bg-destructive text-white` |
| Border / ring | `border`, `border-border`, `ring-ring`, `outline-ring/50` |
| Sidebar | `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent` |
| Radius (`--radius`) | `rounded-md`, `rounded-lg`, `rounded-xl` |
| Brand primary var | `text-[var(--color-bt-primary)]` (BT blue `#085fb5`) |
| Custom util | `bt-shadow` (rounded card shadow), `bt-scroll-hide` |

Dark mode: tokens have `.dark` overrides — wrap a subtree in `class="dark"` to switch.

## Composition rules

- Import the control from the library; write layout/glue with Tailwind utilities.
- **Compounds**: build from their parts — `Card` → `CardHeader`/`CardTitle`/`CardContent`/`CardFooter`; `Dialog` → `DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`; `Select` → `SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`. Sub-parts render only inside their parent.
- **Providers**: most components need none. Exceptions: `Tooltip*` needs `TooltipProvider`; the `Sidebar*` family needs `SidebarProvider`.
- **Buttons**: `Button` takes `variant` (`default`/`destructive`/`outline`/`secondary`/`ghost`/`link`) and `size` (`default`/`sm`/`lg`/`icon`). (These come from a `cva` config; the `.d.ts` may not list them — they are valid.)
- **Icons**: brand SVGs are `Icon*` exports (e.g. `IconSearch`, `IconBot`); general UI icons use `lucide-react`.
- **Toasts**: render `<Toaster />` once; the app's toast util drives it.

## antd components (primary toolkit) — `Ant*` prefix

This project is built primarily with **Ant Design (antd v6)**, with shadcn/custom as the secondary layer. The 39 most-used antd components are bundled under an `Ant` prefix to avoid name clashes with shadcn (`window.BtUI.AntButton`, `AntForm`, `AntSelect`, `AntModal`, `AntDrawer`, `AntDatePicker`, `AntTable`-NOTE: not bundled, see below).

- **Available (39)**: AntButton, AntInput, AntSelect, AntForm, AntDrawer, AntInputNumber, AntCol, AntRow, AntTag, AntModal, AntEmpty, AntTooltip, AntRadio, AntCheckbox, AntDatePicker, AntTimePicker, AntDivider, AntSwitch, AntDropdown, AntSteps, AntAlert, AntTabs, AntCard, AntUpload, AntCollapse, AntSpin, AntSegmented, AntSlider, AntPopover, AntSpace, AntProgress, AntBadge, AntDescriptions, AntApp, AntTypography, AntPopconfirm, AntConfigProvider, AntSkeleton, AntBreadcrumb.
- **antd styling**: antd v6 is CSS-in-JS — components self-style at runtime, no utility classes needed. Wrap a subtree in `AntConfigProvider` to theme. antd compound parts are reached via the namespace (`AntForm.Item`, `AntSelect.Option`, `AntTypography.Text`, `AntRadio.Group`).
- **NOT bundled (use the alternative)**: `Table` → use AG-Grid (project table standard); `Transfer`/`Tree`/`TreeSelect`/`AutoComplete`/`Pagination`/`List` and other rarely-used antd parts were dropped to keep the bundle under size limits — if needed, they are still real antd imports in app code.
- **antd vs shadcn**: forms/data-entry-heavy screens lean antd (`AntForm` + rules); shadcn primitives (`Button`, `Card`, …) for lighter composition. Match the surrounding screen.

## Where the truth lives

- `styles.css` (+ its `@import` of `_ds_bundle.css`) — all token definitions and utilities.
- Each component's `<Name>.d.ts` (props) and `<Name>.prompt.md` (usage).

## Idiomatic build snippet

```jsx
const { Card, CardHeader, CardTitle, CardContent, Button, Badge } = window.BtUI;

<Card className="w-80 bt-shadow">
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      봇 목록 <Badge>3</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
    <p>활성 봇 3개가 실행 중입니다.</p>
    <Button variant="default" size="sm" className="self-end">새 봇</Button>
  </CardContent>
</Card>
```
