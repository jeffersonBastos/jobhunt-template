# applications/

One folder per job you actually apply to: `applications/<company-slug>/`.
Typical contents per folder:

- `job-posting.md` — a snapshot of the posting (title, URL, description) at
  the time you applied, so it survives the listing being taken down later.
- `answers.md` — screening-question answers tailored to this posting, drafted
  from `answers/bank.md` by the `job-apply` skill.
- Tailored copies of your resume/cover letter, if you customized them beyond
  the base versions in `resumes/` and `cover-letters/`.

This README doubles as a place to keep an index table (company, role, date
applied, status) once you have applications to track — some setups
auto-generate that table from the folders above via the scouting pipeline's
`digest` command.
