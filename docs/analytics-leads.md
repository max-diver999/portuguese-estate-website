# Lead analytics (GA4)

Implemented 2026-07-27. Events fire through `window.investGulfTrack` (see `src/components/GoogleAnalytics.astro`) with a `gtag` fallback.

| Event | Fired from |
|-------|------------|
| `generate_lead` | `src/components/LeadForm.astro` on POST success, before the `/thanks/` redirect |
| `whatsapp_click` | `src/components/WhatsAppIntentTracker.astro` for every `a[data-wa-placement]` |
| `page_view_thanks` | `src/pages/thanks/index.astro` when `lead=1` |

`/thanks/` re-fires `generate_lead` only when the form event did not land, tracked with the `pe_lead_event_sent` session flag, so a submission counts once.

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
