const {test} = require('node:test');
const assert = require('node:assert/strict');
const {google} = require('googleapis');
const {fetchHealthData: fetchActualHealthData} = require('../lib/services/googleFit');

const now = new Date('2026-09-30T16:29:48.000Z');
const todayUtc = Date.parse('2026-09-30T00:00:00Z');
const dayStart = Date.parse('2026-09-30T04:00:00Z');
const recordedThrough = Date.parse('2026-09-30T13:59:44.255Z');
const fetchHealthData = (tokens, goals, zone, at = now) =>
  fetchActualHealthData(tokens, goals, zone, at);

function nanos(milliseconds) { return `${milliseconds}000000`; }

// Live response values and timing, without account or device identifiers.
function observedBucket(calorieEnd = recordedThrough) {
  return {startTimeMillis: String(dayStart), dataset: [
    {point: [{dataTypeName: 'com.google.step_count.delta',
      endTimeNanos: nanos(recordedThrough), value: [{intVal: 8148}]}]},
    {point: [{dataTypeName: 'com.google.calories.expended',
      startTimeNanos: nanos(dayStart), endTimeNanos: nanos(calorieEnd),
      value: [{fpVal: 764.6654337935904}]}]},
    {point: [{dataTypeName: 'com.google.distance.delta', value: [{fpVal: 6051.503046146872}]}]},
    {point: [{dataTypeName: 'com.google.active_minutes', value: [{intVal: 94}]}]},
  ]};
}

function bmrPoint(rate, time = dayStart - 86400000) {
  return {dataTypeName: 'com.google.calories.bmr',
    endTimeNanos: nanos(time), value: [{fpVal: rate}]};
}

function readHealth(at = now) {
  return fetchHealthData({accessToken: 'test'}, {}, 'America/New_York', at);
}

function bucket(moveMinutes, steps = 0) {
  return {
    startTimeMillis: String(todayUtc),
    dataset: [{
      point: [...(steps ? [{
        dataTypeName: 'com.google.step_count.delta',
        value: [{intVal: steps}],
      }] : []), ...(moveMinutes == null ? [] : [{
        dataTypeName: 'com.google.active_minutes',
        value: [{intVal: moveMinutes}],
      }])],
    }],
  };
}

async function withFitResponses(responses, verify, bmrPoints = []) {
  const original = google.fitness;
  const requests = [];
  const bmrRequests = [];
  google.fitness = () => ({users: {
    dataset: {aggregate: async (request) => {
      requests.push(request);
      const response = responses[requests.length - 1];
      return {data: {bucket: [response && typeof response === 'object' ? response :
        bucket(response, requests.length === 1 ? 8148 : 0)]}};
    }},
    dataSources: {datasets: {get: async (request) => {
      bmrRequests.push(request);
      return {data: {point: bmrPoints}};
    }}},
  }});
  try {
    await verify(requests, bmrRequests);
  } finally {
    google.fitness = original;
  }
}

test('reads Move Minutes as minute counts without dividing by 60,000', async () => {
  await withFitResponses([35], async (requests) => {
    const summary = await fetchHealthData({accessToken: 'test'}, {}, 'UTC');
    assert.equal(summary.activeMinutes, 35);
    assert.equal(requests.length, 1);
  });
});

test('uses the merged stream when the standard aggregate has no Move Minutes', async () => {
  await withFitResponses([null, 42], async (requests) => {
    const summary = await fetchHealthData({accessToken: 'test'}, {}, 'UTC');
    assert.equal(summary.activeMinutes, 42);
    assert.equal(requests[1].requestBody.aggregateBy[0].dataSourceId,
      'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes');
  });
});

test('checks the merged stream when the standard aggregate reports zero', async () => {
  await withFitResponses([0, 42], async (requests) => {
    const summary = await fetchHealthData({accessToken: 'test'}, {}, 'UTC');
    assert.equal(summary.activeMinutes, 42);
    assert.equal(requests.length, 2);
  });
});

test('preserves the 94-minute value from the live response', async () => {
  await withFitResponses([94], async (requests) => {
    const summary = await fetchHealthData({accessToken: 'test'}, {}, 'UTC');
    assert.equal(summary.activeMinutes, 94);
    assert.equal(requests.length, 1);
  });
});

test('distinguishes missing Move Minutes from a real zero', async () => {
  await withFitResponses([null, null], async () => {
    const summary = await fetchHealthData({accessToken: 'test'}, {}, 'UTC');
    assert.equal(summary.activeMinutes, null);
  });
  await withFitResponses([0, null], async () => {
    const summary = await fetchHealthData({accessToken: 'test'}, {}, 'UTC');
    assert.equal(summary.activeMinutes, 0);
  });
});

test('preserves live Move Minutes, steps, and distance without inventing a step', async () => {
  await withFitResponses([observedBucket()], async (requests) => {
    const summary = await readHealth();
    assert.equal(summary.activeMinutes, 94);
    assert.equal(summary.steps, 8148);
    assert.equal(summary.distance, 6.05);
    assert.equal(summary.stepsRecordedThrough, '2026-09-30T13:59:44.255Z');
    assert.equal(summary.weekly[6].date, '2026-09-30');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].requestBody.startTimeMillis,
      String(Date.parse('2026-09-24T04:00:00Z')));
  });
});

test('fills only missing resting calories and reproduces the 956 kcal screenshot', async () => {
  await withFitResponses([observedBucket()], async (_, bmrRequests) => {
    const summary = await readHealth();
    assert.equal(summary.calories, 956);
    assert.equal(summary.estimatedRestingCalories, 191);
    assert.equal(summary.caloriesRecordedThrough, '2026-09-30T13:59:44.255Z');
    assert.equal(summary.weekly[6].calories, 956);
    assert.equal(summary.fetchedAt, now.toISOString());
    assert.equal(bmrRequests.length, 1);
  }, [bmrPoint(1836.0000361204147)]);
});

test('does not add resting calories to an interval already covered by Fit', async () => {
  await withFitResponses([observedBucket(now.getTime())], async (_, bmrRequests) => {
    const summary = await readHealth();
    assert.equal(summary.calories, 765);
    assert.equal(summary.estimatedRestingCalories, 0);
    assert.equal(bmrRequests.length, 0);
  }, [bmrPoint(1836)]);
});

test('uses the effective BMR for each part of the missing interval', async () => {
  const from = Date.parse('2026-09-30T14:00:00Z');
  const change = Date.parse('2026-09-30T15:00:00Z');
  const end = new Date('2026-09-30T16:00:00Z');
  await withFitResponses([observedBucket(from)], async () => {
    const summary = await readHealth(end);
    assert.equal(summary.calories, 945); // 764.665 + 60 + 120; round once.
    assert.equal(summary.estimatedRestingCalories, 180);
  }, [bmrPoint(2880, change), bmrPoint(1440)]);
});

test('keeps recorded calories when a valid prior resting rate is unavailable', async () => {
  await withFitResponses([observedBucket()], async () => {
    const summary = await readHealth();
    assert.equal(summary.calories, 765);
    assert.equal(summary.estimatedRestingCalories, 0);
  }, [bmrPoint(1836, now.getTime())]);
});

test('does not estimate over calorie records with missing timestamps', async () => {
  const response = observedBucket();
  delete response.dataset[1].point[0].endTimeNanos;
  await withFitResponses([response], async (_, bmrRequests) => {
    const summary = await readHealth();
    assert.equal(summary.calories, 765);
    assert.equal(summary.estimatedRestingCalories, 0);
    assert.equal(bmrRequests.length, 0);
  }, [bmrPoint(1836)]);
});
