import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import { useSos } from '../contexts/SosContext';

const CONFIRMATION_DELAY = 2000; 

const SosButton = ({
  size = 'big',
  style,
  onPress,
  disabled = false,
  routeId,
  contacts = [],
}) => {
  const { sendSOS } = useSos();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmProgress, setConfirmProgress] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const confirmTimeoutRef = useRef(null);

  const isBig = size === 'big';

  
  const handleSosPress = () => {
    if (disabled) return;

    
    setShowConfirm(true);
    setIsConfirming(true);
    setConfirmProgress(0);

    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: CONFIRMATION_DELAY,
      useNativeDriver: false,
    }).start();

    
    let startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / CONFIRMATION_DELAY, 1);
      setConfirmProgress(progress);

      if (progress < 1) {
        setTimeout(updateProgress, 50);
      } else {
        
        handleConfirmSOS();
      }
    };
    updateProgress();

    
    confirmTimeoutRef.current = setTimeout(() => {
      handleConfirmSOS();
    }, CONFIRMATION_DELAY);

    
    Vibration.vibrate(100);
  };

  
  const handleConfirmSOS = async () => {
    if (!isConfirming) return;

    setIsConfirming(false);
    setShowConfirm(false);
    clearTimeout(confirmTimeoutRef.current);
    progressAnim.setValue(0);

    try {
      
      const result = await sendSOS({
        routeId,
        contacts,
        batteryLevel: await getBatteryLevel(),
      });

      
      if (result.success) {
        Alert.alert(
          'SOS Sent',
          'Emergency alert has been sent to dispatch and your contacts.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'SOS Queued',
          result.message || 'Alert queued for sending when online.',
          [{ text: 'OK' }]
        );
      }

      
      if (onPress) {
        onPress(result);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send emergency alert. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  
  const handleCancelConfirm = () => {
    setIsConfirming(false);
    setShowConfirm(false);
    clearTimeout(confirmTimeoutRef.current);
    progressAnim.setValue(0);
  };

  
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const buttonSize = isBig ? 80 : 50;
  const fontSize = isBig ? 16 : 12;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
          },
          disabled && styles.disabled,
          style,
        ]}
        onPress={handleSosPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { fontSize }]}>SOS</Text>
      </TouchableOpacity>

      {}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelConfirm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Confirm Emergency SOS</Text>
            <Text style={styles.confirmMessage}>
              This will send an emergency alert with your current location to dispatch and emergency contacts.
            </Text>

            {}
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              Sending in {Math.ceil((1 - confirmProgress) * 2)} seconds...
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={handleCancelConfirm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.sendButton]}
                onPress={handleConfirmSOS}
              >
                <Text style={styles.sendButtonText}>Send Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};


const getBatteryLevel = async () => {
  
  return null;
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#dc2626', 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#dc2626',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SosButton;