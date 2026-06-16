#!/bin/bash
# Run after quota reset: sends all 50 Mexico URLs to Google Indexing API
# Usage: bash scripts/submit-all-50.sh
cd "$(dirname "$0")/.."
node scripts/google-indexing-api.mjs --explicit \
  https://mexico-invest.com/guides/mexico-property-investment-guide/ \
  https://mexico-invest.com/guides/fideicomiso-mexico-explained/ \
  https://mexico-invest.com/guides/buy-property-mexico-foreigner/ \
  https://mexico-invest.com/guides/mexico-rental-yield-guide/ \
  https://mexico-invest.com/guides/riviera-maya-property-investment-guide/ \
  https://mexico-invest.com/guides/cost-of-buying-property-mexico/ \
  https://mexico-invest.com/guides/due-diligence-mexico-real-estate/ \
  https://mexico-invest.com/guides/mexico-capital-gains-tax-foreign-seller/ \
  https://mexico-invest.com/guides/is-mexico-real-estate-good-investment-2026/ \
  https://mexico-invest.com/guides/can-foreigners-buy-property-mexico/ \
  https://mexico-invest.com/guides/mexico-property-for-americans/ \
  https://mexico-invest.com/guides/best-areas-invest-mexico-2026/ \
  https://mexico-invest.com/guides/invest-in-tulum/ \
  https://mexico-invest.com/guides/invest-in-playa-del-carmen/ \
  https://mexico-invest.com/guides/los-cabos-property-investment-guide/ \
  https://mexico-invest.com/guides/puerto-vallarta-property-investment-guide/ \
  https://mexico-invest.com/guides/mistakes-foreign-buyers-mexico/ \
  https://mexico-invest.com/guides/mexico-property-taxes-explained/ \
  https://mexico-invest.com/guides/mexico-property-closing-costs-breakdown/ \
  https://mexico-invest.com/guides/airbnb-investment-mexico-guide/ \
  https://mexico-invest.com/guides/how-to-buy-mexico-property-step-by-step/ \
  https://mexico-invest.com/guides/how-to-buy-mexico-property-remotely/ \
  https://mexico-invest.com/guides/how-to-calculate-rental-yield-mexico/ \
  https://mexico-invest.com/guides/gross-vs-net-yield-mexico/ \
  https://mexico-invest.com/guides/property-management-riviera-maya-cost/ \
  https://mexico-invest.com/guides/short-term-rental-rules-riviera-maya/ \
  https://mexico-invest.com/guides/fideicomiso-vs-mexican-corporation/ \
  https://mexico-invest.com/guides/mexico-restricted-zone-explained/ \
  https://mexico-invest.com/guides/bank-trust-renewal-mexico/ \
  https://mexico-invest.com/guides/notario-publico-mexico-property-role/ \
  https://mexico-invest.com/guides/escrow-mexico-real-estate/ \
  https://mexico-invest.com/guides/power-of-attorney-property-mexico/ \
  https://mexico-invest.com/guides/ejido-land-risks-mexico/ \
  https://mexico-invest.com/guides/mexico-real-estate-scams-avoid/ \
  https://mexico-invest.com/guides/non-resident-mortgage-mexico/ \
  https://mexico-invest.com/guides/tier-entry/ \
  https://mexico-invest.com/areas/tulum/ \
  https://mexico-invest.com/areas/playa-del-carmen/ \
  https://mexico-invest.com/areas/cancun/ \
  https://mexico-invest.com/areas/puerto-vallarta/ \
  https://mexico-invest.com/areas/cabo-san-lucas/ \
  https://mexico-invest.com/areas/san-jose-del-cabo/ \
  https://mexico-invest.com/areas/cabo-corridor/ \
  https://mexico-invest.com/areas/nuevo-vallarta/ \
  https://mexico-invest.com/areas/puerto-morelos/ \
  https://mexico-invest.com/compare/mexico-vs-florida-property-investment/ \
  https://mexico-invest.com/compare/playa-del-carmen-vs-tulum-investment/ \
  https://mexico-invest.com/compare/tulum-vs-cancun-investment/ \
  https://mexico-invest.com/compare/los-cabos-vs-riviera-maya/ \
  https://mexico-invest.com/compare/los-cabos-vs-puerto-vallarta/
