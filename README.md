# Maker Market POS

Kid-friendly point-of-sale for the Shamrock Hills Kids Maker Market booth (Dec 10, 2026).

- Runs on an Android tablet in Chrome. Open the page once, then **⋮ → Add to Home screen**. After that it opens offline.
- Every sale is saved on the tablet immediately. Every 10 minutes the full list is backed up to the Google Sheet `POS_Sales_Log` (Test tab on practice days, Sales tab on Dec 10). Auto-backup stops 7:30 PM Dec 10.
- Pricing: two prices for every product, a 1-item price and a "2 or more (each)" price (defaults $6 / $5). Parents change them in the **Pricing** tab (PIN). The "2 or more" price can't be higher than the 1-item price. Prices are stored in the Google Sheet (Settings tab), and every change is listed in the Sales log and the sheet's Price log tab.
- Settings live in the `CONFIG` block at the top of the script in `index.html` (Venmo QR, PIN, sync URL).
- After changing files, bump `VERSION` in `sw.js` so tablets pick up the update.
