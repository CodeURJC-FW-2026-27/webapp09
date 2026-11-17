import express from 'express';
import mustacheExpress from 'mustache-express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import computerRouter from './computers/computer.routes.js';
import componentRouter from './components/component.routes.js';
import { connectPcPartsDB } from './database/pc-parts-db.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, '..');

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(projectDirectory, 'views'));

app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(express.static(path.join(projectDirectory, 'public')));

// Mount the nested router first so its paths are not consumed by /computers/:id.
app.use('/computers/:computerId/components', componentRouter);
app.use('/computers', computerRouter);
app.get('/', (req, res) => res.redirect(302, '/computers'));

async function startServer() {
  try {
    const { computers, components } = await connectPcPartsDB();
    app.locals.pcPartsCollections = { computers, components };
    console.log('MongoDB connected: pc_parts_catalog (computers, components).');
  } catch (error) {
    console.error(error.message);
    console.error('The web server will start; catalog routes will return 503 until MongoDB is available.');
  }

  app.listen(port, () => console.log(`PC Parts Catalog ready at http://localhost:${port}/computers`));
}

startServer();
