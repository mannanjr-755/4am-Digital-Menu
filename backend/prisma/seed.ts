import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BRAND_SLUG = "4am";
const PIZZA_SLUG = "pizza-palace";
const BRAND_TABLES = 12;

async function main() {
  console.log("Seeding 4AM demo data (insert-only, safe for shared databases)...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const brand = await prisma.restaurant.upsert({
    where: { slug: BRAND_SLUG },
    update: {},
    create: {
      name: "4AM",
      slug: BRAND_SLUG,
      logo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop",
      coverImage:
        "https://images.unsplash.com/photo-1558030006-450675393462?w=1400&h=700&fit=crop",
      description: "Delicious food, great mood! Explore our chef's special dishes made just for you.",
      phone: "+92 300 1234567",
      whatsapp: "+923001234567",
      address: "12 Gourmet Avenue, City Center",
      googleMapsUrl: "https://maps.google.com",
      openingHours: JSON.stringify({
        mon: "11:00–23:00",
        tue: "11:00–23:00",
        wed: "11:00–23:00",
        thu: "11:00–23:00",
        fri: "11:00–00:00",
        sat: "11:00–00:00",
        sun: "12:00–22:00",
      }),
      socialLinks: JSON.stringify({
        instagram: "https://instagram.com",
        facebook: "https://facebook.com",
      }),
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@4am.com" },
    update: { restaurantId: brand.id, active: true },
    create: {
      email: "admin@4am.com",
      passwordHash,
      name: "Admin",
      restaurantId: brand.id,
    },
  });

  // 12 tables (demo highlights table 12)
  for (let n = 1; n <= BRAND_TABLES; n++) {
    const existing = await prisma.table.findFirst({
      where: { restaurantId: brand.id, tableNumber: n },
      select: { id: true },
    });
    if (existing) {
      await prisma.table.update({
        where: { id: existing.id },
        data: { active: true },
      });
      continue;
    }
    await prisma.table.create({
      data: {
        restaurantId: brand.id,
        tableNumber: n,
        uniqueCode: `4am-t${n}-${Math.random().toString(36).slice(2, 8)}`,
        active: true,
      },
    });
  }

  const categories = [
    {
      name: "Starters",
      items: [
        {
          name: "Garlic Bread",
          description: "Toasted ciabatta with garlic butter and herbs",
          price: 450,
          imageUrl:
            "https://images.unsplash.com/photo-1573140401552-3fab57d69659?w=600&h=400&fit=crop",
          featured: true,
        },
        {
          name: "Bruschetta",
          description: "Tomato, basil, and olive oil on grilled bread",
          price: 550,
          imageUrl:
            "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=400&fit=crop",
        },
      ],
    },
    {
      name: "Pizza",
      items: [
        {
          name: "Margherita Pizza",
          description: "Tomato sauce, mozzarella, fresh basil",
          price: 1150,
          imageUrl:
            "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop",
          popular: true,
          options: JSON.stringify({
            variants: [
              { name: "Small", priceAdj: 0 },
              { name: "Medium", priceAdj: 300 },
              { name: "Large", priceAdj: 600 },
            ],
            addOns: [
              { name: "Extra Cheese", price: 150 },
              { name: "Olives", price: 100 },
              { name: "Jalapenos", price: 100 },
            ],
          }),
        },
        {
          name: "Chicken Pizza",
          description: "Grilled chicken, peppers, mozzarella",
          price: 1450,
          imageUrl:
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
          popular: true,
          options: JSON.stringify({
            variants: [
              { name: "Small", priceAdj: 0 },
              { name: "Medium", priceAdj: 300 },
              { name: "Large", priceAdj: 600 },
            ],
            addOns: [
              { name: "Extra Cheese", price: 150 },
              { name: "Olives", price: 100 },
            ],
          }),
        },
      ],
    },
    {
      name: "Burgers",
      items: [
        {
          name: "Classic Burger",
          description: "Beef patty, lettuce, tomato, house sauce",
          price: 950,
          imageUrl:
            "https://images.unsplash.com/photo-1568901346375-23c9450cfc0b?w=600&h=400&fit=crop",
          popular: true,
          options: JSON.stringify({
            addOns: [
              { name: "Extra Cheese", price: 100 },
              { name: "Extra Patty", price: 250 },
              { name: "Extra Sauce", price: 50 },
            ],
          }),
        },
        {
          name: "Cheese Burger",
          description: "Double cheese, pickles, special sauce",
          price: 1050,
          imageUrl:
            "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=400&fit=crop",
          featured: true,
          options: JSON.stringify({
            addOns: [
              { name: "Extra Cheese", price: 100 },
              { name: "Extra Patty", price: 250 },
              { name: "Bacon", price: 150 },
            ],
          }),
        },
      ],
    },
    {
      name: "Pasta",
      items: [
        {
          name: "Creamy Alfredo Pasta",
          description: "Fettuccine in rich parmesan cream sauce",
          price: 1250,
          imageUrl:
            "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&h=400&fit=crop",
          todaySpecial: true,
          options: JSON.stringify({
            addOns: [
              { name: "Grilled Chicken", price: 200 },
              { name: "Extra Parmesan", price: 100 },
            ],
          }),
        },
        {
          name: "Pasta Alfredo",
          description: "Classic alfredo with herbs",
          price: 1190,
          imageUrl:
            "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=400&fit=crop",
        },
      ],
    },
    {
      name: "Main Course",
      items: [
        {
          name: "Grilled Steak",
          description: "Chef's special grilled steak with herbs",
          price: 2450,
          imageUrl:
            "https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=400&fit=crop",
          featured: true,
          options: JSON.stringify({
            variants: [
              { name: "Regular", priceAdj: 0 },
              { name: "Large", priceAdj: 800 },
            ],
            addOns: [
              { name: "Mushroom Sauce", price: 150 },
              { name: "Garlic Butter", price: 100 },
            ],
          }),
        },
        {
          name: "Chicken Parmigiana",
          description: "Breaded chicken, tomato, mozzarella",
          price: 1650,
          imageUrl:
            "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=400&fit=crop",
        },
      ],
    },
    {
      name: "Drinks",
      items: [
        {
          name: "Coke",
          description: "Chilled soft drink",
          price: 180,
          imageUrl:
            "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=400&fit=crop",
        },
        {
          name: "Fresh Lemonade",
          description: "House lemonade with mint",
          price: 250,
          imageUrl:
            "https://images.unsplash.com/photo-1523677011783-c91d1bbe2fdc?w=600&h=400&fit=crop",
        },
      ],
    },
    {
      name: "Desserts",
      items: [
        {
          name: "Chocolate Lava Cake",
          description: "Warm chocolate cake with molten center",
          price: 650,
          imageUrl:
            "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&fit=crop",
          todaySpecial: true,
        },
        {
          name: "Tiramisu",
          description: "Classic Italian dessert",
          price: 750,
          imageUrl:
            "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop",
          popular: true,
        },
      ],
    },
  ];

  const existingCategories = await prisma.menuCategory.count({
    where: { restaurantId: brand.id },
  });

  if (existingCategories === 0) {
    let sort = 0;
    for (const cat of categories) {
      const category = await prisma.menuCategory.create({
        data: {
          restaurantId: brand.id,
          name: cat.name,
          sortOrder: sort++,
        },
      });
      for (const item of cat.items) {
        await prisma.menuItem.create({
          data: {
            restaurantId: brand.id,
            categoryId: category.id,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            available: true,
            featured: "featured" in item ? (item as Record<string, unknown>).featured as boolean : false,
            popular: "popular" in item ? (item as Record<string, unknown>).popular as boolean : false,
            todaySpecial: "todaySpecial" in item ? (item as Record<string, unknown>).todaySpecial as boolean : false,
            options: "options" in item ? (item as Record<string, unknown>).options as string : null,
          },
        });
      }
    }
    console.log(`Inserted ${categories.length} menu categories for 4AM.`);
  } else {
    console.log(`4AM already has ${existingCategories} menu categories — left untouched.`);
  }

  // Keep a second restaurant for isolation testing
  const pizza = await prisma.restaurant.upsert({
    where: { slug: PIZZA_SLUG },
    update: {},
    create: {
      name: "Pizza Palace",
      slug: PIZZA_SLUG,
      description: "Wood-fired pizzas",
      phone: "+92 300 7654321",
      logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop",
      coverImage:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=600&fit=crop",
    },
  });
  await prisma.user.upsert({
    where: { email: "staff@pizzapalace.com" },
    update: { restaurantId: pizza.id, active: true },
    create: {
      email: "staff@pizzapalace.com",
      passwordHash,
      name: "Pizza Admin",
      restaurantId: pizza.id,
    },
  });
  const pizzaTable = await prisma.table.findFirst({
    where: { restaurantId: pizza.id, tableNumber: 1 },
    select: { id: true },
  });
  if (!pizzaTable) {
    await prisma.table.create({
      data: {
        restaurantId: pizza.id,
        tableNumber: 1,
        uniqueCode: "pizza-palace-t1-demo",
        active: true,
      },
    });
  }

  console.log("Done!");
  console.log("Customer menu: /r/4am/t/12");
  console.log("Admin login: admin@4am.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
