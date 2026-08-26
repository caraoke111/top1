import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const avatar = (seed) =>
  `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;

// amount = nivel fijo (centavos): 500,1000,2500,5000,10000,25000,50000,100000
const data = [
  { handle: "leomonteiro", name: "Leo Monteiro", country: "🇧🇷", category: "💻 Tecnologia", verified: true, bio: "IA e automação para negócios do dia a dia.", amount: 100000, links: [{ type: "site", url: "https://example.com" }], clicks: 269, reign: true },
  { handle: "duda.dubai", name: "Duda Ramos", country: "🇦🇪", category: "📈 Negócios", verified: true, bio: "Imóveis de luxo em Dubai.", amount: 50000, links: [{ type: "site", url: "https://example.com" }], clicks: 99 },
  { handle: "malvaai", name: "Malva AI", country: "🇺🇸", category: "💻 Tecnologia", verified: true, bio: "As melhores ferramentas de IA, grátis.", amount: 25000, links: [{ type: "youtube", url: "https://youtube.com" }], clicks: 53 },
  { handle: "prvietnam", name: "PR parece vietnã", country: "🇧🇷", category: "😂 Humor", verified: true, bio: "As coisas já não são como antes.", amount: 25000, links: [{ type: "instagram", url: "https://instagram.com" }], clicks: 79 },
  { handle: "viktorracks", name: "Viktor Racks", country: "🇧🇷", category: "💻 Tecnologia", verified: true, bio: "Tecnologia sem enrolação.", amount: 10000, links: [{ type: "instagram", url: "https://instagram.com" }], clicks: 146 },
  { handle: "publicafalando", name: "Publica Falando", country: "🇵🇹", category: "🎵 Música", verified: true, bio: "Fala 2 minutos e publica em 4 redes.", amount: 10000, links: [{ type: "site", url: "https://example.com" }], clicks: 89 },
  { handle: "fasthorizons", name: "Fast Horizons", country: "🇧🇷", category: "💻 Tecnologia", verified: true, bio: "Startups e produto.", amount: 5000, links: [], clicks: 38 },
  { handle: "flakeagency", name: "Flake", country: "🇧🇷", category: "💰 Finanças", verified: true, bio: "Agência de influencers financeiros.", amount: 5000, links: [], clicks: 37 },
  { handle: "alphasniper", name: "Alpha Sniper", country: "🌐", category: "🎮 Games", verified: true, bio: "Highlights e tutoriais.", amount: 2500, links: [{ type: "youtube", url: "https://youtube.com" }], clicks: 269 },
  { handle: "subvenciona", name: "Subvenciona.app", country: "🇧🇷", category: "💰 Finanças", verified: true, bio: "Negócios e finanças.", amount: 2500, links: [], clicks: 248 },
  { handle: "ourhomeflow", name: "OurHomeFlow", country: "🇧🇷", category: "📈 Negócios", verified: true, bio: "Gerencie sua casa!", amount: 1000, links: [], clicks: 24 },
  { handle: "guimellado", name: "Gui Mellado", country: "🇧🇷", category: "📈 Negócios", verified: true, bio: "Negócios e finanças.", amount: 500, links: [], clicks: 100 },
];

async function main() {
  await prisma.clickEvent.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.presence.deleteMany();
  await prisma.creator.deleteMany();

  for (const c of data) {
    await prisma.creator.create({
      data: {
        handle: c.handle,
        name: c.name,
        bio: c.bio,
        avatarUrl: avatar(c.handle),
        country: c.country,
        category: c.category,
        verified: c.verified,
        links: JSON.stringify(c.links),
        currentAmountCents: c.amount,
        clicks: c.clicks,
        reignStartedAt: c.reign ? new Date(Date.now() - 99 * 3600 * 1000) : null,
        longestReignSecs: c.reign ? 99 * 3600 : 0,
      },
    });
  }

  // Clics recientes (para "mais clicado 24h"): concentra no líder
  const leader = await prisma.creator.findUnique({ where: { handle: "leomonteiro" } });
  if (leader) {
    const events = Array.from({ length: 79 }, () => ({
      creatorId: leader.id,
      createdAt: new Date(Date.now() - Math.random() * 20 * 3600 * 1000),
    }));
    await prisma.clickEvent.createMany({ data: events });
  }

  console.log(`Seed OK: ${data.length} criadores.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
