# Maker Market POS

Kid-friendly point-of-sale for the Shamrock Hills Kids Maker Market booth (Dec 10, 2026).

- Runs on an Android tablet in Chrome. Open the page once, then **⋮ → Add to Home screen**. After that it opens offline.
- Every sale is saved on the tablet immediately. Every 10 minutes the full list is backed up to the Google Sheet `POS_Sales_Log` (Test tab on practice days, Sales tab on Dec 10). Auto-backup stops 7:30 PM Dec 10.
- **Change total** (cart, parent PIN): sets a different total for the current order. It clears when items change or the sale is saved. The sale keeps both the calculated and the final total, and the log and CSV mark it as adjusted.
- Pricing: each product has a 1-item price and a 2-or-more price (defaults $6 and $5). Change them in the **Pricing** tab (parent PIN). The "any 2 or more" prices apply when the order has 2 or more items of any kind, across products.
- Settings live in the `CONFIG` block at the top of the script in `index.html` (Venmo QR, PIN, sync URL).
- After changing files, bump `VERSION` in `sw.js` so tablets pick up the update.
