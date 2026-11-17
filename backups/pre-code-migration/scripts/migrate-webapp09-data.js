// One-time, insert-only migration of the static PC Parts Catalog data.
// Safe to rerun: migrationKey is unique and existing documents are never updated.

const fs = require('node:fs');
const path = require('node:path');
const { MongoClient, BSON } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/';
const DATABASE_NAME = 'pc_parts_catalog';
const BACKUP_PATH = path.join(__dirname, '..', 'backups', 'pc_parts_catalog-before-webapp09-migration.ejson');

const computers = [
  {
    migrationKey: 'webapp09:computer:gaming-pc',
    name: 'Gaming PC',
    brand: 'Custom Build',
    type: 'High-End Computer',
    description: 'High-performance gaming computer.',
    price: 2000.00,
    releaseDate: '2026-09-01',
    image: 'images/pcgaming.png',
    used: false,
    detailPage: {
      description: 'High-performance desktop computer designed for gaming.',
      price: 1899.99,
      image: 'images/pcgaming600x400.png'
    }
  },
  {
    migrationKey: 'webapp09:computer:office-pc',
    name: 'Office PC',
    description: 'Reliable computer for office tasks.',
    price: 150.00,
    image: 'images/Captura de pantalla 2026-10-12 125445(2).png'
  },
  {
    migrationKey: 'webapp09:computer:creator-pc',
    name: 'Creator PC',
    description: 'Oriented towards content creation.',
    price: 1599.99,
    image: 'https://www.csl-computer.com/es/media/catalog/product/cache/7/image/3000x3000/9df78eab33525d08d6e5fb8d27136e95/8/9/89244---bb-mini-pc-csl-venombox-hs_01_3000px_18.webp'
  },
  {
    migrationKey: 'webapp09:computer:budget-pc',
    name: 'Budget PC',
    description: 'Cheaper option for basic tasks.',
    price: 29.99,
    image: 'images/360_F_81271153_z1nD0djpmAU1YjDurPSaUnrJZ8hV1O1r.jpg'
  },
  {
    migrationKey: 'webapp09:computer:workstation-pc',
    name: 'Workstation PC',
    description: 'High-performance machine with advanced features.',
    price: 199.99,
    image: 'https://cerebriti.b-cdn.net/uploads/FB_4ca608cd357efac71373eb399589f0f5.jpg'
  },
  {
    migrationKey: 'webapp09:computer:mini-pc',
    name: 'Mini PC',
    description: 'Compact for travel and space-saving.',
    price: 699.99,
    image: 'https://img.directindustry.es/images_di/photo-m2/240602-16959869.jpg'
  },
  {
    migrationKey: 'webapp09:computer:high-end-pc',
    name: 'High-End PC',
    description: 'The most powerful option in the market.',
    price: 2499.99,
    image: 'images/images(1).jpg'
  },
  {
    migrationKey: 'webapp09:computer:all-in-one-pc',
    name: 'All-in-One PC',
    description: 'Integrated design for a clean workspace.',
    price: 499.99,
    image: 'https://cerebriti.b-cdn.net/uploads/FB_b9064dd5b1ed42a941322e0b9a9e3af4.jpg'
  },
  {
    migrationKey: 'webapp09:computer:custom-pc',
    name: 'Custom PC',
    description: 'Tailored to your specific needs and preferences.',
    price: 1299.99,
    image: 'images/Captura de pantalla 2026-10-11 101249.png'
  }
];

