# Whiteboard v10 — Property-first Keys prototype

This revision rebuilds the Keys area around the physical key tag/property record.

- Key Tag # is always the first column, then Property.
- Lockboxes no longer appear as separate main rows; they attach to a property key record.
- Top operational counts emphasize LB OUT and KEYS OUT.
- Expanded key records support dated Key Checked Out / Key Returned and LB Checked Out / LB Returned actions.
- Available lockboxes are chosen from a dropdown; unavailable boxes remain visible but disabled.
- History combines key and currently assigned lockbox movement records.
- More menu includes Key Missing, LB Missing, and Edit Key Tag / Property.
- Lockbox Inventory is a simple numbered pool with numbers 1–50 available to add.
- Existing localStorage inventory is retained/migrated by the UI rather than erased.
