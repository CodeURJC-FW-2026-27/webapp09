export function renderError(res, { status = 500, title = 'Request error', message, backUrl = '/computers', backLabel = 'Back to catalog' }) {
  return res.status(status).render('pc-parts/error.mustache', {
    pageTitle: title,
    pageHeading: title,
    message,
    backUrl,
    backLabel
  });
}

export function renderConfirmation(res, { title, message, primaryUrl, primaryLabel, secondaryUrl = '/computers', secondaryLabel = 'Back to catalog' }) {
  return res.status(200).render('pc-parts/confirmation.mustache', {
    pageTitle: title,
    pageHeading: title,
    message,
    primaryUrl,
    primaryLabel,
    secondaryUrl,
    secondaryLabel
  });
}

export function renderDatabaseError(res, error, entity = 'Catalog') {
  console.error(`${entity} database error:`, error.message);
  if (res.headersSent) return;
  return renderError(res, {
    status: 503,
    title: 'Database unavailable',
    message: 'The catalog could not complete the request because the database is temporarily unavailable.'
  });
}

export function requireCollections(req, res) {
  const collections = req.app.locals.pcPartsCollections;
  if (collections?.computers && collections?.components) return collections;
  renderError(res, {
    status: 503,
    title: 'Catalog unavailable',
    message: 'The catalog is unavailable because MongoDB is not connected.'
  });
  return null;
}

export function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ''));
}
