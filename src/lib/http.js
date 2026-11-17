// Shared HTTP response helpers for catalog routes.

/**
 * Render the shared error page with an optional validation list and return link.
 * @param {import('express').Response} res
 * @param {{status?: number, title?: string, message?: string, errors?: string[], backUrl?: string, backLabel?: string}} options
 * @returns {import('express').Response}
 */
export function renderError(res, { status = 500, title = 'Request error', message, errors, backUrl = '/computers', backLabel = 'Back to catalog' }) {
  return res.status(status).render('pc-parts/error.mustache', {
    pageTitle: title,
    pageHeading: title,
    message,
    errors,
    backUrl,
    backLabel
  });
}

/**
 * Render the shared confirmation page.
 * @param {import('express').Response} res
 * @param {{title: string, message: string, primaryUrl: string, primaryLabel: string, secondaryUrl?: string, secondaryLabel?: string}} options
 * @returns {import('express').Response}
 */
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

/**
 * Log a database failure and render a service-unavailable page.
 * @param {import('express').Response} res
 * @param {Error} error
 * @param {string} [entity]
 * @returns {import('express').Response | undefined}
 */
export function renderDatabaseError(res, error, entity = 'Catalog') {
  console.error(`${entity} database error:`, error.message);
  if (res.headersSent) return;
  return renderError(res, {
    status: 503,
    title: 'Database unavailable',
    message: 'The catalog could not complete the request because the database is temporarily unavailable.'
  });
}

/**
 * Return the connected catalog collections or render a service-unavailable page.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {{computers: import('mongodb').Collection, components: import('mongodb').Collection} | null}
 */
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

/**
 * Check whether a value has the format of a MongoDB ObjectId.
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ''));
}
