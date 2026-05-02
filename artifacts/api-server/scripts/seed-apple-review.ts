import { db } from "@workspace/db";
import { usersTable, barbeariasTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/auth.js";

const REVIEWER_EMAIL = "apple.review@glowupi.com";
const REVIEWER_SENHA = "AppleReview2026!";
const BARBEARIA_NOME = "Barbearia Demo - Apple Review";
const BARBEARIA_SLUG = "apple-review-demo";

async function main() {
  console.log("[seed-apple-review] Iniciando...");

  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, REVIEWER_EMAIL)).limit(1);

  if (!user) {
    console.log("[seed-apple-review] Criando usuário reviewer...");
    [user] = await db.insert(usersTable).values({
      nome: "Apple Reviewer",
      email: REVIEWER_EMAIL,
      senhaHash: hashPassword(REVIEWER_SENHA),
      role: "dono",
    }).returning();
  } else {
    console.log("[seed-apple-review] Atualizando senha do reviewer...");
    await db.update(usersTable)
      .set({ senhaHash: hashPassword(REVIEWER_SENHA) })
      .where(eq(usersTable.id, user.id));
  }

  let [barbearia] = await db.select().from(barbeariasTable).where(eq(barbeariasTable.donoId, user.id)).limit(1);

  if (!barbearia) {
    console.log("[seed-apple-review] Criando barbearia demo...");
    [barbearia] = await db.insert(barbeariasTable).values({
      donoId: user.id,
      nome: BARBEARIA_NOME,
      slug: BARBEARIA_SLUG,
      telefone: "+5511999990000",
      email: REVIEWER_EMAIL,
      cidade: "São Paulo",
      uf: "SP",
      planoNome: "Pro",
      planoStatus: "ativo",
      subscriptionStatus: "active",
      iapStatus: "active",
      onboardingStep: 99,
      tutorialCompleto: true,
    }).returning();
  } else {
    await db.update(barbeariasTable)
      .set({
        planoNome: "Pro",
        planoStatus: "ativo",
        subscriptionStatus: "active",
        iapStatus: "active",
        onboardingStep: 99,
        tutorialCompleto: true,
      })
      .where(eq(barbeariasTable.id, barbearia.id));
  }

  console.log("[seed-apple-review] Pronto.");
  console.log("  Email: " + REVIEWER_EMAIL);
  console.log("  Senha: " + REVIEWER_SENHA);
  console.log("  Barbearia ID: " + barbearia.id);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-apple-review] erro:", err);
  process.exit(1);
});
