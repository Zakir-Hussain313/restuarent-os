export type MenuCategory = {
  id: string;
  label: string;
  emoji: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  emoji: string;
  tag?: string | null;
  prepTime: string;
  isSpicy?: boolean;
  isVeg?: boolean;
};

export const MENU_CATEGORIES: MenuCategory[] = [
  { id: "all",     label: "All Items",  emoji: "🍽️" },
  { id: "karahi",  label: "Karahi",     emoji: "🍛" },
  { id: "biryani", label: "Biryani",    emoji: "🍚" },
  { id: "grill",   label: "Grill",      emoji: "🔥" },
  { id: "burgers", label: "Burgers",    emoji: "🍔" },
  { id: "breads",  label: "Breads",     emoji: "🫓" },
  { id: "drinks",  label: "Drinks",     emoji: "🥤" },
  { id: "desserts",label: "Desserts",   emoji: "🍮" },
];

export const MENU_ITEMS: MenuItem[] = [
  // Karahi
  { id: "k1", name: "Chicken Karahi",       description: "Tender chicken slow-cooked with tomatoes, green chilies, and aromatic spices in a traditional wok.",      price: 1350, categoryId: "karahi",  emoji: "🍛", tag: "Bestseller",  prepTime: "25 min", isSpicy: true  },
  { id: "k2", name: "Mutton Karahi",         description: "Slow-cooked mutton with a rich, spiced tomato gravy. Best enjoyed with fresh naan.",                        price: 2200, categoryId: "karahi",  emoji: "🍲", tag: null,           prepTime: "35 min", isSpicy: true  },
  { id: "k3", name: "Kata Kat",              description: "Mixed offal cooked with spices on a tawa — a Karachi street food classic.",                                  price: 1100, categoryId: "karahi",  emoji: "🥘", tag: "Popular",      prepTime: "20 min", isSpicy: true  },
  // Biryani
  { id: "b1", name: "Mutton Biryani",        description: "Fragrant basmati layered with slow-cooked mutton, saffron, caramelised onions, and whole spices.",          price: 1800, categoryId: "biryani", emoji: "🍚", tag: "Chef's Pick",  prepTime: "35 min"  },
  { id: "b2", name: "Chicken Biryani",       description: "Juicy chicken pieces buried in perfectly spiced biryani rice. A crowd pleaser.",                             price: 1400, categoryId: "biryani", emoji: "🍚", tag: "Bestseller",   prepTime: "30 min"  },
  { id: "b3", name: "Prawn Biryani",         description: "Plump prawns cooked with coastal spices, layered into aromatic rice.",                                       price: 2000, categoryId: "biryani", emoji: "🦐", tag: "New",          prepTime: "30 min"  },
  // Grill
  { id: "g1", name: "Chicken Tikka",         description: "Marinated chicken chargrilled over coal with a smoky masala rub.",                                           price: 1200, categoryId: "grill",   emoji: "🔥", tag: "Bestseller",  prepTime: "20 min", isSpicy: true  },
  { id: "g2", name: "Seekh Kebab Platter",   description: "Juicy minced beef kebabs chargrilled on skewers, served with mint raita and naan.",                         price: 1100, categoryId: "grill",   emoji: "🍢", tag: "Popular",     prepTime: "20 min"  },
  { id: "g3", name: "Malai Boti",            description: "Cream-marinated chicken pieces grilled to tender perfection — mild and rich.",                               price: 1250, categoryId: "grill",   emoji: "🍗", tag: null,          prepTime: "20 min"  },
  { id: "g4", name: "Mix Grill Platter",     description: "A generous spread of tikka, kebab, and boti — perfect for sharing.",                                        price: 2800, categoryId: "grill",   emoji: "🪵", tag: "Popular",     prepTime: "30 min"  },
  // Burgers
  { id: "bu1", name: "Zaiqa Special Burger", description: "Double smash patty, house-made sauce, pickled onions, melted cheddar in a toasted brioche.",                price: 950,  categoryId: "burgers", emoji: "🍔", tag: "New",         prepTime: "15 min"  },
  { id: "bu2", name: "Crispy Chicken Burger",description: "Southern-fried chicken fillet, coleslaw, and chipotle mayo.",                                               price: 850,  categoryId: "burgers", emoji: "🍔", tag: null,          prepTime: "15 min"  },
  { id: "bu3", name: "BBQ Beef Burger",      description: "Thick beef patty, smoked BBQ sauce, bacon jam, crispy onions.",                                             price: 1050, categoryId: "burgers", emoji: "🍔", tag: "Popular",     prepTime: "15 min"  },
  // Breads
  { id: "br1", name: "Garlic Naan",          description: "Buttery naan brushed with garlic butter and fresh coriander.",                                              price: 180,  categoryId: "breads",  emoji: "🫓", tag: null,          prepTime: "8 min",  isVeg: true },
  { id: "br2", name: "Peshwari Naan",        description: "Sweet flatbread filled with coconut, almonds, and sultanas.",                                               price: 280,  categoryId: "breads",  emoji: "🫓", tag: null,          prepTime: "10 min", isVeg: true },
  { id: "br3", name: "Tandoori Roti",        description: "Whole-wheat flatbread baked fresh in the tandoor.",                                                         price: 80,   categoryId: "breads",  emoji: "🫓", tag: null,          prepTime: "5 min",  isVeg: true },
  // Drinks
  { id: "d1", name: "Mango Lassi",           description: "Thick yogurt blended with Sindhri mangoes and a hint of cardamom.",                                        price: 350,  categoryId: "drinks",  emoji: "🥭", tag: "Seasonal",    prepTime: "5 min",  isVeg: true },
  { id: "d2", name: "Rooh Afza Sharbat",     description: "Classic rose and hibiscus drink, chilled and refreshing.",                                                  price: 220,  categoryId: "drinks",  emoji: "🌹", tag: null,          prepTime: "3 min",  isVeg: true },
  { id: "d3", name: "Fresh Lime Soda",       description: "Freshly squeezed lime with sparkling soda and a salted rim.",                                               price: 250,  categoryId: "drinks",  emoji: "🥤", tag: null,          prepTime: "3 min",  isVeg: true },
  // Desserts
  { id: "de1", name: "Gulab Jamun",          description: "Soft milk-solid dumplings soaked in rose-cardamom syrup, served warm.",                                    price: 320,  categoryId: "desserts", emoji: "🍮", tag: null,          prepTime: "5 min",  isVeg: true },
  { id: "de2", name: "Kheer",                description: "Slow-cooked rice pudding with pistachios, almonds, and rosewater.",                                        price: 350,  categoryId: "desserts", emoji: "🍚", tag: "Popular",     prepTime: "5 min",  isVeg: true },
];