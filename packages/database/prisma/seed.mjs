import { config } from "dotenv";
import { getPrismaClient, closeDatabaseConnection } from "../dist/index.js";
import {
  assertDevelopmentEnvironment,
  seedDatabase,
} from "./seed/seed-database.mjs";
import { seedPassword } from "./seed/seed-data.mjs";

config({ path: new URL("../../../.env", import.meta.url), quiet: true });
try {
  assertDevelopmentEnvironment({
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
  });
  const result = await seedDatabase(getPrismaClient());
  console.log(
    `Seed concluído: ${result.youths} jovens, ${result.companies} empresas e ${result.jobs} vagas disponíveis.`,
  );
  console.log(
    "ADMIN existente preservado. Registros já existentes não são alterados.",
  );
  console.log(
    "Contas: seed.jovem.1@example.com até seed.jovem.15@example.com; seed.empresa.1@example.com até seed.empresa.5@example.com.",
  );
  console.log(`Senha inicial das contas do seed: ${seedPassword}`);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Falha ao popular o banco.",
  );
  process.exitCode = 1;
} finally {
  await closeDatabaseConnection();
}
