// Supply the existing discovery filters with the same ratings shown on cards.
// Only these two fields change; tutor records and database rows stay intact.
export function withFeedbackRatings(tutors, summaries) {
  return tutors.map(tutor => {
    const summary = summaries.get(tutor.id);
    if (!summary) throw new Error('Tutor feedback has not finished loading.');
    return { ...tutor, avgRating: summary.average, reviewCount: summary.total };
  });
}
