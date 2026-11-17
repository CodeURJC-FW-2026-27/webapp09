import express from 'express';
import mustacheExpress from 'mustache-express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import computerRouter from './computers/computer.routes.js';
import componentRouter from './components/component.routes.js';
import { connectPcPartsDB } from './database/pc-parts-db.js';
import { seedCatalogIfEmpty } from './database/seed-if-empty.js';
import { renderError } from './lib/http.js';
import { isImageUploadError, serveUploadedImage, uploadErrorMessage } from './lib/images.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, '..');
const viewsDirectory = path.join(projectDirectory, 'views');

export function createApp({ collections } = {}) {
  const app = express();
  app.engine('mustache', mustacheExpress(path.join(viewsDirectory, 'partials')));
  app.set('view engine', 'mustache');
  app.set('views', viewsDirectory);
  app.use(express.urlencoded({ extended: true, limit: '20kb' }));
  app.use(express.static(path.join(projectDirectory, 'public')));
  app.get('/uploads/:filename', serveUploadedImage);
  app.use('/computers/:computerId/components', componentRouter);
  app.use('/computers', computerRouter);
  app.get('/', (_req, res) => res.redirect(302, '/computers'));
  if (collections) app.locals.pcPartsCollections = collections;

  app.use((req, res) => renderError(res, {
    status: 404,
    title: 'Page not found',
    message: `No page exists at ${req.originalUrl}.`
  }));

  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error?.code === 'LIMIT_FILE_SIZE' ? 413 : (isImageUploadError(error) ? 400 : 500);
    console.error('Request processing error:', error?.message || error);
    return renderError(res, {
      status,
      title: isImageUploadError(error) ? 'Image upload error' : 'Request error',
      message: isImageUploadError(error) ? uploadErrorMessage(error) : 'The request could not be completed. Please try again.'
    });
  });
  return app;
}

export async function startServer() {
  const app = createApp();
  try {
    app.locals.pcPartsCollections = await connectPcPartsDB();
    const seedResult = await seedCatalogIfEmpty(app.locals.pcPartsCollections);
    if (seedResult.inserted) console.log('An example computer and component were added to the empty catalog.');
    else console.log('Catalog initialization skipped because existing data was found.');
    console.log('MongoDB connected: pc_parts_catalog (computers, components).');
  } catch (error) {
    console.error(error.message);
    console.error('The web server will start; catalog routes will return a styled 503 page until MongoDB is available.');
  }
  const port = Number(process.env.PORT) || 3001;
  return app.listen(port, () => console.log(`PC Parts Catalog ready at http://localhost:${port}/computers`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
