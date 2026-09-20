# ATS-safe resumes

Single-column, parse-friendly versions of the resumes, for uploads to Applicant
Tracking Systems (ATS) that can choke on the two-column designed PDF.

- **Same markdown source** as `../resumes/` — no separate content to maintain.
- Rendered with `build/resume-ats.css` (single column, standard sans-serif font,
  no grid/tables/colors/decorative graphics) via the `--ats` flag.
- Use the **designed** PDFs (`../resumes/<pivot>/`) when a human reads it (email,
  referral, your own site); use **these** when uploading into a company's ATS form.

## Filenames

`build.js` writes send-ready names, so nothing needs renaming before it goes out.
Your slug and pivot numbers come from `build/config.yaml` (copy
`build/config.example.yaml` to set your own):

```
<slug>-<word>-<n>-ats.pdf     # here, ATS-safe
<slug>-<word>-<n>.pdf         # ../resumes/<pivot>/, designed
```

`<word>` is the language — **resume** for EN, **cv** for PT. `<n>` is the pivot
number from `pivot_numbers` in `build/config.yaml` (defaults: `web2` → **2**,
`web3-ai` → **3**). So with `slug: your-name` the full set is:

| | designed (`../resumes/<pivot>/`) | ATS-safe (here) |
|---|---|---|
| web2 EN | `your-name-resume-2.pdf` | `your-name-resume-2-ats.pdf` |
| web2 PT | `your-name-cv-2.pdf` | `your-name-cv-2-ats.pdf` |
| web3-ai EN | `your-name-resume-3.pdf` | `your-name-resume-3-ats.pdf` |
| web3-ai PT | `your-name-cv-3.pdf` | `your-name-cv-3-ats.pdf` |

A new pivot needs its number added to `pivot_numbers` in `build/config.yaml`;
without one it falls back to the folder name.

## Regenerate

Omit the output path and the convention applies itself:

```
cd build
node build.js ../resumes/web2/en.md --ats     # → resumes-ats/<slug>-resume-2-ats.pdf

# everything, both variants, both pivots, whichever languages exist:
for p in web2 web3-ai; do for f in ../resumes/$p/*.md; do \
  node build.js "$f"; node build.js "$f" --ats; done; done
```

PDFs here are git-ignored (build artifacts) — regenerate any time from the markdown.
