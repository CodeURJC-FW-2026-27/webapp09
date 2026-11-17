import { ObjectId } from 'mongodb';
import { EMPTY_CATALOG_SEED_KEY } from '../config/catalog.js';

export async function seedCatalogIfEmpty(collections) {
  const [computerCount, componentCount] = await Promise.all([
    collections.computers.countDocuments(),
    collections.components.countDocuments()
  ]);
  if (computerCount !== 0 || componentCount !== 0) {
    return { inserted: false, reason: 'collections-not-empty' };
  }

  const computerId = new ObjectId();
  await collections.computers.insertOne({
    _id: computerId,
    seedKey: EMPTY_CATALOG_SEED_KEY,
    name: 'Example Computer',
    brand: 'Example Build',
    type: 'Modern Computer',
    description: 'A sample desktop computer for a new empty catalog.',
    price: 999,
    releaseDate: '2026-01-01',
    used: false,
    image: 'images/image-unavailable.svg'
  });
  await collections.components.insertOne({
    seedKey: `${EMPTY_CATALOG_SEED_KEY}:cpu`,
    computerId,
    name: 'Example CPU',
    brand: 'Example Hardware',
    type: 'CPU',
    description: 'A sample processor associated with the example computer.',
    price: 199,
    image: 'images/image-unavailable.svg'
  });
  return { inserted: true, computerId };
}
