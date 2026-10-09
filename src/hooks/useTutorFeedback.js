import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteTutorComment, editTutorComment, feedbackErrorMessage, loadTutorFeedback, reactToTutorComment, saveTutorRating, sendTutorComment } from '../services/feedback';
import { feedbackSummary } from '../data/feedback';

export default function useTutorFeedback(tutorId, user) {
  const [data, setData] = useState({ ratings: [], comments: [], viewerId: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  const saving = useRef(false);
  const request = useRef(null);

  const refresh = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    return loadTutorFeedback(tutorId, user, controller.signal).then((records) => {
      if (!controller.signal.aborted && alive.current) { setData(records); setLoadError(''); }
      return true;
    }).catch((error) => {
      if (!controller.signal.aborted && alive.current) {
        setLoadError(feedbackErrorMessage(error));
        console.warn('[Tutor Feedback]', error.code || error.name, error.message);
      }
      return false;
    }).finally(() => {
      if (!controller.signal.aborted && alive.current) setLoading(false);
    });
  }, [tutorId, user]);

  useEffect(() => {
    alive.current = true;
    refresh();
    return () => { alive.current = false; request.current?.abort(); };
  }, [refresh]);

  const mutate = async (action) => {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setSaveError('');
    try {
      await action();
      if (alive.current) await refresh();
      // The write succeeded even if the following refresh failed.
      return true;
    } catch (error) {
      if (alive.current) setSaveError(feedbackErrorMessage(error));
      console.warn('[Tutor Feedback Save]', error.code || error.name, error.message);
      return false;
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const summary = useMemo(() => feedbackSummary(data.ratings), [data.ratings]);
  return { ...data, summary, ownRating: data.ratings.find((rating) => rating.user_id === data.viewerId)?.rating || 0,
    loading, loadError, saveError, busy, refresh,
    rate: (value) => mutate(() => saveTutorRating(tutorId, user, value)),
    comment: (text, parentId) => mutate(() => sendTutorComment(tutorId, user, text, parentId)),
    editComment: (commentId, text) => mutate(() => editTutorComment(tutorId, user, commentId, text)),
    deleteComment: (commentId) => mutate(() => deleteTutorComment(tutorId, user, commentId)),
    react: (commentId, kind) => mutate(() => reactToTutorComment(tutorId, user, commentId, kind,
      data.comments.find((comment) => comment.id === commentId)?.reactions[data.viewerId])),
  };
}
