# Lead analytics (GA4)

Spec for production implementation. Cheap-pack documents names; expensive model wires events in layout or shared script.

## Goals

- Count form submissions that reach `/thanks/?lead=1`
- Count WhatsApp clicks from InlineCta and LeadForm
- Attribute by page path and `data-cta` id

## Recommended events

| Event name | Trigger | Parameters |
|------------|---------|------------|
| `generate_lead` | Form POST success before redirect | `form_id`, `page_path`, `lead_context` (from `data-context`) |
| `whatsapp_click` | Click on link with `data-cta` containing `whatsapp` | `cta_id`, `page_path`, `placement` (`data-wa-placement` if set) |
| `page_view_thanks` | `/thanks/` with `lead=1` | standard page_view or custom `lead_thank_you` |

## DOM hooks already on site

- Forms: `form.ig-lead-form`, `data-context="..."`
- WhatsApp: `data-cta="inline_*"` on InlineCta, `whatsapp_lead_form` on LeadForm
- Thanks URL: `/thanks/?lead=1`

## GA4 setup checklist

1. Mark `generate_lead` as conversion in GA4 admin
2. Optional: mark `whatsapp_click` as secondary conversion
3. DebugView test on staging or production with `debug_mode` parameter
4. Weekly report: leads = `generate_lead` count + manual Kommo cross-check

## Out of scope

- Kommo API sync (separate task)
- Server-side Measurement Protocol unless form API logs fail client-side