const componentSources = [
  {
    key: 'amd-ryzen-7-7800x3d', name: 'AMD Ryzen 7 7800X3D', type: 'CPU',
    image: 'https://www.gsmpro.cl/cdn/shop/files/procesador-amd-ryzen-7-7800x3d-7.webp?v=1775234196&width=1200'
  },
  {
    key: 'geforce-rtx-5070', name: 'GeForce RTX 5070', type: 'GPU',
    image: 'https://multimedia.bbycastatic.ca/multimedia/products/1500x1500/191/19193/19193219_2.jpg'
  },
  {
    key: 'b650-gaming-plus-wifi', name: 'B650 Gaming Plus WiFi', type: 'Motherboard',
    image: 'https://asset-us-store.msi.com/image/cache/catalog/Pd_page/Motherboard/B650TOMAHAWKWIFI/B650TOMAHAWKWIFI-1-1024x1024.png'
  },
  {
    key: 'vengeance-32-gb-ddr5', name: 'Vengeance 32 GB DDR5', type: 'RAM',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/693901/large/Kit-De-Mem-ria-Para-PC-Corsair-Vengeance-32gb-6000mhz-2x16gb-Ddr5-Cmk32gx5m2e6000c36-5823-_1762281527.webp'
  },
  {
    key: '990-evo-1-tb', name: '990 EVO 1 TB', type: 'Storage',
    image: 'https://cdn.atacadoconnect.com/produtos/1245967/ssd-m-2-samsung-990-evo-plus-1tb-nvme-pcie-gen-4-mz-v9s1t0b-am-1245967-96105.webp'
  },
  {
    key: 'rm750e-750-w', name: 'RM750e 750 W', type: 'PSU',
    image: 'https://assets.corsair.com/image/upload/c_pad%2Cq_85%2Ch_1100%2Cw_1100%2Cf_auto/products/Power-Supply-Units/CP-9020195-WW/Gallery/RM750_01.webp'
  },
  {
    key: '4000d-airflow', name: '4000D Airflow', type: 'Case',
    image: 'https://lcdi.fr/cdn/shop/files/corsair-4000d-airflow-noir.jpg?v=1745245056'
  },
  {
    key: 'peerless-assassin-120-se', name: 'Peerless Assassin 120 SE', type: 'Cooling System',
    image: 'https://fly.bg/uploads/products/as/deepcool_ak400_cpu_air_cooler_1x120mm_pwm_fan_tdp_gwx9n.jpg'
  }
];

function sameValue(left, right) {
  return BSON.EJSON.stringify(left, { relaxed: false }) === BSON.EJSON.stringify(right, { relaxed: false });
}

function assertDocumentMatches(actual, expected, label) {
  if (!actual) throw new Error(`Missing document: ${label}`);
  const actualFields = Object.keys(actual).filter((key) => key !== '_id').sort();
  const expectedFields = Object.keys(expected).filter((key) => key !== '_id').sort();
  if (!sameValue(actualFields, expectedFields)) throw new Error(`Unexpected fields in ${label}`);
  for (const key of expectedFields) {
    if (!sameValue(actual[key], expected[key])) throw new Error(`Field ${key} differs in ${label}`);
  }
}

