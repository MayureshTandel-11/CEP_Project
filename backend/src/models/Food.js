const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  foodName: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  mealType: { type: String, required: true, index: true },
  servingSize: { type: String, required: true, default: '1 serving' },
  calories: { type: Number, required: true },
  protein: { type: Number, required: true, default: 0 },
  carbohydrates: { type: Number, required: true, default: 0 },
  fat: { type: Number, required: true, default: 0 },
  fiber: { type: Number, required: true, default: 0 },
  vegetarian: { type: Boolean, required: true, default: true },
  vegan: { type: Boolean, required: true, default: false },
  allergenTags: { type: [String], default: [] },
  description: { type: String, default: '' },
}, { timestamps: true });

foodSchema.virtual('allergens').get(function allergens() {
  return this.allergenTags || [];
});

foodSchema.methods.toPublic = function toPublic() {
  return {
    food_id: String(this._id),
    food_name: this.foodName,
    category: this.category,
    meal_type: this.mealType,
    serving_size: this.servingSize,
    calories: this.calories,
    protein: this.protein,
    carbs: this.carbohydrates,
    fat: this.fat,
    fiber: this.fiber,
    vegetarian: this.vegetarian,
    vegan: this.vegan,
    allergen_tags: this.allergenTags || [],
    description: this.description,
  };
};

module.exports = mongoose.model('Food', foodSchema);
