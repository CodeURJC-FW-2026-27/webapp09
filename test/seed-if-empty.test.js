import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const expectedComputerImages = [
  'pcgaming.png',
  'Captura de pantalla 2026-10-12 125445(2).png',
  'https://www.csl-computer.com/es/media/catalog/product/cache/7/image/3000x3000/9df78eab33525d08d6e5fb8d27136e95/8/9/89244---bb-mini-pc-csl-venombox-hs_01_3000px_18.webp',
  '360_F_81271153_z1nD0djpmAU1YjDurPSaUnrJZ8hV1O1r.jpg',
  'https://cerebriti.b-cdn.net/uploads/FB_4ca608cd357efac71373eb399589f0f5.jpg',
  'https://img.directindustry.es/images_di/photo-m2/240602-16959869.jpg',
  'images(1).jpg',
  'https://cerebriti.b-cdn.net/uploads/FB_b9064dd5b1ed42a941322e0b9a9e3af4.jpg',
  'Captura de pantalla 2026-10-11 101249.png'
];

const expectedComponentImages = {
  CPU: 'https://www.gsmpro.cl/cdn/shop/files/procesador-amd-ryzen-7-7800x3d-7.webp?v=1775234196&width=1200',
  GPU: 'https://multimedia.bbycastatic.ca/multimedia/products/1500x1500/191/19193/19193219_2.jpg',
  Motherboard: 'https://asset-us-store.msi.com/image/cache/catalog/Pd_page/Motherboard/B650TOMAHAWKWIFI/B650TOMAHAWKWIFI-1-1024x1024.png',
  RAM: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/693901/large/Kit-De-Mem-ria-Para-PC-Corsair-Vengeance-32gb-6000mhz-2x16gb-Ddr5-Cmk32gx5m2e6000c36-5823-_1762281527.webp',
  Storage: 'https://cdn.atacadoconnect.com/produtos/1245967/ssd-m-2-samsung-990-evo-plus-1tb-nvme-pcie-gen-4-mz-v9s1t0b-am-1245967-96105.webp',
  PSU: 'https://assets.corsair.com/image/upload/c_pad%2Cq_85%2Ch_1100%2Cw_1100%2Cf_auto/products/Power-Supply-Units/CP-9020195-WW/Gallery/RM750_01.webp',
  Case: 'https://lcdi.fr/cdn/shop/files/corsair-4000d-airflow-noir.jpg?v=1745245056',
  'Cooling System': 'https://fly.bg/uploads/products/as/deepcool_ak400_cpu_air_cooler_1x120mm_pwm_fan_tdp_gwx9n.jpg'
};

function storedImageName(filename) {
  const extension = path.extname(filename).toLowerCase();
  const normalizedExtension = extension === '.jpeg' ? '.jpg' : extension;
  const name = createHash('sha256').update(filename).digest('hex').slice(0, 32);
  return `${name}${normalizedExtension}`;
}

test('seeds nine example computers and their components from the data directory', async () => {
  const uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'webapp09-seed-'));
  const previousUploadDirectory = process.env.PC_PARTS_UPLOAD_DIR;
  process.env.PC_PARTS_UPLOAD_DIR = uploadDirectory;

  try {
    const { seedCatalogIfEmpty } = await import('../src/database/seed-if-empty.js');
    const computers = [];
    const components = [];
    const collections = {
      computers: {
        countDocuments: async () => 0,
        insertMany: async documents => {
          computers.push(...documents);
          return { insertedIds: documents.map((_, index) => `computer-${index}`) };
        }
      },
      components: {
        countDocuments: async () => 0,
        insertMany: async documents => {
          components.push(...documents);
          return { insertedIds: documents.map((_, index) => `component-${index}`) };
        }
      }
    };

    const result = await seedCatalogIfEmpty(collections);

    assert.deepEqual(result, { inserted: true, computerCount: 9, componentCount: 18 });
    assert.equal(computers.length, 9);
    assert.equal(components.length, 18);
    assert.ok(computers.every(computer => computer.image));
    assert.ok(components.every(component => component.image && component.computerId));
    assert.deepEqual(computers.map(computer => computer.image), expectedComputerImages.map(image =>
      image.startsWith('https://') ? image : storedImageName(image)
    ));
    assert.ok(components.every(component => component.image === expectedComponentImages[component.type]));
    await Promise.all(expectedComputerImages
      .filter(image => !image.startsWith('https://'))
      .map(image => fs.access(path.join(uploadDirectory, storedImageName(image)))));
  } finally {
    if (previousUploadDirectory === undefined) delete process.env.PC_PARTS_UPLOAD_DIR;
    else process.env.PC_PARTS_UPLOAD_DIR = previousUploadDirectory;
    await fs.rm(uploadDirectory, { recursive: true, force: true });
  }
});
