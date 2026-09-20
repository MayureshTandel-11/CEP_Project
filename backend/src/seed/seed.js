/**
 * Database seeding: node src/seed/seed.js [--demo-user] [--reset]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const { Activity, Food, User, UserLog, UserProfile } = require('../models');
const { hashPassword } = require('../utils/security');
const { FOODS, ACTIVITIES } = require('./seedData');

const DEMO_EMAIL = 'demo@wellness.local';
const DEMO_PASSWORD = 'Demo1234';

function parseAllergens(tags) {
  return String(tags || '').split(',').map((t) => t.trim()).filter(Boolean);
}

async function seedFoods() {
  if (await Food.countDocuments()) {
    console.log(`Food collection already populated (${await Food.countDocuments()} rows) - skipping`);
    return 0;
  }
  const docs = FOODS.map(([
    name, category, mealType, serving, kcal, protein, carbs, fat, fiber,
    vegetarian, vegan, allergens, description,
  ]) => ({
    foodName: name,
    category,
    mealType,
    servingSize: serving,
    calories: kcal,
    protein,
    carbohydrates: carbs,
    fat,
    fiber,
    vegetarian,
    vegan,
    allergenTags: parseAllergens(allergens),
    description,
  }));
  await Food.insertMany(docs);
  console.log(`Seeded ${docs.length} foods`);
  return docs.length;
}

async function seedActivities() {
  if (await Activity.countDocuments()) {
    console.log(`Activity collection already populated (${await Activity.countDocuments()} rows) - skipping`);
    return 0;
  }
  const docs = ACTIVITIES.map(([
    name, category, duration, calories, difficulty, intensity, description,
  ]) => ({
    activityName: name,
    category,
    duration,
    caloriesBurned: calories,
    difficulty,
    intensity,
    description,
  }));
  await Activity.insertMany(docs);
  console.log(`Seeded ${docs.length} activities`);
  return docs.length;
}

function isoDaysAgo(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

async function seedDemoUser(days = 30) {
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (user) {
    console.log(`Demo user already exists (${user._id})`);
    return user;
  }
  user = await User.create({
    name: 'Demo User',
    email: DEMO_EMAIL,
    passwordHash: await hashPassword(DEMO_PASSWORD),
  });
  await UserProfile.create({
    userId: user._id,
    age: 24,
    gender: 'male',
    heightCm: 175,
    weightKg: 78,
    activityLevel: 'light',
    foodPreference: 'vegetarian',
    allergies: ['peanut'],
    sleepHours: 6.5,
    goal: 'weight_loss',
    workType: 'desk',
    sittingHours: 9,
    waterIntakeMl: 1800,
    stressLevel: 3,
    foodDislikes: [],
    mealFrequency: 4,
    budget: 'medium',
  });

  let seed = 7;
  function rng() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }
  function randInt(min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }
  const exerciseChoices = [0, 0, 15, 20, 30, 35, 45];
  let weight = 79.0;
  const logs = [];
  for (let offset = days; offset > 0; offset -= 1) {
    weight -= (rng() * 0.17) - 0.05;
    logs.push({
      userId: user._id,
      logDate: isoDaysAgo(offset),
      weight: Math.round(weight * 10) / 10,
      water: randInt(1400, 2900),
      sleep: Math.round((5.2 + rng() * 2.8) * 10) / 10,
      steps: randInt(3200, 11500),
      exerciseMinutes: exerciseChoices[randInt(0, exerciseChoices.length - 1)],
      calories: randInt(1700, 2500),
      mood: randInt(2, 5),
      stress: randInt(1, 5),
    });
  }
  await UserLog.insertMany(logs);
  console.log(`Seeded demo user ${DEMO_EMAIL} with ${days} days of logs`);
  return user;
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const demo = args.includes('--demo-user');
  await connectDb();
  if (reset) {
    console.warn('Dropping all collections');
    await mongoose.connection.dropDatabase();
  }
  await seedFoods();
  await seedActivities();
  if (demo) {
    await seedDemoUser();
    console.log(`\nDemo login -> ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }
  console.log('Seeding complete.');
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedFoods, seedActivities, seedDemoUser, DEMO_EMAIL, DEMO_PASSWORD };
