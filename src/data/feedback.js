export function feedbackSummary(ratings = []) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let total = 0;
  for (const { rating } of ratings) {
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
      distribution[rating]++;
      sum += rating;
      total++;
    }
  }
  return { total, average: total ? sum / total : 0, distribution };
}