async function main() {
  if (!fs.existsSync(BACKUP_PATH)) throw new Error(`Required database backup is missing: ${BACKUP_PATH}`);
  const backup = BSON.EJSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  if (backup.database !== DATABASE_NAME) throw new Error('Backup database name does not match');

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const computerCollection = db.collection('computers');
    const componentCollection = db.collection('components');

    // Verify the original records still match the pre-migration snapshot exactly.
    for (const [collection, snapshot] of [
      [computerCollection, backup.collections.computers],
      [componentCollection, backup.collections.components]
    ]) {
      for (const original of snapshot) {
        const current = await collection.findOne({ _id: original._id });
        assertDocumentMatches(current, original, `${collection.collectionName}/${original._id}`);
      }
    }

    const existingComputers = await computerCollection.find({}).toArray();
    const existingComponents = await componentCollection.find({}).toArray();
    const snapshotComputerIds = new Set(backup.collections.computers.map((doc) => doc._id.toString()));
    const snapshotComponentIds = new Set(backup.collections.components.map((doc) => doc._id.toString()));

    // Refuse to proceed if another unrecognized record appeared since the snapshot.
    for (const doc of existingComputers) {
      if (!snapshotComputerIds.has(doc._id.toString()) && !String(doc.migrationKey || '').startsWith('webapp09:computer:')) {
        throw new Error(`Unrecognized computer appeared after backup: ${doc._id}`);
      }
    }
    for (const doc of existingComponents) {
      if (!snapshotComponentIds.has(doc._id.toString()) && !String(doc.migrationKey || '').startsWith('webapp09:component:')) {
        throw new Error(`Unrecognized component appeared after backup: ${doc._id}`);
      }
    }

    // Check every key and possible name collision before the first document write.
    for (const document of computers) {
      const existing = await computerCollection.findOne({ migrationKey: document.migrationKey });
      if (existing) {
        assertDocumentMatches(existing, document, document.migrationKey);
      } else {
        const collision = await computerCollection.findOne({ name: document.name });
        if (collision) throw new Error(`Name collision for ${document.name}; refusing to create a possible duplicate`);
      }
    }
    const existingGamingComputer = await computerCollection.findOne({ migrationKey: 'webapp09:computer:gaming-pc' });
    const existingComponentKeys = await componentCollection.find({ migrationKey: /^webapp09:component:/ }).toArray();
    if (existingComponentKeys.length && !existingGamingComputer) {
      throw new Error('Migrated components exist but the migrated Gaming PC does not');
    }
    for (const source of componentSources) {
      const migrationKey = `webapp09:component:${source.key}`;
      const existing = await componentCollection.findOne({ migrationKey });
      if (!existing) {
        const collision = await componentCollection.findOne({ name: source.name });
        if (collision) throw new Error(`Name collision for component ${source.name}; refusing to create a possible duplicate`);
      } else if (!existingGamingComputer) {
        throw new Error(`Component migration key exists without its Gaming PC: ${migrationKey}`);
      }
    }

    // Unique partial indexes make migration keys safe across repeated or concurrent runs.
    await computerCollection.createIndex(
      { migrationKey: 1 },
      { unique: true, partialFilterExpression: { migrationKey: { $type: 'string' } }, name: 'migrationKey_unique' }
    );
    await componentCollection.createIndex(
      { migrationKey: 1 },
      { unique: true, partialFilterExpression: { migrationKey: { $type: 'string' } }, name: 'migrationKey_unique' }
    );

    let gamingComputer = await computerCollection.findOne({ migrationKey: 'webapp09:computer:gaming-pc' });
    let insertedComputers = 0;
    for (const document of computers) {
      const existing = await computerCollection.findOne({ migrationKey: document.migrationKey });
      if (existing) {
        assertDocumentMatches(existing, document, document.migrationKey);
        if (document.migrationKey === 'webapp09:computer:gaming-pc') gamingComputer = existing;
        continue;
      }
      const collision = await computerCollection.findOne({ name: document.name });
      if (collision) throw new Error(`Name collision for ${document.name}; refusing to create a possible duplicate`);
      const result = await computerCollection.insertOne(document);
      insertedComputers += 1;
      if (document.migrationKey === 'webapp09:computer:gaming-pc') {
        gamingComputer = { ...document, _id: result.insertedId };
      }
    }

    if (!gamingComputer?._id) throw new Error('Gaming PC document was not found after insertion');
    const components = componentSources.map((source) => ({
      migrationKey: `webapp09:component:${source.key}`,
      name: source.name,
      type: source.type,
      image: source.image,
      computerId: gamingComputer._id
    }));

    let insertedComponents = 0;
    for (const document of components) {
      const existing = await componentCollection.findOne({ migrationKey: document.migrationKey });
      if (existing) {
        assertDocumentMatches(existing, document, document.migrationKey);
        continue;
      }
      const collision = await componentCollection.findOne({ name: document.name });
      if (collision) throw new Error(`Name collision for component ${document.name}; refusing to create a possible duplicate`);
      await componentCollection.insertOne(document);
      insertedComponents += 1;
    }

    const finalComputers = await computerCollection.find({}).toArray();
    const finalComponents = await componentCollection.find({}).toArray();
    const migratedComputers = await computerCollection.find({ migrationKey: /^webapp09:computer:/ }).toArray();
    const migratedComponents = await componentCollection.find({ migrationKey: /^webapp09:component:/ }).toArray();
    const associatedComponents = await componentCollection.find({ computerId: gamingComputer._id }).toArray();

    if (migratedComputers.length !== 9 || migratedComponents.length !== 8 || associatedComponents.length !== 8) {
      throw new Error('Post-migration verification failed: migrated document counts or component relation differ');
    }
    if (finalComputers.length !== 10 || finalComponents.length !== 9) {
      throw new Error(`Expected total counts 10 computers / 9 components, found ${finalComputers.length} / ${finalComponents.length}`);
    }

    for (const original of backup.collections.computers) {
      assertDocumentMatches(await computerCollection.findOne({ _id: original._id }), original, `original computer ${original._id}`);
    }
    for (const original of backup.collections.components) {
      assertDocumentMatches(await componentCollection.findOne({ _id: original._id }), original, `original component ${original._id}`);
    }

    console.log(JSON.stringify({
      database: DATABASE_NAME,
      insertedComputers,
      insertedComponents,
      totalComputers: finalComputers.length,
      totalComponents: finalComponents.length,
      gamingComputerId: gamingComputer._id.toString(),
      associatedComponentCount: associatedComponents.length,
      originalRecordsPreserved: true,
      migratedComputerKeys: migratedComputers.map((doc) => doc.migrationKey).sort(),
      migratedComponentKeys: migratedComponents.map((doc) => doc.migrationKey).sort()
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Migration stopped: ${error.message}`);
  process.exitCode = 1;
});
