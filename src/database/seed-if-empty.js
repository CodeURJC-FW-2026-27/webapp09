import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPLOAD_DIRECTORY } from '../lib/images.js';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDirectory = path.join(projectDirectory, 'data');

const computerExamples = [
  { name: 'Apex Gaming Tower', brand: 'Northstar Builds', type: 'High-End Computer', description: 'A powerful gaming desktop designed for high frame rates, detailed graphics, and quiet cooling during long sessions.', price: 2499.99, releaseDate: '2026-03-15', used: false, image: 'pcgaming.png' },
  { name: 'Aurora Creator Workstation', brand: 'Northstar Builds', type: 'High-End Computer', description: 'A balanced workstation for video editing, 3D rendering, and other demanding creative workloads.', price: 2199.50, releaseDate: '2026-02-20', used: false, image: 'Captura de pantalla 2026-10-12 125445(2).png' },
  { name: 'Summit Pro Desktop', brand: 'Summit Systems', type: 'High-End Computer', description: 'A premium desktop with room for future upgrades and the performance needed for intensive professional applications.', price: 2899, releaseDate: '2026-05-01', used: true, image: 'https://www.csl-computer.com/es/media/catalog/product/cache/7/image/3000x3000/9df78eab33525d08d6e5fb8d27136e95/8/9/89244---bb-mini-pc-csl-venombox-hs_01_3000px_18.webp' },
  { name: 'Everyday Office PC', brand: 'Clearview Computers', type: 'Modern Computer', description: 'A dependable computer for office applications, online meetings, web browsing, and everyday home use.', price: 799.99, releaseDate: '2026-01-10', used: false, image: '360_F_81271153_z1nD0djpmAU1YjDurPSaUnrJZ8hV1O1r.jpg' },
  { name: 'Compact Home Desktop', brand: 'Clearview Computers', type: 'Modern Computer', description: 'A compact and efficient desktop that fits easily into a home workspace while handling common daily tasks.', price: 649.95, releaseDate: '2025-11-18', used: false, image: 'https://cerebriti.b-cdn.net/uploads/FB_4ca608cd357efac71373eb399589f0f5.jpg' },
  { name: 'Studio Editing PC', brand: 'Pixel Forge', type: 'Modern Computer', description: 'A versatile system for photo editing, light video production, and multitasking across creative software.', price: 1199, releaseDate: '2026-04-04', used: true, image: 'https://img.directindustry.es/images_di/photo-m2/240602-16959869.jpg' },
  { name: 'Starter Desktop', brand: 'ValueTech', type: 'Low-End Computer', description: 'An affordable desktop for schoolwork, documents, streaming, and other basic computing needs.', price: 399.99, releaseDate: '2025-09-12', used: false, image: 'images(1).jpg' },
  { name: 'Small Space PC', brand: 'ValueTech', type: 'Low-End Computer', description: 'A small, budget-friendly computer that provides reliable performance for web browsing and basic productivity.', price: 329, releaseDate: '2025-07-30', used: true, image: 'https://cerebriti.b-cdn.net/uploads/FB_b9064dd5b1ed42a941322e0b9a9e3af4.jpg' },
  { name: 'Essential Family Computer', brand: 'Everyday Systems', type: 'Low-End Computer', description: 'A practical entry-level computer for family use, online learning, and everyday applications.', price: 459.50, releaseDate: '2026-06-02', used: false, image: 'Captura de pantalla 2026-10-11 101249.png' }
];

const componentImages = {
  CPU: 'https://www.gsmpro.cl/cdn/shop/files/procesador-amd-ryzen-7-7800x3d-7.webp?v=1775234196&width=1200',
  GPU: 'https://multimedia.bbycastatic.ca/multimedia/products/1500x1500/191/19193/19193219_2.jpg',
  Motherboard: 'https://asset-us-store.msi.com/image/cache/catalog/Pd_page/Motherboard/B650TOMAHAWKWIFI/B650TOMAHAWKWIFI-1-1024x1024.png',
  RAM: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/693901/large/Kit-De-Mem-ria-Para-PC-Corsair-Vengeance-32gb-6000mhz-2x16gb-Ddr5-Cmk32gx5m2e6000c36-5823-_1762281527.webp',
  Storage: 'https://cdn.atacadoconnect.com/produtos/1245967/ssd-m-2-samsung-990-evo-plus-1tb-nvme-pcie-gen-4-mz-v9s1t0b-am-1245967-96105.webp',
  PSU: 'https://assets.corsair.com/image/upload/c_pad%2Cq_85%2Ch_1100%2Cw_1100%2Cf_auto/products/Power-Supply-Units/CP-9020195-WW/Gallery/RM750_01.webp',
  Case: 'https://lcdi.fr/cdn/shop/files/corsair-4000d-airflow-noir.jpg?v=1745245056',
  'Cooling System': 'https://fly.bg/uploads/products/as/deepcool_ak400_cpu_air_cooler_1x120mm_pwm_fan_tdp_gwx9n.jpg'
};

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

  const imageNames = {};
  for (const filename of filenames) {
    const sourcePath = path.join(dataDirectory, filename);
    const stats = await fs.stat(sourcePath);
    if (stats.size > 5 * 1024 * 1024) throw new Error(`Seed image exceeds 5 MB: ${filename}`);
    const imageName = storedImageName(filename);
    await fs.copyFile(sourcePath, path.join(UPLOAD_DIRECTORY, imageName));
    imageNames[filename] = imageName;
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
  const computers = computerExamples.map(({ image, ...computer }) => ({
    ...computer,
    image: imageNames[image] || image
  }));
  const insertedComputers = await collections.computers.insertMany(computers);
  const components = componentExamples.flatMap((examples, computerIndex) =>
    examples.map(component => ({
      ...component,
      description: `${component.name} is a reliable ${component.type.toLowerCase()} selected for this example computer build.`,
      image: componentImages[component.type],
      computerId: insertedComputers.insertedIds[computerIndex]
    }))
  );
  await collections.components.insertMany(components);
  return { inserted: true, computerCount: computers.length, componentCount: components.length };
}
