require('dotenv').config();

const express = require('express');
const mustacheExpress = require('mustache-express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { ObjectId } = require('mongodb');
const { connectToDatabase, closeDatabase } = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const rootDirectory = __dirname;
const uploadsDirectory = path.join(rootDirectory, 'uploads');
const computerTypes = ['High-End Computer', 'Modern Computer', 'Low-End Computer'];
const componentTypes = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling System'];
const imageStorage = multer.diskStorage({
    destination: uploadsDirectory,
    filename: (request, file, callback) => {
        callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    }
});
const upload = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (request, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
    }
});

fs.mkdirSync(uploadsDirectory, { recursive: true });
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(rootDirectory, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(rootDirectory, 'public')));
app.use('/uploads', express.static(uploadsDirectory));

let database;

app.get('/health', async (request, response) => {
    try {
        await database.command({ ping: 1 });
        response.json({ status: 'ok', database: database.databaseName });
    } catch (error) {
        response.status(503).json({ status: 'unavailable' });
    }
});

function escapeRegularExpression(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toComputerView(computer) {
    return {
        ...computer,
        id: computer._id.toString(),
        price: Number(computer.price).toFixed(2),
        releaseDate: String(computer.releaseDate || '').slice(0, 10)
    };
}

function toComponentView(component) {
    return { ...component, id: component._id.toString(), price: Number(component.price || 0).toFixed(2) };
}

async function renderComputerDetails(response, computer, form = {}) {
    const components = await database.collection('components')
        .find({ computerId: computer._id })
        .sort({ name: 1 })
        .toArray();
    const componentType = form.component && form.component.type;

    return response.status(form.status || 200).render('details', {
        computer: toComputerView(computer),
        components: components.map(toComponentView),
        hasComponents: components.length > 0,
        componentCount: components.length,
        component: form.component || {},
        componentTypes: componentTypes.map(value => ({ value, selected: value === componentType })),
        error: form.error || ''
    });
}

function formImage(body, file, previousImage = '') {
    if (file) {
        return `/uploads/${file.filename}`;
    }
    return String(body.image || previousImage).trim();
}

function validateImage(image) {
    return image.startsWith('/images/') || /^https?:\/\//i.test(image) || /^\/uploads\//.test(image);
}

function validateComputer(body, image, requireImageUpload = false) {
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const price = Number(body.price);
    const date = String(body.releaseDate || '');

    if (!name || !/^\p{Lu}/u.test(name)) return 'The name is required and must start with an uppercase letter.';
    if (!String(body.brand || '').trim()) return 'Brand is required.';
    if (!computerTypes.includes(body.type)) return 'Select a valid computer type.';
    if (!description || description.length < 10 || description.length > 1000) return 'Description must contain between 10 and 1000 characters.';
    if (!Number.isFinite(price) || price < 0) return 'Price must be a non-negative number.';
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return 'A valid release date is required.';
    if (requireImageUpload && !image.startsWith('/uploads/')) return 'Choose an image file from your computer.';
    if (!image || !validateImage(image)) return 'Choose a valid image file.';
    return '';
}

function validateComponent(body, image, requireImageUpload = false) {
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const price = Number(body.price);

    if (!name || !/^\p{Lu}/u.test(name)) return 'The component name is required and must start with an uppercase letter.';
    if (!String(body.brand || '').trim()) return 'Brand is required.';
    if (!componentTypes.includes(body.type)) return 'Select a valid component type.';
    if (!description || description.length < 5 || description.length > 1000) return 'Description must contain between 5 and 1000 characters.';
    if (!Number.isFinite(price) || price < 0) return 'Price must be a non-negative number.';
    if (requireImageUpload && !image.startsWith('/uploads/')) return 'Choose an image file from your computer.';
    if (image && !validateImage(image)) return 'Choose a valid image file.';
    return '';
}

function computerFormData(computer = {}, error = '', editing = false) {
    return {
        computer,
        error,
        editing,
        formAction: editing ? `/computers/${computer.id}` : '/computers',
        formTitle: editing ? 'Edit Computer' : 'Create New Computer',
        submitLabel: editing ? 'Save Changes' : 'Save Computer',
        computerTypes: computerTypes.map(type => ({ value: type, selected: computer.type === type }))
    };
}

function componentFormData(computer, component = {}, error = '') {
    return {
        computer: toComputerView(computer),
        component,
        error,
        formAction: `/computers/${computer._id}/components${component.id ? `/${component.id}` : ''}`,
        componentTypes: componentTypes.map(type => ({ value: type, selected: component.type === type }))
    };
}

function getObjectId(value) {
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function getImageFromRequest(request, previousImage = '') {
    return formImage(request.body, request.file, previousImage);
}

async function deleteUploadedImage(image) {
    if (!image || !image.startsWith('/uploads/')) return;
    const imagePath = path.join(uploadsDirectory, path.basename(image));
    await fs.promises.unlink(imagePath).catch(() => {});
}

async function ensureSampleData() {
    const computers = database.collection('computers');
    const components = database.collection('components');

    await computers.createIndex({ nameKey: 1 }, { unique: true });
    await components.createIndex({ computerId: 1, nameKey: 1 }, { unique: true });

    if (await computers.countDocuments() === 0) {
        const samples = [
            ['Aurora Gaming X', 'Custom Build', 'High-End Computer', 'High-performance gaming desktop with a balanced component selection.', 1899.99, '2026-09-10', false],
            ['Nova Creator Pro', 'Nova Systems', 'High-End Computer', 'Powerful workstation designed for video editing and 3D rendering.', 2399.00, '2026-08-15', false],
            ['Orbit Modern One', 'Orbit', 'Modern Computer', 'Quiet everyday computer for work, study, and entertainment.', 999.00, '2026-05-21', false],
            ['Vertex Compact', 'Vertex', 'Modern Computer', 'Compact desktop with efficient cooling and room for future upgrades.', 849.50, '2026-04-04', false],
            ['Pixel Forge', 'Pixel', 'High-End Computer', 'High-end build with fast storage and a graphics card for demanding games.', 2099.00, '2026-03-19', false],
            ['Maple Office S', 'Maple', 'Low-End Computer', 'Reliable budget desktop for office applications and web browsing.', 499.99, '2025-11-02', false],
            ['Comet Mini', 'Comet', 'Low-End Computer', 'Small-form-factor computer for a home office or media center.', 579.00, '2025-09-18', false],
            ['Raptor Refurbished', 'Raptor', 'Modern Computer', 'Second-hand gaming computer tested and prepared for everyday use.', 699.00, '2025-06-07', true],
            ['Summit Workstation', 'Summit', 'High-End Computer', 'Expandable workstation for development, design, and technical workloads.', 1799.00, '2025-02-13', false]
        ].map(([name, brand, type, description, price, releaseDate, used], index) => ({
            name,
            nameKey: name.toLocaleLowerCase('en'),
            brand,
            type,
            description,
            price,
            releaseDate,
            used,
            image: index % 2 === 0 ? '/images/pcgaming.png' : '/images/pcgaming600x400.png'
        }));
        await computers.insertMany(samples);
    }

    if (await components.countDocuments() === 0) {
        const sampleComputers = await computers.find().sort({ name: 1 }).limit(3).toArray();
        const sampleComponents = [
            ['Ryzen 7 7800X3D', 'AMD', 'CPU', '8-core desktop processor for gaming and demanding workloads.', 389.99],
            ['GeForce RTX 5070', 'NVIDIA', 'GPU', 'Graphics card for high-resolution gaming and creative work.', 649.99],
            ['32 GB DDR5 Memory', 'Kingston', 'RAM', 'Dual-channel DDR5 memory kit for a responsive system.', 109.99]
        ];
        if (sampleComputers.length) {
            await components.insertMany(sampleComponents.map(([name, brand, type, description, price], index) => ({
                computerId: sampleComputers[index % sampleComputers.length]._id,
                name,
                nameKey: name.toLocaleLowerCase('en'),
                brand,
                type,
                description,
                price,
                image: ''
            })));
        }
    }
}

app.get('/', async (request, response, next) => {
    try {
        const search = String(request.query.search || '').trim();
        const type = computerTypes.includes(request.query.type) ? request.query.type : '';
        const filter = {};
        if (search) filter.name = { $regex: escapeRegularExpression(search), $options: 'i' };
        if (type) filter.type = type;

        const pageSize = 6;
        const total = await database.collection('computers').countDocuments(filter);
        const pageCount = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(Number.parseInt(request.query.page, 10) || 1, 1), pageCount);
        const results = await database.collection('computers')
            .find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .toArray();
        const query = new URLSearchParams();
        if (search) query.set('search', search);
        if (type) query.set('type', type);

        response.render('index', {
            computers: results.map(toComputerView),
            search,
            computerTypes: computerTypes.map(value => ({ value, selected: value === type })),
            pages: Array.from({ length: pageCount }, (_, index) => {
                const pageQuery = new URLSearchParams(query);
                pageQuery.set('page', String(index + 1));
                return { number: index + 1, selected: index + 1 === page, href: `/?${pageQuery}` };
            }),
            previousPage: page > 1 ? `/?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) })}` : '',
            nextPage: page < pageCount ? `/?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) })}` : '',
            hasPages: pageCount > 1,
            hasComputers: results.length > 0
        });
    } catch (error) {
        next(error);
    }
});

app.get('/computers/new', (request, response) => response.render('create', computerFormData()));

app.post('/computers', upload.single('imageFile'), async (request, response, next) => {
    try {
        const image = getImageFromRequest(request);
        const error = validateComputer(request.body, image, true);
        if (error) {
            await deleteUploadedImage(image);
            return response.status(400).render('create', computerFormData(request.body, error));
        }

        const name = request.body.name.trim();
        const document = {
            name,
            nameKey: name.toLocaleLowerCase('en'),
            brand: request.body.brand.trim(),
            type: request.body.type,
            description: request.body.description.trim(),
            price: Number(request.body.price),
            releaseDate: request.body.releaseDate,
            used: request.body.used === 'on',
            image
        };
        const result = await database.collection('computers').insertOne(document);
        return response.redirect(303, `/computers/${result.insertedId}`);
    } catch (error) {
        if (error.code === 11000) {
            if (request.file) await deleteUploadedImage(`/uploads/${request.file.filename}`);
            return response.status(400).render('create', computerFormData(request.body, 'A computer with this name already exists.'));
        }
        next(error);
    }
});

app.get('/computers/:id/edit', async (request, response, next) => {
    try {
        const id = getObjectId(request.params.id);
        const computer = id && await database.collection('computers').findOne({ _id: id });
        if (!computer) return response.sendStatus(404);
        response.render('create', computerFormData(toComputerView(computer), '', true));
    } catch (error) {
        next(error);
    }
});

app.post('/computers/:id', upload.single('imageFile'), async (request, response, next) => {
    try {
        const id = getObjectId(request.params.id);
        const existing = id && await database.collection('computers').findOne({ _id: id });
        if (!existing) return response.sendStatus(404);

        const image = getImageFromRequest(request, existing.image);
        const error = validateComputer(request.body, image);
        if (error) {
            await deleteUploadedImage(request.file ? `/uploads/${request.file.filename}` : '');
            return response.status(400).render('create', computerFormData({ ...existing, ...request.body, id: id.toString(), image }, error, true));
        }

        const name = request.body.name.trim();
        await database.collection('computers').updateOne({ _id: id }, { $set: {
            name,
            nameKey: name.toLocaleLowerCase('en'),
            brand: request.body.brand.trim(),
            type: request.body.type,
            description: request.body.description.trim(),
            price: Number(request.body.price),
            releaseDate: request.body.releaseDate,
            used: request.body.used === 'on',
            image
        } });
        if (image !== existing.image) await deleteUploadedImage(existing.image);
        return response.redirect(303, `/computers/${id}`);
    } catch (error) {
        if (error.code === 11000) return response.status(400).render('create', computerFormData({ ...request.body, id: request.params.id }, 'A computer with this name already exists.', true));
        next(error);
    }
});

app.post('/computers/:id/delete', async (request, response, next) => {
    try {
        const id = getObjectId(request.params.id);
        const computer = id && await database.collection('computers').findOne({ _id: id });
        if (!computer) return response.sendStatus(404);
        await Promise.all([
            database.collection('computers').deleteOne({ _id: id }),
            database.collection('components').deleteMany({ computerId: id }),
            deleteUploadedImage(computer.image)
        ]);
        return response.redirect(303, '/');
    } catch (error) {
        next(error);
    }
});

app.get('/computers/:id', async (request, response, next) => {
    try {
        const id = getObjectId(request.params.id);
        const computer = id && await database.collection('computers').findOne({ _id: id });
        if (!computer) return response.sendStatus(404);
        await renderComputerDetails(response, computer);
    } catch (error) {
        next(error);
    }
});

app.post('/computers/:id/components', upload.single('imageFile'), async (request, response, next) => {
    try {
        const computerId = getObjectId(request.params.id);
        const computer = computerId && await database.collection('computers').findOne({ _id: computerId });
        if (!computer) return response.sendStatus(404);

        const image = getImageFromRequest(request);
        const error = validateComponent(request.body, image, true);
        if (error) {
            await deleteUploadedImage(image);
            return renderComputerDetails(response, computer, { status: 400, component: request.body, error });
        }

        const name = request.body.name.trim();
        await database.collection('components').insertOne({
            computerId,
            name,
            nameKey: name.toLocaleLowerCase('en'),
            brand: request.body.brand.trim(),
            type: request.body.type,
            description: request.body.description.trim(),
            price: Number(request.body.price),
            image
        });
        return response.redirect(303, `/computers/${computerId}`);
    } catch (error) {
        if (error.code === 11000) {
            const computer = await database.collection('computers').findOne({ _id: getObjectId(request.params.id) });
            if (request.file) await deleteUploadedImage(`/uploads/${request.file.filename}`);
            return renderComputerDetails(response, computer, { status: 400, component: request.body, error: 'This component already exists for this computer.' });
        }
        next(error);
    }
});

app.get('/computers/:id/components/:componentId/edit', async (request, response, next) => {
    try {
        const computerId = getObjectId(request.params.id);
        const componentId = getObjectId(request.params.componentId);
        const computer = computerId && await database.collection('computers').findOne({ _id: computerId });
        const component = componentId && await database.collection('components').findOne({ _id: componentId, computerId });
        if (!computer || !component) return response.sendStatus(404);
        response.render('edit-component', componentFormData(computer, toComponentView(component)));
    } catch (error) {
        next(error);
    }
});

app.post('/computers/:id/components/:componentId', upload.single('imageFile'), async (request, response, next) => {
    try {
        const computerId = getObjectId(request.params.id);
        const componentId = getObjectId(request.params.componentId);
        const computer = computerId && await database.collection('computers').findOne({ _id: computerId });
        const existing = componentId && await database.collection('components').findOne({ _id: componentId, computerId });
        if (!computer || !existing) return response.sendStatus(404);

        const image = getImageFromRequest(request, existing.image);
        const error = validateComponent(request.body, image);
        if (error) {
            await deleteUploadedImage(request.file ? `/uploads/${request.file.filename}` : '');
            return response.status(400).render('edit-component', componentFormData(computer, { ...existing, ...request.body, id: componentId.toString(), image }, error));
        }

        const name = request.body.name.trim();
        await database.collection('components').updateOne({ _id: componentId }, { $set: {
            name,
            nameKey: name.toLocaleLowerCase('en'),
            brand: request.body.brand.trim(),
            type: request.body.type,
            description: request.body.description.trim(),
            price: Number(request.body.price),
            image
        } });
        if (image !== existing.image) await deleteUploadedImage(existing.image);
        return response.redirect(303, `/computers/${computerId}`);
    } catch (error) {
        if (error.code === 11000) {
            const computer = await database.collection('computers').findOne({ _id: getObjectId(request.params.id) });
            return response.status(400).render('edit-component', componentFormData(computer, { ...request.body, id: request.params.componentId }, 'This component already exists for this computer.'));
        }
        next(error);
    }
});

app.post('/computers/:id/components/:componentId/delete', async (request, response, next) => {
    try {
        const computerId = getObjectId(request.params.id);
        const componentId = getObjectId(request.params.componentId);
        const component = componentId && await database.collection('components').findOne({ _id: componentId, computerId });
        if (!component) return response.sendStatus(404);
        await database.collection('components').deleteOne({ _id: componentId });
        await deleteUploadedImage(component.image);
        return response.redirect(303, `/computers/${computerId}`);
    } catch (error) {
        next(error);
    }
});

app.use((error, request, response, next) => {
    console.error(error.message);
    if (response.headersSent) return next(error);
    response.status(500).render('error', { message: 'The request could not be completed. Check the application logs and try again.' });
});

async function startServer() {
    database = await connectToDatabase();
    await ensureSampleData();
    app.listen(port, () => console.log(`Connected to MongoDB. Server listening at http://localhost:${port}`));
}

startServer().catch(error => {
    console.error(`Unable to start the application: ${error.message}`);
    process.exitCode = 1;
});

process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});