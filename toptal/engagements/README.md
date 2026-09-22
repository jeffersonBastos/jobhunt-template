# Toptal engagements

One folder per won engagement: `engagements/<client-slug>/`. Created when a trial
starts, not before.

What belongs here (management layer, safe to keep in this repo):

```
<client-slug>/
  README.md        # client, recruiter, engagement type, rate, start date, trial end date
  status-log.md    # the running record used for client updates (see below)
  decisions.md     # scope agreements, expectations set, anything agreed in writing
```

What does **not** belong here: client code, client data, credentials, NDA material.
That lives in its own workspace outside jobhunt (`~/Projects/private/<client>/` or
wherever the client's repo goes) and is deleted at the end of the engagement, per the
confidentiality rule in [`../rules.md`](../rules.md).

## The status log is the point

The platform's stated bar is that the client never has to ask for a status update, and
that you and the client would give identical answers to: what am I working on now, what
was I just working on, what's next. `status-log.md` exists so that answer is always
one file away — append daily/weekly depending on the client's preference, and use it
to write the update itself.

Trial period is up to 10 business days and the pay for it depends on the client being
satisfied at the end — so during a trial the log gets written every day.
