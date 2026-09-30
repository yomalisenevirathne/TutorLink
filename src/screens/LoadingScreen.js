import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Easing, TouchableOpacity } from 'react-native';

export default function LoadingScreen({ onFinishLoading, navigation }) {
  const [progress, setProgress] = useState(67);
  const animatedProgress = new Animated.Value(0.67);

  useEffect(() => {
    // Simulate initial loading sequence up to 100%
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          if (onFinishLoading) onFinishLoading();
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Brand Header */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeIcon}>🎓</Text>
        </View>
        <View style={styles.logoTitleRow}>
          <Text style={styles.logoTextBlue}>Tutor</Text>
          <Text style={styles.logoTextOrange}>Link</Text>
        </View>
      </View>

      {/* Circular Loading Ring */}
      <View style={styles.loaderContainer}>
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <Text style={styles.progressText}>{progress}%</Text>
            <Text style={styles.loadingLabel}>LOADING</Text>
          </View>
        </View>
      </View>

      {/* Manual Continue Button */}
      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={() => onFinishLoading && onFinishLoading()}
      >
        <Text style={styles.skipButtonText}>Continue to App →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoBadgeIcon: {
    fontSize: 32,
  },
  logoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextBlue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0056C6',
  },
  logoTextOrange: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF7A00',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  outerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: '#0056C6',
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  innerCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  loadingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  skipButton: {
    marginTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  skipButtonText: {
    color: '#0056C6',
    fontWeight: '600',
    fontSize: 14,
  }
});
