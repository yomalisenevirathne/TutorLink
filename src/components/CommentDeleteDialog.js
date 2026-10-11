import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export default function CommentDeleteDialog({ hasReplies, busy, error, onCancel, onConfirm }) {
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} disabled={busy}
        accessibilityRole="button" accessibilityLabel="Cancel comment deletion" />
      <View style={styles.dialog} accessibilityViewIsModal>
        <View style={styles.icon}><Feather name="trash-2" size={24} color="#C24152" /></View>
        <Text style={styles.title} accessibilityRole="header">Delete comment?</Text>
        <Text style={styles.message}>{hasReplies ? 'This comment and all its replies will be removed. This cannot be undone.'
          : 'Your comment will be removed. This cannot be undone.'}</Text>
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancel} onPress={onCancel} disabled={busy} accessibilityRole="button">
            <Text style={styles.cancelText}>Keep comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delete} onPress={onConfirm} disabled={busy}
            accessibilityRole="button" accessibilityLabel="Confirm delete comment" accessibilityState={{ disabled: busy }}>
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.deleteText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24, 16, 40, 0.48)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 24, boxShadow: '0px 12px 40px rgba(24, 16, 40, 0.16)' },
  icon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF0F2', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '700', color: '#261B38' },
  message: { fontSize: 14, color: '#817889', lineHeight: 22, marginTop: 10 },
  error: { color: '#B42318', fontSize: 12, lineHeight: 18, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancel: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#F5F1FA', alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 13, fontWeight: '600', color: '#62566F' },
  delete: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#C24152', alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
});
