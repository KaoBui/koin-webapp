import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Placeholder owner for the default categories. Replace the email (or remove
// this user) once real users sign in via Google.
const TEST_USER_EMAIL = "test@example.com";

const defaultCategories: { name: string; color: string; icon: string }[] = [
  { name: "Housing", color: "#6366f1", icon: "home" },
  { name: "Groceries", color: "#22c55e", icon: "shopping-cart" },
  { name: "Transport", color: "#0ea5e9", icon: "car" },
  { name: "Dining", color: "#f97316", icon: "utensils" },
  { name: "Entertainment", color: "#a855f7", icon: "film" },
  { name: "Health", color: "#ef4444", icon: "heart-pulse" },
  { name: "Savings", color: "#14b8a6", icon: "piggy-bank" },
  { name: "Income", color: "#84cc16", icon: "banknote" },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: TEST_USER_EMAIL },
    update: {},
    create: { email: TEST_USER_EMAIL, name: "Test User" },
  });

  for (const category of defaultCategories) {
    // Idempotent thanks to the @@unique([userId, name]) constraint on Category.
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: category.name } },
      update: { color: category.color, icon: category.icon, isDefault: true },
      create: { ...category, isDefault: true, userId: user.id },
    });
  }

  console.log(
    `Seeded ${defaultCategories.length} default categories for ${user.email}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
