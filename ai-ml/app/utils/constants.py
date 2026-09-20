ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active"]
FOOD_PREFERENCES = ["vegetarian", "non-vegetarian", "vegan"]
GOALS = [
    "weight_loss", "weight_gain", "muscle_building", "maintain_weight",
    "improve_fitness", "improve_sleep", "general_wellness",
]
GENDERS = ["male", "female", "other"]
ACTIVITY_SCORES = {"sedentary": 1, "light": 2, "moderate": 3, "active": 4}
SLEEP_TARGET_HOURS = 7.0
STEPS_TARGET = 8000
EXERCISE_MINUTES_TARGET = 30
ML_CATEGORIES = [
    "weight_management", "fitness_improvement", "hydration_focus",
    "sleep_focus", "activity_focus", "balanced_wellness",
]
CATEGORY_LABELS = {c: c.replace("_", " ").title() for c in ML_CATEGORIES}
