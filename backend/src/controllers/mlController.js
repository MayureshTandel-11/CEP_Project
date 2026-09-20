const { MLTrainingRun } = require('../models');
const { FEATURE_DESCRIPTIONS } = require('../utils/constants');
const { getModelExplanation, getModelMetadata } = require('../services/mlService');
const { getProfile } = require('../services/profileService');
const { buildContext } = require('../services/recommendationService');
const { buildTrainingRowsFromFeedback } = require('../services/feedbackService');
const { retrain } = require('../services/mlService');
const { env } = require('../config/env');
const { success } = require('../utils/responses');
const { currentUserId } = require('../utils/security');
const { asyncHandler } = require('../middleware/validation');

const explanation = asyncHandler(async (req, res) => {
  const userId = currentUserId(req);
  const profile = await getProfile(userId);
  const ctx = await buildContext(userId, profile);
  const metadata = await getModelMetadata();
  const extra = await getModelExplanation();
  const merged = { ...extra, ...metadata };
  const importances = merged.feature_importances || merged.featureImportances || {};
  const ranked = Object.entries(importances).sort((a, b) => b[1] - a[1]);
  const runs = await MLTrainingRun.find().sort({ createdAt: -1 }).limit(5);

  return success(res, {
    model_available: ctx.ml.available || false,
    ml_enabled: env.mlEnabled,
    model_type: merged.model_type || merged.modelType || (ctx.ml.available ? ctx.ml.model_type : 'not loaded'),
    model_params: merged.model_params || merged.modelParams || {},
    trained_at: merged.trained_at || merged.trainedAt,
    data_source: merged.data_source || merged.dataSource,
    n_samples: merged.n_samples || merged.nSamples,
    metrics: merged.metrics || {},
    confusion_matrix: merged.confusion_matrix || merged.confusionMatrix,
    confusion_labels: merged.confusion_labels || merged.confusionLabels,
    classes: merged.classes || [],
    feature_importances: ranked.map(([name, value]) => ({
      feature: name,
      importance: value,
      description: FEATURE_DESCRIPTIONS[name] || '',
    })),
    your_features: ctx.features,
    feature_descriptions: FEATURE_DESCRIPTIONS,
    prediction: ctx.ml,
    training_runs: runs.map((r) => r.toPublic()),
  });
});

const retrainFromFeedback = asyncHandler(async (_req, res) => {
  const { rows, labels } = await buildTrainingRowsFromFeedback();
  const result = await retrain(rows, labels, { force: false });
  if (result && result.metrics) {
    await MLTrainingRun.create({
      modelType: result.model_type || result.modelType || 'RandomForestClassifier',
      nSamples: result.n_samples || result.nSamples || rows.length,
      accuracy: result.metrics.accuracy,
      precision: result.metrics.precision,
      recall: result.metrics.recall,
      f1: result.metrics.f1,
      promoted: Boolean(result.promoted),
      notes: `${rows.length} feedback-derived rows included`,
    });
  }
  return success(res, result, result.promoted ? 'Model retrained and promoted.' : 'Retraining completed.');
});

module.exports = { explanation, retrainFromFeedback };
