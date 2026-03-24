# TaxGuide — Smart Indian Tax Assistant

> A conversational, client-side tax assistant for the Indian tax system.
> Compare Old vs New Regime. Find legal deductions. Pay the right tax.

Built under **[Hack Orbit](https://github.com/Hack-Orbit-Global/)** · Open Source · FY 2025–26

---

## What It Does

TaxGuide is a lightweight, fully browser-based tool that walks you through your
Indian income tax in a chat-style interface — no backend, no account, no data
collection.

- **Compare** Old Regime vs New Regime side by side
- **Calculate** your exact tax liability (including 87A rebate and 4% cess)
- **Discover** legal deductions under 80C, 80D, Home Loan, and HRA
- **Get tips** on how to legally reduce your tax
- **Zero data** — runs entirely in your browser

---

## Tech Stack

| Layer       | Technology                     |
|-------------|-------------------------------|
| Markup      | HTML5 (semantic)              |
| Styles      | Vanilla CSS (custom properties)|
| Logic       | Vanilla JavaScript (ES6+)     |
| Fonts       | System font stack             |
| Dependencies| **None**                      |

No frameworks. No libraries. No bundler. Just files.

---

## Tax Rules Implemented (FY 2025–26)

### New Regime

| Slab          | Rate |
|---------------|------|
| ₹0 – ₹3L      | 0%   |
| ₹3L – ₹6L     | 5%   |
| ₹6L – ₹9L     | 10%  |
| ₹9L – ₹12L    | 15%  |
| ₹12L – ₹15L   | 20%  |
| Above ₹15L    | 30%  |

- Standard Deduction: ₹50,000
- Rebate u/s 87A: taxable income ≤ ₹7L → tax = ₹0
- Cess: 4%

### Old Regime

| Slab          | Rate |
|---------------|------|
| ₹0 – ₹2.5L    | 0%   |
| ₹2.5L – ₹5L   | 5%   |
| ₹5L – ₹10L    | 20%  |
| Above ₹10L    | 30%  |

- Standard Deduction: ₹50,000
- Rebate u/s 87A: taxable income ≤ ₹5L → tax = ₹0
- Deductions: 80C (₹1.5L), 80D (₹25k), Home Loan 24(b) (₹2L), HRA (₹60k)
- Cess: 4%

---

## Project Structure

```
taxguide/
├── index.html
├── styles.css 
├── script.js   
└── README.md   
```

---

## Roadmap

- [ ] Surcharge calculation for income > ₹50L
- [ ] Section 80CCD(1B) NPS deduction input
- [ ] HRA city-based calculation (metro vs non-metro)
- [ ] PDF result export
- [ ] Senior citizen / super senior slab variants
- [ ] Multiple language support (Hindi, Bengali, Tamil)

---

## Contributing

Hack Orbit is an open community. All PRs welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Legal Disclaimer

> TaxGuide provides **educational guidance only** based on Indian tax laws for
> FY 2025–26. It does not constitute financial, legal, or professional tax
> advice. Tax rules are subject to change. Always consult a qualified
> Chartered Accountant for official tax filing.
>
> This tool promotes **legal tax saving** — not tax evasion.

---

## About the Builder

**Sabarna Barik** — Developer · Open Source contributor · Founder of Hack Orbit.

- GitHub: [github.com/bariksabarna](https://github.com/bariksabarna)
- Hack Orbit: [github.com/Hack-Orbit-Global](https://github.com/Hack-Orbit-Global)

---

## About Hack Orbit

**Hack Orbit** is an open-source developer community where real projects are
built in public, together. We believe learning happens fastest when you ship
real things with real people.

- 🌐 [hackorbitglobal.vercel.app](https://hackorbitglobal.vercel.app)
- 💬 [Discord](https://discord.gg/GVNnacYENf)
- 🐙 [GitHub](https://github.com/Hack-Orbit-Global/)

---

## License
Apache License.

Built in public by [Hack Orbit](https://github.com/Hack-Orbit-Global/) · 2026

## IF YOU CONTRIBUTE TO THE REPOSITORY KINDLY ADD YOUR NAME, AND WHAT YOU CONTRIBUTE INSIDE ()
## IN COMTRIBUTION.MD FILE. ITS YOUR RESPOSIBILITY TO ADD YOU NAME IN THE FILE OTHERWISE THE PULL REQUEST WILL BE ACEPTED WITHOUT YOUR NAME IN CONTRIBUTION.MD 
