jest.mock('../../src/models', () => ({
  MLTrainingRun: { create: jest.fn(async () => ({})), find: jest.fn() },
}));
jest.mock('../../src/services/profileService', () => ({ getProfile: jest.fn() }));
jest.mock('../../src/services/recommendationService', () => ({ buildContext: jest.fn() }));
jest.mock('../../src/services/feedbackService', () => ({
  buildTrainingRowsFromFeedback: jest.fn(async () => ({ rows: [], labels: [] })),
}));
jest.mock('../../src/services/mlService', () => ({
  getModelExplanation: jest.fn(),
  getModelMetadata: jest.fn(),
  retrain: jest.fn(),
}));

const { retrain } = require('../../src/services/mlService');
const { MLTrainingRun } = require('../../src/models');
const { retrainFromFeedback } = require('../../src/controllers/mlController');
const { ConflictError } = require('../../src/utils/errors');

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
const call = () => new Promise((resolve) => {
  const res = fakeRes();
  retrainFromFeedback({}, res, (err) => resolve({ err, res }));
  // asyncHandler resolves via res.json (success) or next(err) (failure)
  const origJson = res.json.bind(res);
  res.json = (body) => { origJson(body); resolve({ err: undefined, res }); return res; };
});

beforeEach(() => {
  retrain.mockReset();
  MLTrainingRun.create.mockClear();
});

describe('retrain lock', () => {
  test('a second request while one is running is rejected with 409', async () => {
    let finishFirst;
    retrain.mockImplementationOnce(() => new Promise((resolve) => {
      finishFirst = () => resolve({ metrics: { accuracy: 0.9 }, promoted: false, n_samples: 10 });
    }));

    const first = call();
    await new Promise((r) => setImmediate(r)); // let the first request reach retrain()
    const second = await call();

    expect(second.err).toBeInstanceOf(ConflictError);
    expect(second.err.statusCode).toBe(409);
    expect(second.err.errorCode).toBe('RETRAIN_IN_PROGRESS');
    expect(retrain).toHaveBeenCalledTimes(1);

    finishFirst();
    const firstResult = await first;
    expect(firstResult.err).toBeUndefined();
    expect(MLTrainingRun.create).toHaveBeenCalledTimes(1);
  });

  test('the lock is released after a successful run', async () => {
    retrain.mockResolvedValue({ metrics: { accuracy: 0.9 }, promoted: true, n_samples: 10 });
    expect((await call()).err).toBeUndefined();
    expect((await call()).err).toBeUndefined();
    expect(retrain).toHaveBeenCalledTimes(2);
  });

  test('the lock is released after a failed run', async () => {
    retrain.mockRejectedValueOnce(new Error('ml service exploded'));
    const failed = await call();
    expect(failed.err).toBeInstanceOf(Error);
    expect(failed.err).not.toBeInstanceOf(ConflictError);

    retrain.mockResolvedValue({ metrics: { accuracy: 0.9 }, promoted: false, n_samples: 10 });
    expect((await call()).err).toBeUndefined();
  });
});
