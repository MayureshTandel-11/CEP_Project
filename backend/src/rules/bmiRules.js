function bmiRules(metrics) {
  const category = metrics.bmi_category;
  if (category === 'Underweight') {
    return [{
      code: 'BMI_UNDERWEIGHT', area: 'nutrition', priority: 1,
      message: 'Aim for calorie-dense but nutritious foods spread across more frequent meals.',
      reason: `Your BMI is ${metrics.bmi}, which falls in the Underweight band.`,
    }];
  }
  if (category === 'Overweight') {
    return [{
      code: 'BMI_OVERWEIGHT', area: 'nutrition', priority: 1,
      message: 'Favour high-fibre, high-protein foods that keep you full at a moderate calorie level.',
      reason: `Your BMI is ${metrics.bmi}, which falls in the Overweight band.`,
    }];
  }
  if (category === 'Obese') {
    return [{
      code: 'BMI_OBESE', area: 'nutrition', priority: 1,
      message: 'Focus on steady, sustainable habits: regular meals, more fibre, and daily movement. A qualified health professional can help you build a plan that suits you.',
      reason: `Your BMI is ${metrics.bmi}, which falls in the Obese band.`,
    }];
  }
  return [{
    code: 'BMI_NORMAL', area: 'nutrition', priority: 3,
    message: 'Keep your current balance of meals and activity.',
    reason: `Your BMI is ${metrics.bmi}, within the typical range.`,
  }];
}

module.exports = { bmiRules };
