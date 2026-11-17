import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPLOAD_DIRECTORY } from '../lib/images.js';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDirectory = path.join(projectDirectory, 'data');

const computerExamples = [
  { name: 'Apex Gaming Tower', brand: 'Northstar Builds', type: 'High-End Computer', description: 'A powerful gaming desktop designed for high frame rates, detailed graphics, and quiet cooling during long sessions.', price: 2499.99, releaseDate: '2026-03-15', used: false, imageIndex: 0 },
  { name: 'Aurora Creator Workstation', brand: 'Northstar Builds', type: 'High-End Computer', description: 'A balanced workstation for video editing, 3D rendering, and other demanding creative workloads.', price: 2199.50, releaseDate: '2026-02-20', used: false, imageIndex: 2 },
  { name: 'Summit Pro Desktop', brand: 'Summit Systems', type: 'High-End Computer', description: 'A premium desktop with room for future upgrades and the performance needed for intensive professional applications.', price: 2899, releaseDate: '2026-05-01', used: true, imageIndex: 4 },
  { name: 'Everyday Office PC', brand: 'Clearview Computers', type: 'Modern Computer', description: 'A dependable computer for office applications, online meetings, web browsing, and everyday home use.', price: 799.99, releaseDate: '2026-01-10', used: false, imageIndex: 1 },
  { name: 'Compact Home Desktop', brand: 'Clearview Computers', type: 'Modern Computer', description: 'A compact and efficient desktop that fits easily into a home workspace while handling common daily tasks.', price: 649.95, releaseDate: '2025-11-18', used: false, imageIndex: 3 },
  { name: 'Studio Editing PC', brand: 'Pixel Forge', type: 'Modern Computer', description: 'A versatile system for photo editing, light video production, and multitasking across creative software.', price: 1199, releaseDate: '2026-04-04', used: true, imageIndex: 5 },
  { name: 'Starter Desktop', brand: 'ValueTech', type: 'Low-End Computer', description: 'An affordable desktop for schoolwork, documents, streaming, and other basic computing needs.', price: 399.99, releaseDate: '2025-09-12', used: false, imageIndex: 6 },
  { name: 'Small Space PC', brand: 'ValueTech', type: 'Low-End Computer', description: 'A small, budget-friendly computer that provides reliable performance for web browsing and basic productivity.', price: 329, releaseDate: '2025-07-30', used: true, imageIndex: 7 },
  { name: 'Essential Family Computer', brand: 'Everyday Systems', type: 'Low-End Computer', description: 'A practical entry-level computer for family use, online learning, and everyday applications.', price: 459.50, releaseDate: '2026-06-02', used: false, imageIndex: 8 }
];

const componentExamples = [
  [
    { name: 'Ryzen Gaming Processor', brand: 'AMD', type: 'CPU', price: 449.99 },
    { name: 'GeForce Gaming Graphics', brand: 'NVIDIA', type: 'GPU', price: 999.99 }
  ],
  [
    { name: 'Creator Core Processor', brand: 'Intel', type: 'CPU', price: 529.99 },
    { name: 'Studio Graphics Card', brand: 'NVIDIA', type: 'GPU', price: 749.99 }
  ],
  [
    { name: 'Summit ATX Motherboard', brand: 'ASUS', type: 'Motherboard', price: 299.99 },
    { name: 'Quiet Liquid Cooling', brand: 'Arctic', type: 'Cooling System', price: 139.99 }
  ],
  [
    { name: 'Everyday Six-Core CPU', brand: 'AMD', type: 'CPU', price: 169.99 },
    { name: 'Reliable DDR5 Memory', brand: 'Kingston', type: 'RAM', price: 89.99 }
  ],
  [
    { name: 'Compact Micro-ATX Case', brand: 'Fractal Design', type: 'Case', price: 79.99 },
    { name: 'Fast NVMe Storage', brand: 'WD', type: 'Storage', price: 74.99 }
  ],
  [
    { name: 'Studio DDR5 Memory', brand: 'Corsair', type: 'RAM', price: 129.99 },
    { name: 'Efficient Modular PSU', brand: 'Seasonic', type: 'PSU', price: 119.99 }
  ],
  [
    { name: 'Entry-Level Processor', brand: 'Intel', type: 'CPU', price: 99.99 },
    { name: 'Basic Solid State Drive', brand: 'Crucial', type: 'Storage', price: 49.99 }
  ],
  [
    { name: 'Mini Desktop Motherboard', brand: 'MSI', type: 'Motherboard', price: 89.99 },
    { name: 'Low-Profile Cooling Fan', brand: 'Noctua', type: 'Cooling System', price: 24.99 }
  ],
  [
    { name: 'Family PC Memory Kit', brand: 'Kingston', type: 'RAM', price: 39.99 },
    { name: 'Compact Power Supply', brand: 'Corsair', type: 'PSU', price: 54.99 }
  ]
];

function storedImageName(filename) {
  const extension = path.extname(filename).toLowerCase();
  const normalizedExtension = extension === '.jpeg' ? '.jpg' : extension;
  const name = createHash('sha256').update(filename).digest('hex').slice(0, 32);
  return `${name}${normalizedExtension}`;
}

async function copySeedImages() {
  await fs.mkdir(UPLOAD_DIRECTORY, { recursive: true });
  const filenames = (await fs.readdir(dataDirectory))
    .filter(filename => /\.(?:png|jpe?g|webp)$/i.test(filename))
    .sort();
  if (filenames.length < 10) throw new Error('The data directory must contain at least 10 sample images.');

  const imageNames = [];
  for (const filename of filenames) {
    const sourcePath = path.join(dataDirectory, filename);
    const stats = await fs.stat(sourcePath);
    if (stats.size > 5 * 1024 * 1024) throw new Error(`Seed image exceeds 5 MB: ${filename}`);
    const imageName = storedImageName(filename);
    await fs.copyFile(sourcePath, path.join(UPLOAD_DIRECTORY, imageName));
    imageNames.push(imageName);
  }
  return imageNames;
}

export async function seedCatalogIfEmpty(collections) {
  const [computerCount, componentCount] = await Promise.all([
    collections.computers.countDocuments(),
    collections.components.countDocuments()
  ]);
  if (computerCount !== 0 || componentCount !== 0) {
    return { inserted: false, reason: 'collections-not-empty' };
  }

  const imageNames = await copySeedImages();
  const computers = computerExamples.map(({ imageIndex, ...computer }) => ({
    ...computer,
    image: imageNames[imageIndex]
  }));
  const insertedComputers = await collections.computers.insertMany(computers);
  const components = componentExamples.flatMap((examples, computerIndex) =>
    examples.map((component, componentIndex) => ({
      ...component,
      description: `${component.name} is a reliable ${component.type.toLowerCase()} selected for this example computer build.`,
      image: imageNames[(computerIndex + componentIndex + 1) % imageNames.length],
      computerId: insertedComputers.insertedIds[computerIndex]
    }))
  );
  await collections.components.insertMany(components);
  return { inserted: true, computerCount: computers.length, componentCount: components.length };
}
