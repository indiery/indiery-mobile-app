import { connectMongo } from '../db/mongoose';
import { seedCoreData } from '../services/seed.service';

async function main() {
  await connectMongo();
  const result = await seedCoreData();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
