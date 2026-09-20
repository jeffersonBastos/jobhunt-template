import crypto from 'node:crypto';

// Stable id independent of any single site's own id format, so the same job
// re-fetched later still dedupes correctly even if a platform's id changes shape.
export function makeId(ats, siteKey, externalId) {
  return crypto.createHash('sha1').update(`${ats}:${siteKey}:${externalId}`).digest('hex').slice(0, 16);
}

// Canonical shape every adapter must produce once text is available.
export function makeRecord({ ats, siteKey, company, externalId, title, location, remoteType, url, text, updatedAt, department }) {
  return {
    id: makeId(ats, siteKey, externalId),
    externalId: String(externalId),
    ats,
    siteKey,
    company,
    title: (title || '').trim(),
    location: location || 'unknown',
    remoteType: remoteType || 'unknown',
    department: department || null,
    url: url || null,
    text: text || '',
    updatedAt: updatedAt || null,
  };
}
